from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from bibliotheque.models import Ressource
from parametres.models import Parametre


User = get_user_model()


class BibliothequeParametresTests(APITestCase):
    def setUp(self):
        self.directeur = User.objects.create_user(
            email='da@test.com',
            password='password123',
            role='directeur'
        )
        self.client.force_authenticate(user=self.directeur)
        self.list_url = '/api/bibliotheque/'

    def test_create_blocked_when_ajout_manuel_disabled(self):
        Parametre.objects.update_or_create(
            cle='ajout_manuel_bibliotheque',
            defaults={'valeur': 'false', 'description': 'toggle ajout manuel'}
        )

        payload = {
            'titre': 'Ressource test',
            'type': 'memoire',
            'auteur': 'Auteur Test',
            'annee': 2025,
        }
        response = self.client.post(self.list_url, payload, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Ressource.objects.count(), 0)

    def test_update_blocked_when_ajout_manuel_disabled(self):
        ressource = Ressource.objects.create(
            titre='R1',
            type='memoire',
            ajoute_par=self.directeur,
            actif=True
        )
        Parametre.objects.update_or_create(
            cle='ajout_manuel_bibliotheque',
            defaults={'valeur': 'false', 'description': 'toggle ajout manuel'}
        )

        response = self.client.patch(
            f'/api/bibliotheque/{ressource.id}/',
            {'titre': 'R1 modifie'},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        ressource.refresh_from_db()
        self.assertEqual(ressource.titre, 'R1')

    def test_toggle_blocked_when_ajout_manuel_disabled(self):
        ressource = Ressource.objects.create(
            titre='R2',
            type='theme',
            ajoute_par=self.directeur,
            actif=True
        )
        Parametre.objects.update_or_create(
            cle='ajout_manuel_bibliotheque',
            defaults={'valeur': 'false', 'description': 'toggle ajout manuel'}
        )

        response = self.client.patch(f'/api/bibliotheque/{ressource.id}/toggle/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        ressource.refresh_from_db()
        self.assertTrue(ressource.actif)
