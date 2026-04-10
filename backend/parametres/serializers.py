from rest_framework import serializers
from .models import Parametre


class ParametreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parametre
        fields = ['id', 'cle', 'valeur', 'description']
