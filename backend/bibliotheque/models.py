from django.db import models
from django.conf import settings


class Ressource(models.Model):

    TYPE_CHOICES = (
        ('theme', 'Thème'),
        ('memoire', 'Mémoire'),
    )

    titre = models.CharField(max_length=255)
    fichier = models.FileField(upload_to='bibliotheque/', null=True, blank=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    auteur = models.CharField(max_length=255, blank=True, null=True)
    annee = models.IntegerField(null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    ajoute_par = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ressources_ajoutees'
    )
    date_ajout = models.DateTimeField(auto_now_add=True)
    actif = models.BooleanField(default=True)
    ressource_liee = models.OneToOneField(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='lie_a'
    )

    def __str__(self):
        return self.titre
