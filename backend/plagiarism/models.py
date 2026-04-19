from django.db import models
from documents.models import Document
from themes.models import Theme


class TestPlagiat(models.Model):

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='tests_plagiat'
    )
    taux_plagiat = models.FloatField()
    rapport = models.FileField(upload_to='rapports_plagiat/', null=True, blank=True)
    date_test = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Test - {self.document.titre}"


class TestPlagiatTheme(models.Model):

    theme = models.ForeignKey(
        Theme,
        on_delete=models.CASCADE,
        related_name='tests_plagiat'
    )
    taux_plagiat = models.FloatField()
    date_test = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Test thème - {self.theme.titre}"