from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from users.models import User
from themes.models import Theme


class ThemeFluxTest(APITestCase):

    def setUp(self):
        self.client = APIClient()
        self.etudiant = User.objects.create_user(
            email='etu@test.com', password='pass1234', role='etudiant'
        )
        self.chef = User.objects.create_user(
            email='chef@test.com', password='pass1234', role='chef'
        )
        self.directeur = User.objects.create_user(
            email='da@test.com', password='pass1234', role='directeur'
        )

    def _auth(self, user):
        r = self.client.post('/api/token/', {'email': user.email, 'password': 'pass1234'})
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + r.data['access'])

    def _creer_theme(self):
        self._auth(self.etudiant)
        response = self.client.post('/api/themes/', {
            'titre': 'Système de détection de plagiat',
            'description': 'Développement d\'un système anti-plagiat basé sur TF-IDF'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data['id']

    def test_creation_en_brouillon(self):
        theme_id = self._creer_theme()
        self.assertEqual(Theme.objects.get(id=theme_id).statut, 'brouillon')

    def test_etudiant_ne_peut_pas_creer_deux_themes(self):
        self._creer_theme()
        self._auth(self.etudiant)
        response = self.client.post('/api/themes/', {
            'titre': 'Deuxième thème',
            'description': 'Description'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_soumission_par_etudiant(self):
        theme_id = self._creer_theme()
        self._auth(self.etudiant)
        response = self.client.post(f'/api/themes/{theme_id}/soumettre/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Theme.objects.get(id=theme_id).statut, 'soumis')

    def test_chef_ne_voit_pas_brouillons(self):
        self._creer_theme()  # statut brouillon
        self._auth(self.chef)
        response = self.client.get('/api/themes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for theme in response.data:
            self.assertNotEqual(theme['statut'], 'brouillon')

    def test_chef_valide_theme_soumis(self):
        theme_id = self._creer_theme()
        self._auth(self.etudiant)
        self.client.post(f'/api/themes/{theme_id}/soumettre/')

        self._auth(self.chef)
        response = self.client.patch(f'/api/themes/{theme_id}/', {
            'statut': 'valide',
            'valide_par_chef': True,
            'commentaire_validation': 'Thème approuvé'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_chef_rejette_theme(self):
        theme_id = self._creer_theme()
        self._auth(self.etudiant)
        self.client.post(f'/api/themes/{theme_id}/soumettre/')

        self._auth(self.chef)
        response = self.client.patch(f'/api/themes/{theme_id}/', {
            'statut': 'rejete',
            'commentaire_validation': 'Thème trop générique'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Theme.objects.get(id=theme_id).statut, 'rejete')

    def test_etudiant_peut_resoumettre_apres_rejet(self):
        theme_id = self._creer_theme()
        self._auth(self.etudiant)
        self.client.post(f'/api/themes/{theme_id}/soumettre/')
        self._auth(self.chef)
        self.client.patch(f'/api/themes/{theme_id}/', {'statut': 'rejete'})

        self._auth(self.etudiant)
        # Modifier puis resoumettre
        self.client.patch(f'/api/themes/{theme_id}/', {
            'titre': 'Thème amélioré',
            'description': 'Description améliorée'
        })
        response = self.client.post(f'/api/themes/{theme_id}/soumettre/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Theme.objects.get(id=theme_id).statut, 'soumis')

    def test_etudiant_ne_peut_pas_modifier_theme_soumis(self):
        theme_id = self._creer_theme()
        self._auth(self.etudiant)
        self.client.post(f'/api/themes/{theme_id}/soumettre/')
        response = self.client.patch(f'/api/themes/{theme_id}/', {'titre': 'Modification interdite'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
