import os
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import TestPlagiat, TestPlagiatTheme
from .serializers import TestPlagiatSerializer, TestPlagiatThemeSerializer
from .utils import extraire_texte_pdf, calculer_taux_plagiat
from documents.models import Document
from themes.models import Theme
from bibliotheque.models import Ressource
from parametres.models import Parametre
from notifications.models import Notification


def get_textes_reference(exclude_document_id=None):
    textes, titres = [], []
    docs = Document.objects.filter(statut='valide')
    if exclude_document_id:
        docs = docs.exclude(id=exclude_document_id)
    for doc in docs:
        texte = extraire_texte_pdf(doc.fichier)
        if texte.strip():
            textes.append(texte)
            titres.append(doc.titre)
    ressources = Ressource.objects.filter(actif=True, fichier__isnull=False)
    for r in ressources:
        texte = extraire_texte_pdf(r.fichier)
        if texte.strip():
            textes.append(texte)
            titres.append(r.titre)
    return textes, titres


def ajouter_auto_bibliotheque(document):
    try:
        p = Parametre.objects.get(cle='ajout_auto_bibliotheque')
        if p.valeur != 'true':
            return
    except Parametre.DoesNotExist:
        return
    if Ressource.objects.filter(titre=document.titre, type='memoire').exists():
        return
    from django.core.files.base import ContentFile
    src_path = document.fichier.path
    nom_fichier = os.path.basename(src_path)
    ressource = Ressource(
        titre=document.titre,
        type='memoire',
        auteur=(document.etudiant.nom or '').strip() or document.etudiant.email,
        actif=True,
    )
    with open(src_path, 'rb') as f:
        ressource.fichier.save(nom_fichier, ContentFile(f.read()), save=False)
    ressource.save()


class TestPlagiatListCreateView(generics.ListCreateAPIView):
    serializer_class = TestPlagiatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'etudiant':
            return TestPlagiat.objects.filter(document__etudiant=user)
        return TestPlagiat.objects.all()


class TestPlagiatDetailView(generics.RetrieveAPIView):
    serializer_class = TestPlagiatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'etudiant':
            return TestPlagiat.objects.filter(document__etudiant=user)
        return TestPlagiat.objects.all()


class LancerTestPlagiatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, document_id):
        user = request.user
        try:
            if user.role == 'etudiant':
                document = Document.objects.get(id=document_id, etudiant=user)
            else:
                document = Document.objects.get(id=document_id)
        except Document.DoesNotExist:
            return Response({'error': 'Document introuvable'}, status=status.HTTP_404_NOT_FOUND)

        textes_existants, titres_existants = get_textes_reference(exclude_document_id=document_id)
        texte_nouveau = extraire_texte_pdf(document.fichier)
        resultat = calculer_taux_plagiat(texte_nouveau, textes_existants, titres_existants)
        taux = resultat['taux']

        document.taux_plagiat = taux
        document.save()

        test = TestPlagiat.objects.create(
            document=document,
            taux_plagiat=taux,
            source_titre=resultat['source_titre'],
            phrases_suspectes=resultat['phrases_suspectes'],
        )

        # Notifier l'étudiant du résultat
        Notification.objects.create(
            utilisateur=document.etudiant,
            message=f"Résultat du test plagiat pour votre mémoire '{document.titre}' — Taux : {taux}%"
        )
        # Si c'est un chef/DA qui lance le test, notifier aussi le lanceur
        if document.etudiant != request.user:
            Notification.objects.create(
                utilisateur=request.user,
                message=f"Test plagiat terminé pour '{document.titre}' — Taux : {taux}%"
            )

        return Response(TestPlagiatSerializer(test).data, status=status.HTTP_201_CREATED)


class TestPlagiatThemeListView(generics.ListAPIView):
    serializer_class = TestPlagiatThemeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'etudiant':
            return TestPlagiatTheme.objects.filter(theme__etudiant=user)
        return TestPlagiatTheme.objects.all()


class LancerTestPlagiatThemeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, theme_id):
        user = request.user
        try:
            if user.role == 'etudiant':
                theme = Theme.objects.get(id=theme_id, etudiant=user)
            else:
                theme = Theme.objects.get(id=theme_id)
        except Theme.DoesNotExist:
            return Response({'error': 'Thème introuvable'}, status=status.HTTP_404_NOT_FOUND)

        autres_themes = Theme.objects.filter(statut='valide').exclude(id=theme_id)
        textes_existants = [t.titre + ' ' + t.description for t in autres_themes if t.titre or t.description]
        titres_existants = [t.titre for t in autres_themes if t.titre or t.description]

        ressources_themes = Ressource.objects.filter(actif=True, type='theme')
        for r in ressources_themes:
            blocs = [b for b in [r.titre, r.description] if b]
            if r.fichier:
                texte_pdf = extraire_texte_pdf(r.fichier)
                if texte_pdf:
                    blocs.append(texte_pdf)
            texte_ref = " ".join(blocs).strip()
            if texte_ref:
                textes_existants.append(texte_ref)
                titres_existants.append(r.titre)

        texte_nouveau = theme.titre + ' ' + theme.description
        resultat = calculer_taux_plagiat(texte_nouveau, textes_existants, titres_existants)
        taux = resultat['taux']

        theme.taux_plagiat = taux
        theme.save()

        test = TestPlagiatTheme.objects.create(
            theme=theme,
            taux_plagiat=taux,
            source_titre=resultat['source_titre'],
            phrases_suspectes=resultat['phrases_suspectes'],
        )

        # Notifier l'étudiant du résultat
        Notification.objects.create(
            utilisateur=theme.etudiant,
            message=f"Résultat du test plagiat pour votre thème '{theme.titre}' — Taux : {taux}%"
        )
        # Si c'est un chef qui lance le test, notifier aussi le lanceur
        if theme.etudiant != request.user:
            Notification.objects.create(
                utilisateur=request.user,
                message=f"Test plagiat terminé pour le thème '{theme.titre}' — Taux : {taux}%"
            )

        return Response(TestPlagiatThemeSerializer(test).data, status=status.HTTP_201_CREATED)
