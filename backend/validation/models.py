from django.db import models
from documents.models import Document
from django.conf import settings


class Validation(models.Model):

    STATUS_CHOICES = (
        ('valide', 'Validé'),
        ('rejete', 'Rejeté'),
    )

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE
    )

    validateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    statut = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES
    )

    commentaire = models.TextField(
        null=True,
        blank=True
    )

    date_validation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Validation - {self.document.titre}"