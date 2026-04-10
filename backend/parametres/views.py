from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Parametre
from .serializers import ParametreSerializer


class IsSuperAdminOrDA(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in ('superadmin', 'directeur') or request.user.is_superuser


class ParametreListView(generics.ListAPIView):
    queryset = Parametre.objects.all()
    serializer_class = ParametreSerializer
    permission_classes = [permissions.IsAuthenticated]


class ParametreDetailView(generics.RetrieveUpdateAPIView):
    queryset = Parametre.objects.all()
    serializer_class = ParametreSerializer
    permission_classes = [IsSuperAdminOrDA]
    lookup_field = 'cle'


class ParametreValueView(APIView):
    """Retourne la valeur d'un paramètre par sa clé."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, cle):
        try:
            p = Parametre.objects.get(cle=cle)
            return Response({'cle': p.cle, 'valeur': p.valeur})
        except Parametre.DoesNotExist:
            return Response({'error': 'Paramètre introuvable'}, status=404)
