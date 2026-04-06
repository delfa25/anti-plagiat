from rest_framework import generics, permissions
from .models import Validation
from .serializers import ValidationSerializer
from notifications.models import Notification


class ValidationListCreateView(generics.ListCreateAPIView):
    serializer_class = ValidationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Validation.objects.filter(validateur=self.request.user)

    def perform_create(self, serializer):
        validation = serializer.save(validateur=self.request.user)

        document = validation.document
        document.statut = validation.statut
        document.save()

        Notification.objects.create(
            utilisateur=document.etudiant,
            message=f"Votre document '{document.titre}' a été {validation.statut} par {self.request.user.username}"
        )


class ValidationDetailView(generics.RetrieveAPIView):
    serializer_class = ValidationSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Validation.objects.all()
