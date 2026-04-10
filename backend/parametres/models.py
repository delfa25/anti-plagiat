from django.db import models


class Parametre(models.Model):
    cle = models.CharField(max_length=100, unique=True)
    valeur = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.cle} = {self.valeur}"
