from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.shortcuts import get_object_or_404
from .models import Theme
from .serializers import ThemeSerializer
from notifications.models import Notification
from bibliotheque.models import Ressource
from parametres.models import Parametre

def ajouter_auto_bibliotheque_theme(theme):
    """Ajoute automatiquement un thème validé à la bibliothèque si le paramètre est activé."""
    try:
        p = Parametre.objects.get(cle='ajout_auto_bibliotheque')
        if p.valeur != 'true':
            return
    except Parametre.DoesNotExist:
        return

    if Ressource.objects.filter(titre=theme.titre, type='theme').exists():
        return

    Ressource.objects.create(
        titre=theme.titre,
        type='theme',
        auteur=f"{theme.etudiant.prenom or ''} {theme.etudiant.nom or ''}".strip() or theme.etudiant.email,
        description=theme.description,
        actif=True,
    )


class ThemeListCreateView(generics.ListCreateAPIView):
    serializer_class = ThemeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'etudiant':
            return Theme.objects.filter(etudiant=user)
        if user.role in ['chef', 'directeur', 'superadmin']:
            return Theme.objects.filter(statut='soumis')
        return Theme.objects.exclude(statut='brouillon')

    def perform_create(self, serializer):
        if Theme.objects.filter(etudiant=self.request.user).exists():
            raise ValidationError(
                "Vous avez deja un theme. Modifiez votre soumission existante puis resoumettez-la."
            )
        serializer.save(etudiant=self.request.user, statut='brouillon')


class ThemeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ThemeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'etudiant':
            return Theme.objects.filter(etudiant=user)
        if user.role in ['chef', 'directeur', 'superadmin']:
            return Theme.objects.exclude(statut='brouillon')
        return Theme.objects.exclude(statut='brouillon')

    def perform_update(self, serializer):
        theme = self.get_object()
        user = self.request.user

        if user.role == 'etudiant':
            if theme.statut not in ('brouillon', 'rejete'):
                raise PermissionDenied("Vous ne pouvez plus modifier ce thème.")

        theme = serializer.save()

        if 'statut' in self.request.data and user.role != 'etudiant':
            statut = self.request.data['statut']
            commentaire = self.request.data.get('commentaire_validation', '')
            message = f"Votre thème '{theme.titre}' a été {statut} par {user.email}."
            if commentaire:
                message += f" Commentaire : {commentaire}"
            Notification.objects.create(utilisateur=theme.etudiant, message=message)
            if statut == 'valide':
                ajouter_auto_bibliotheque_theme(theme)

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == 'etudiant' and instance.statut not in ('brouillon',):
            raise PermissionDenied("Vous ne pouvez supprimer que les brouillons.")
        instance.delete()


class SoumettreThemeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        theme = get_object_or_404(Theme, pk=pk, etudiant=request.user)
        if theme.statut in ('brouillon', 'rejete'):
            theme.statut = 'soumis'
            theme.save()
            # Notifier l'étudiant
            Notification.objects.create(
                utilisateur=request.user,
                message=f"Votre thème '{theme.titre}' a été soumis avec succès."
            )
            # Notifier les chefs de département
            from django.contrib.auth import get_user_model
            User = get_user_model()
            chefs = User.objects.filter(role='chef')
            for chef in chefs:
                Notification.objects.create(
                    utilisateur=chef,
                    message=f"Nouveau thème soumis par {request.user.nom or request.user.email} : '{theme.titre}' — En attente de validation."
                )
            return Response({'statut': 'soumis'})
        return Response({'error': 'Impossible de soumettre ce thème.'}, status=status.HTTP_400_BAD_REQUEST)
