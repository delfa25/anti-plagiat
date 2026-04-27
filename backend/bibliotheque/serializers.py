from rest_framework import serializers
from .models import Ressource


class RessourceSerializer(serializers.ModelSerializer):
    ajoute_par = serializers.StringRelatedField(read_only=True)
    ressource_liee_titre = serializers.SerializerMethodField()

    class Meta:
        model = Ressource
        fields = ['id', 'titre', 'fichier', 'type', 'auteur', 'annee', 'description',
                  'ajoute_par', 'date_ajout', 'actif', 'ressource_liee', 'ressource_liee_titre']
        read_only_fields = ['date_ajout', 'ajoute_par', 'ressource_liee']

    def get_ressource_liee_titre(self, obj):
        if obj.ressource_liee:
            return obj.ressource_liee.titre
        try:
            return obj.lie_a.titre
        except Exception:
            return None
