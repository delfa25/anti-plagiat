from rest_framework import serializers
from .models import Validation


class ValidationSerializer(serializers.ModelSerializer):
    validateur = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Validation
        fields = ['id', 'document', 'validateur', 'statut', 'commentaire', 'date_validation']
        read_only_fields = ['date_validation']
