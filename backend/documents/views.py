from rest_framework import generics, permissions
from .models import Document
from .serializers import DocumentSerializer
from notifications.models import Notification


class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'etudiant':
            return Document.objects.filter(etudiant=user)
        return Document.objects.all()

    def perform_create(self, serializer):
        serializer.save(etudiant=self.request.user)


class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'etudiant':
            return Document.objects.filter(etudiant=user)
        return Document.objects.all()

    def perform_update(self, serializer):
        document = serializer.save()
        if 'statut' in self.request.data:
            statut = self.request.data['statut']
            commentaire = self.request.data.get('commentaire_validation', '')
            validateur = self.request.user.email
            message = f"Votre m\u00e9moire '{document.titre}' a \u00e9t\u00e9 {statut} par {validateur}."
            if commentaire:
                message += f" Commentaire : {commentaire}"
            Notification.objects.create(utilisateur=document.etudiant, message=message)
