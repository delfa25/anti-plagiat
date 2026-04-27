from rest_framework import serializers
from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    etudiant = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Document
        fields = ['id', 'titre', 'fichier', 'theme', 'etudiant', 'taux_plagiat', 'statut', 'commentaire_validation', 'date_soumission']
        read_only_fields = ['theme', 'taux_plagiat', 'date_soumission']
