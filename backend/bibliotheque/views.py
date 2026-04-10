from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
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
        instance.delete()


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
