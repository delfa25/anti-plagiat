from rest_framework import serializers
from .models import Theme


class ThemeSerializer(serializers.ModelSerializer):
    etudiant = serializers.StringRelatedField(read_only=True)
    a_document = serializers.SerializerMethodField()

    class Meta:
        model = Theme
        fields = ['id', 'titre', 'description', 'etudiant', 'taux_plagiat', 'statut', 'valide_par_chef', 'valide_par_directeur', 'commentaire_validation', 'date_soumission', 'a_document']
        read_only_fields = ['taux_plagiat', 'date_soumission']

    def get_a_document(self, obj):
        return hasattr(obj, 'document')
