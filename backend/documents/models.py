from django.db import models
from django.conf import settings
from themes.models import Theme


class Document(models.Model):

    STATUS_CHOICES = (
        ('soumis', 'Soumis'),
        ('en_attente', 'En attente'),
        ('valide', 'Validé'),
        ('rejete', 'Rejeté'),
    )

    titre = models.CharField(max_length=255)

    fichier = models.FileField(upload_to='documents/')

    theme = models.ForeignKey(
        Theme,
        on_delete=models.CASCADE,
        related_name='documents'
    )

    etudiant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    taux_plagiat = models.FloatField(default=0)

    statut = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='soumis'
    )

    commentaire_validation = models.TextField(null=True, blank=True)

    date_soumission = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titre