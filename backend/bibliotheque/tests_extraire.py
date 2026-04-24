from django.test import TestCase
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from pathlib import Path
import os

from users.models import User


class ExtraireInfosTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        # create or get a superuser for auth
        if not User.objects.filter(email='test-admin@local').exists():
            User.objects.create_superuser(email='test-admin@local', password='admin1234')
        self.user = User.objects.get(email='test-admin@local')
        self.client.force_authenticate(user=self.user)

    def test_extraire_infos_from_local_pdf(self):
        # Path to a sample PDF kept in repository (relative to backend/)
        repo_root = Path(settings.BASE_DIR).parent
        sample = repo_root / 'Ancien Rapport' / 'rapport_soutenance.pdf'
        self.assertTrue(sample.exists(), f'Sample PDF not found: {sample}')

        with open(sample, 'rb') as f:
            data = SimpleUploadedFile(sample.name, f.read(), content_type='application/pdf')
            response = self.client.post('/api/bibliotheque/extraire-infos/?debug=1', {'fichier': data}, format='multipart')

        # Expect 200 if extraction worked; if extraction fails, the view may return 500
        self.assertIn(response.status_code, (200, 201), f'Unexpected status: {response.status_code} -> {response.data}')
        # If extraction succeeded we expect either titre/auteur/annee or raw_text_preview (debug)
        if response.status_code == 200:
            self.assertTrue(
                ('raw_text_preview' in response.data and response.data['raw_text_preview']) or
                (response.data.get('titre') or response.data.get('auteur') or response.data.get('annee')),
                f'Extraction returned empty payload: {response.data}'
            )

    def test_extraire_infos_from_inmemory_pdf(self):
        # Simule un upload en mémoire (InMemoryUploadedFile) sans chemin disque côté client
        repo_root = Path(settings.BASE_DIR).parent
        sample = repo_root / 'Ancien Rapport' / 'rapport_soutenance.pdf'
        self.assertTrue(sample.exists(), f'Sample PDF not found: {sample}')

        with open(sample, 'rb') as f:
            content = f.read()

        import io
        from django.core.files.uploadedfile import InMemoryUploadedFile

        bio = io.BytesIO(content)
        bio.seek(0)
        uploaded = InMemoryUploadedFile(bio, 'fichier', sample.name, 'application/pdf', len(content), None)

        response = self.client.post('/api/bibliotheque/extraire-infos/?debug=1', {'fichier': uploaded}, format='multipart')

        # Accept either success or server error depending on environment (OCR availability)
        self.assertIn(response.status_code, (200, 201), f'Unexpected status: {response.status_code} -> {response.data}')
        if response.status_code == 200:
            self.assertTrue(
                ('raw_text_preview' in response.data and response.data['raw_text_preview']) or
                (response.data.get('titre') or response.data.get('auteur') or response.data.get('annee')),
                f'Extraction returned empty payload (inmemory): {response.data}'
            )
