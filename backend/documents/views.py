from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from .models import Document
from .serializers import DocumentSerializer
from notifications.models import Notification
from plagiarism.views import ajouter_auto_bibliotheque


class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'etudiant':
            return Document.objects.filter(etudiant=user)
        elif user.role == 'chef':
            return Document.objects.exclude(statut='brouillon')
        elif user.role == 'directeur':
            return Document.objects.filter(statut__in=['valide_chef', 'valide', 'rejete'])
        return Document.objects.all()

    def perform_create(self, serializer):
        if Document.objects.filter(etudiant=self.request.user).exists():
            raise ValidationError(
                "Vous avez deja un memoire. Modifiez votre soumission existante puis resoumettez-la."
            )
        serializer.save(etudiant=self.request.user, statut='brouillon')


class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'etudiant':
            return Document.objects.filter(etudiant=user)
        elif user.role == 'chef':
            return Document.objects.exclude(statut='brouillon')
        elif user.role == 'directeur':
            return Document.objects.filter(statut__in=['valide_chef', 'valide', 'rejete'])
        return Document.objects.all()

    def perform_update(self, serializer):
        document = self.get_object()
        user = self.request.user

        # Etudiant peut modifier brouillon et rejets pour resoumettre
        if user.role == 'etudiant' and document.statut not in ('brouillon', 'rejete', 'rejete_chef'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez plus modifier ce document.")

        document = serializer.save()
        if 'statut' in self.request.data and user.role != 'etudiant':
            statut = self.request.data['statut']
            commentaire = self.request.data.get('commentaire_validation', '')
            message = f"Votre mémoire '{document.titre}' : {statut} par {user.email}."
            if commentaire:
                message += f" Commentaire : {commentaire}"
            Notification.objects.create(utilisateur=document.etudiant, message=message)
            # Ajout auto à la bibliothèque si validé définitivement
            if statut == 'valide':
                ajouter_auto_bibliotheque(document)

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == 'etudiant' and instance.statut != 'brouillon':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Vous ne pouvez supprimer que les brouillons.")
        instance.delete()

class SoumettreDocumentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        document = get_object_or_404(Document, pk=pk, etudiant=request.user)
        if document.statut in ('brouillon', 'rejete', 'rejete_chef'):
            document.statut = 'soumis'
            document.save()
            Notification.objects.create(
                utilisateur=document.etudiant,
                message=f"Votre mémoire '{document.titre}' a été soumis avec succès."
            )
            return Response({'statut': 'soumis'})
        return Response({'error': 'Impossible de soumettre ce document.'}, status=status.HTTP_400_BAD_REQUEST)
