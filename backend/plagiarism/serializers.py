from rest_framework import serializers
from .models import TestPlagiat, TestPlagiatTheme


class TestPlagiatSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestPlagiat
        fields = ['id', 'document', 'taux_plagiat', 'rapport', 'date_test']
        read_only_fields = ['date_test']


class TestPlagiatThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestPlagiatTheme
        fields = ['id', 'theme', 'taux_plagiat', 'date_test']
        read_only_fields = ['date_test']
