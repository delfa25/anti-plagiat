import os
import re
import unicodedata
import PyPDF2
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser
from django.db import transaction
from .models import Ressource
from .serializers import RessourceSerializer
from parametres.models import Parametre


class CanManageBibliotheque(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in ('superadmin', 'directeur') or request.user.is_superuser


def ajout_manuel_autorise():
    try:
        p = Parametre.objects.get(cle='ajout_manuel_bibliotheque')
        return p.valeur == 'true'
    except Parametre.DoesNotExist:
        return True


class RessourceListCreateView(generics.ListCreateAPIView):
    serializer_class = RessourceSerializer
    permission_classes = [CanManageBibliotheque]

    def get_queryset(self):
        queryset = Ressource.objects.all().order_by('-date_ajout')
        type_filter = self.request.query_params.get('type')
        actif_filter = self.request.query_params.get('actif')
        if type_filter:
            queryset = queryset.filter(type=type_filter)
        if actif_filter is not None:
            queryset = queryset.filter(actif=actif_filter == 'true')
        return queryset

    def perform_create(self, serializer):
        if not ajout_manuel_autorise():
            raise PermissionDenied("L'ajout manuel a la bibliotheque est desactive.")
        serializer.save(ajoute_par=self.request.user)


class RessourceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RessourceSerializer
    permission_classes = [CanManageBibliotheque]
    queryset = Ressource.objects.all()

    def perform_update(self, serializer):
        if not ajout_manuel_autorise():
            raise PermissionDenied("La modification manuelle de la bibliotheque est desactivee.")
        serializer.save()

    def perform_destroy(self, instance):
        if not ajout_manuel_autorise():
            raise PermissionDenied("La suppression manuelle de la bibliotheque est desactivee.")
        # Supprimer la ressource liée en même temps
        liee = instance.ressource_liee
        if not liee:
            try:
                liee = instance.lie_a
            except Exception:
                liee = None
        instance.delete()
        if liee:
            liee.delete()


class AjouterPaireView(APIView):
    """Crée une paire thème + mémoire liés en une seule opération."""
    permission_classes = [CanManageBibliotheque]
    parser_classes = [MultiPartParser]

    def post(self, request):
        if not ajout_manuel_autorise():
            return Response({'error': "L'ajout manuel est désactivé."}, status=status.HTTP_403_FORBIDDEN)

        fichier_memoire = request.FILES.get('fichier_memoire')
        if not fichier_memoire:
            return Response({'error': 'Le fichier PDF du mémoire est obligatoire.'}, status=status.HTTP_400_BAD_REQUEST)

        titre_theme = request.data.get('titre_theme', '').strip()
        titre_memoire = request.data.get('titre_memoire', '').strip()
        if not titre_theme or not titre_memoire:
            return Response({'error': 'Les titres du thème et du mémoire sont obligatoires.'}, status=status.HTTP_400_BAD_REQUEST)

        auteur = request.data.get('auteur', '').strip() or None
        annee = request.data.get('annee') or None
        description = request.data.get('description', '').strip() or None

        with transaction.atomic():
            theme = Ressource.objects.create(
                titre=titre_theme,
                type='theme',
                auteur=auteur,
                annee=annee,
                description=description,
                ajoute_par=request.user,
                actif=True,
            )
            memoire = Ressource.objects.create(
                titre=titre_memoire,
                fichier=fichier_memoire,
                type='memoire',
                auteur=auteur,
                annee=annee,
                description=description,
                ajoute_par=request.user,
                actif=True,
                ressource_liee=theme,
            )
            theme.ressource_liee = memoire
            theme.save(update_fields=['ressource_liee'])

        return Response({
            'theme': RessourceSerializer(theme).data,
            'memoire': RessourceSerializer(memoire).data,
        }, status=status.HTTP_201_CREATED)


class ToggleRessourceView(APIView):
    permission_classes = [CanManageBibliotheque]

    def patch(self, request, pk):
        if not ajout_manuel_autorise():
            return Response(
                {'error': "L'activation/desactivation manuelle de la bibliotheque est desactivee."},
                status=status.HTTP_403_FORBIDDEN
            )
        try:
            ressource = Ressource.objects.get(pk=pk)
            ressource.actif = not ressource.actif
            ressource.save()
            return Response({'actif': ressource.actif})
        except Ressource.DoesNotExist:
            return Response({'error': 'Ressource introuvable'}, status=status.HTTP_404_NOT_FOUND)


def _normaliser(texte):
    """Supprime les accents pour comparaison insensible aux accents."""
    return unicodedata.normalize('NFKD', texte).encode('ascii', 'ignore').decode('ascii').lower()


class ExtraireInfosPdfView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        fichier = request.FILES.get('fichier')
        if not fichier:
            return Response({'error': 'Fichier manquant'}, status=status.HTTP_400_BAD_REQUEST)

        texte_brut = ''
        chemin = None
        tmp_a_supprimer = False
        try:
            from plagiarism.utils import _get_chemin_pdf
            chemin, tmp_a_supprimer = _get_chemin_pdf(fichier)
            reader = PyPDF2.PdfReader(chemin)
            texte_brut = "\n".join(p.extract_text() or '' for p in reader.pages[:3])
        except Exception as e:
            print(f"Erreur extraction infos PDF : {e}")
        finally:
            if tmp_a_supprimer and chemin:
                try:
                    os.remove(chemin)
                except Exception:
                    pass

        if not texte_brut.strip():
            return Response({'titre': '', 'auteur': '', 'annee': ''})

        # --- Année ---
        annee = ''
        m = re.search(r'\b(20\d{2})\b', texte_brut)
        if m:
            annee = m.group(1)

        # --- Thème ---
        MOTS_RUPTURE = [
            'present', 'realise', 'auteur', 'encadreur', 'directeur',
            'jury', 'annee', 'soutenance', 'universite', 'institut',
            'ibam', 'licence', 'rapport', 'stage', 'miage', 'ujkz',
            'maitre', '***'
        ]
        MOTS_COUPE_DEBUT = {'rapport', 'stage', 'licence', 'miage', 'maitre', 'present', 'encadreur'}
        MOTS_COUPE = [
            'universite', 'ujkz', 'ibam', 'institut', 'licence',
            'rapport', 'stage', 'miage', 'present', 'option',
            'annee', 'periode', 'maitre', 'encadreur'
        ]

        def nettoyer_ligne(ligne):
            ln = _normaliser(ligne)
            idx_coupe = len(ligne)
            for mot in MOTS_COUPE:
                idx = ln.find(mot)
                seuil = 0 if mot in MOTS_COUPE_DEBUT else 5
                if idx >= seuil:
                    idx_coupe = min(idx_coupe, idx)
            for sep in ['.U', '.I', '  U', '  I', ' UNIVERSITE', ' UJKZ', ' IBAM', ' RAPPORT', ' STAGE']:
                idx = ligne.upper().find(sep)
                if idx > 5:
                    idx_coupe = min(idx_coupe, idx)
            return ligne[:idx_coupe].strip().rstrip('.,-; ')

        lignes = texte_brut.split('\n')

        def collecter(idx_debut, premier):
            premier = nettoyer_ligne(premier)
            parties = [premier] if premier else []
            for j in range(idx_debut + 1, min(idx_debut + 8, len(lignes))):
                ls = lignes[j].strip()
                if not ls:
                    break
                if re.match(r'^[\(\)\*\-\s\d]{0,8}$', ls):
                    break
                # Verifier rupture AVANT d'ajouter
                est_rupture = any(m in _normaliser(ls) for m in MOTS_RUPTURE)
                n = nettoyer_ligne(ls)
                if n:
                    parties.append(n)
                if est_rupture:
                    break
            return ' '.join(parties).strip()

        titre = ''
        for i, ligne in enumerate(lignes):
            ls = ligne.strip()
            # Normaliser les espaces parasites dans THEME (ex: "THÈ ME :")
            ls_norm = re.sub(r'T\s*H\s*[EÈ]\s*M\s*E', 'THEME', ls, flags=re.IGNORECASE)

            # "THEME :" seul sur la ligne
            if re.match(r'^(?:THEME|SUJET|INTITUL[EÉ]|TITRE)\s*:?\s*$', ls_norm, re.IGNORECASE):
                for j in range(i + 1, min(i + 5, len(lignes))):
                    c = lignes[j].strip()
                    if c and len(c) > 5:
                        titre = collecter(j, c)
                        break
                if titre:
                    break

            # "THEME : texte" sur la même ligne
            m = re.match(r'^(?:THEME|SUJET|INTITUL[EÉ]|TITRE)\s*:\s*(.+)', ls_norm, re.IGNORECASE)
            if m:
                c = m.group(1).strip()
                if len(c) > 5:
                    titre = collecter(i, c)
                    break

        # Heuristique si aucun pattern trouvé
        if not titre:
            mots_exclus = [
                'universite', 'institut', 'burkina', 'ibam', 'licence',
                'rapport', 'stage', 'miage', 'annee', 'academique',
                'soutenance', 'directeur', 'maitre', 'encadreur', 'jury'
            ]
            candidats = []
            for i, ligne in enumerate(lignes[:40]):
                ligne = ligne.strip()
                if len(ligne) < 15:
                    continue
                if any(mot in _normaliser(ligne) for mot in mots_exclus):
                    continue
                if re.match(r'^[\d\s\W]+$', ligne):
                    continue
                candidats.append(collecter(i, ligne))
            if candidats:
                titre = max(candidats, key=len)

        # --- Auteur ---
        auteur = ''
        patterns_auteur = [
            r'(?:pr[ée]sent[ée]\s+par|r[ée]alis[ée]\s+par|[ée]labor[ée]\s+par)\s*:?\s*([A-Z][a-zA-Z\u00C0-\u017E]+(?:[\s\-][A-Z][a-zA-Z\u00C0-\u017E]+){1,4})',
            r'(?:nom\s+(?:et\s+pr[ée]nom)?\s*:?|[ée]tudiant\s*:?)\s*([A-Z][a-zA-Z\u00C0-\u017E]+(?:[\s\-][A-Z][a-zA-Z\u00C0-\u017E]+){1,4})',
            r'(?:auteur\s*:?)\s*([A-Z][a-zA-Z\u00C0-\u017E]+(?:[\s\-][A-Z][a-zA-Z\u00C0-\u017E]+){1,4})',
            r'(?:par\s*:)\s*([A-Z][a-zA-Z\u00C0-\u017E]+(?:[\s\-][A-Z][a-zA-Z\u00C0-\u017E]+){1,4})',
        ]
        for pattern in patterns_auteur:
            m = re.search(pattern, texte_brut, re.IGNORECASE)
            if m:
                auteur = m.group(1).strip()
                break

        return Response({'titre': titre, 'auteur': auteur, 'annee': annee})
