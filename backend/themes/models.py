from django.db import models
from django.conf import settings


class Theme(models.Model):

    STATUS_CHOICES = (
        ('brouillon', 'Brouillon'),
        ('soumis', 'Soumis'),
        ('valide', 'Validé'),
        ('rejete', 'Rejeté'),
    )

    titre = models.CharField(max_length=255)
    description = models.TextField()

    etudiant = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='themes'
    )

    valide_par_chef = models.BooleanField(default=False)
    valide_par_directeur = models.BooleanField(default=False)
    commentaire_validation = models.TextField(null=True, blank=True)

    taux_plagiat = models.FloatField(default=0)

    statut = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='brouillon'
    )

    date_soumission = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.titre