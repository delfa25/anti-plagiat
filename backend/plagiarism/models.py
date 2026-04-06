from django.db import models
from documents.models import Document
from django.conf import settings


class TestPlagiat(models.Model):

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='tests_plagiat'
    )

    taux_plagiat = models.FloatField()

    rapport = models.FileField(
        upload_to='rapports_plagiat/',
        null=True,
        blank=True
    )

    date_test = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Test - {self.document.titre}"