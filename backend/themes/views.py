from rest_framework import generics, permissions
from .models import Theme
from .serializers import ThemeSerializer
from notifications.models import Notification


class ThemeListCreateView(generics.ListCreateAPIView):
    serializer_class = ThemeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'etudiant':
            return Theme.objects.filter(etudiant=user)
        return Theme.objects.all()

    def perform_create(self, serializer):
        serializer.save(etudiant=self.request.user)


class ThemeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ThemeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'etudiant':
            return Theme.objects.filter(etudiant=user)
        return Theme.objects.all()

    def perform_update(self, serializer):
        theme = serializer.save()
        if 'statut' in self.request.data:
            statut = self.request.data['statut']
            commentaire = self.request.data.get('commentaire_validation', '')
            validateur = self.request.user.email
            message = f"Votre th\u00e8me '{theme.titre}' a \u00e9t\u00e9 {statut} par {validateur}."
            if commentaire:
                message += f" Commentaire : {commentaire}"
            Notification.objects.create(utilisateur=theme.etudiant, message=message)
