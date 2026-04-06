from rest_framework import serializers
from .models import TestPlagiat


class TestPlagiatSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestPlagiat
        fields = ['id', 'document', 'taux_plagiat', 'rapport', 'date_test']
        read_only_fields = ['date_test']
