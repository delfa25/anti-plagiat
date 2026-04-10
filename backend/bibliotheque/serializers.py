from rest_framework import serializers
from .models import Ressource


class RessourceSerializer(serializers.ModelSerializer):
    ajoute_par = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Ressource
        fields = ['id', 'titre', 'fichier', 'type', 'auteur', 'annee', 'description', 'ajoute_par', 'date_ajout', 'actif']
        read_only_fields = ['date_ajout', 'ajoute_par']
