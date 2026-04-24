from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from users.models import User
from themes.models import Theme


TITRE_THEME = 'Conception et realisation dun systeme de gestion des ressources humaines'
DESC_THEME = (
    'Ce travail porte sur le developpement dune application web permettant de gerer '
    'les ressources humaines au sein dune entreprise. Il couvre le recrutement, '
    'la formation, l evaluation des performances et la gestion des carrieres.'
)


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

    def _creer_theme(self, titre=TITRE_THEME, description=DESC_THEME):
        self._auth(self.etudiant)
        response = self.client.post('/api/themes/', {
            'titre': titre,
            'description': description
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data['id']

    # --- Creation ---

    def test_creation_en_brouillon(self):
        theme_id = self._creer_theme()
        self.assertEqual(Theme.objects.get(id=theme_id).statut, 'brouillon')

    def test_etudiant_ne_peut_pas_creer_deux_themes(self):
        self._creer_theme()
        self._auth(self.etudiant)
        response = self.client.post('/api/themes/', {
            'titre': 'Deuxieme theme',
            'description': 'Description'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_theme_sans_description_refuse(self):
        self._auth(self.etudiant)
        response = self.client.post('/api/themes/', {'titre': 'Theme sans description'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Soumission ---

    def test_soumission_par_etudiant(self):
        theme_id = self._creer_theme()
        self._auth(self.etudiant)
        response = self.client.post(f'/api/themes/{theme_id}/soumettre/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Theme.objects.get(id=theme_id).statut, 'soumis')

    def test_soumission_impossible_si_deja_soumis(self):
        theme_id = self._creer_theme()
        self._auth(self.etudiant)
        self.client.post(f'/api/themes/{theme_id}/soumettre/')
        response = self.client.post(f'/api/themes/{theme_id}/soumettre/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Visibilite ---

    def test_chef_ne_voit_pas_brouillons(self):
        self._creer_theme()
        self._auth(self.chef)
        response = self.client.get('/api/themes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for theme in response.data:
            self.assertNotEqual(theme['statut'], 'brouillon')

    def test_etudiant_voit_uniquement_ses_themes(self):
        self._creer_theme()
        autre = User.objects.create_user(email='autre@test.com', password='pass1234', role='etudiant')
        self._auth(autre)
        response = self.client.get('/api/themes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    # --- Validation chef ---

    def test_chef_valide_theme_soumis(self):
        theme_id = self._creer_theme()
        self._auth(self.etudiant)
        self.client.post(f'/api/themes/{theme_id}/soumettre/')
        self._auth(self.chef)
        response = self.client.patch(f'/api/themes/{theme_id}/', {
            'statut': 'valide',
            'commentaire_validation': 'Theme approuve'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Theme.objects.get(id=theme_id).statut, 'valide')

    def test_chef_rejette_theme(self):
        theme_id = self._creer_theme()
        self._auth(self.etudiant)
        self.client.post(f'/api/themes/{theme_id}/soumettre/')
        self._auth(self.chef)
        response = self.client.patch(f'/api/themes/{theme_id}/', {
            'statut': 'rejete',
            'commentaire_validation': 'Theme trop generique'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Theme.objects.get(id=theme_id).statut, 'rejete')

    # --- Resoumission apres rejet ---

    def test_etudiant_peut_modifier_theme_rejete(self):
        theme_id = self._creer_theme()
        self._auth(self.etudiant)
        self.client.post(f'/api/themes/{theme_id}/soumettre/')
        self._auth(self.chef)
        self.client.patch(f'/api/themes/{theme_id}/', {'statut': 'rejete'})
        self._auth(self.etudiant)
        response = self.client.patch(f'/api/themes/{theme_id}/', {
            'titre': 'Theme ameliore et plus precis',
            'description': DESC_THEME + ' avec des precisions supplementaires.'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_etudiant_peut_resoumettre_apres_rejet(self):
        theme_id = self._creer_theme()
        self._auth(self.etudiant)
        self.client.post(f'/api/themes/{theme_id}/soumettre/')
        self._auth(self.chef)
        self.client.patch(f'/api/themes/{theme_id}/', {'statut': 'rejete'})
        self._auth(self.etudiant)
        self.client.patch(f'/api/themes/{theme_id}/', {
            'titre': 'Theme ameliore',
            'description': DESC_THEME
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

    def test_etudiant_ne_peut_pas_modifier_theme_valide(self):
        theme_id = self._creer_theme()
        self._auth(self.etudiant)
        self.client.post(f'/api/themes/{theme_id}/soumettre/')
        self._auth(self.chef)
        self.client.patch(f'/api/themes/{theme_id}/', {'statut': 'valide'})
        self._auth(self.etudiant)
        response = self.client.patch(f'/api/themes/{theme_id}/', {'titre': 'Modification interdite'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Suppression ---

    def test_etudiant_peut_supprimer_brouillon(self):
        theme_id = self._creer_theme()
        self._auth(self.etudiant)
        response = self.client.delete(f'/api/themes/{theme_id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_etudiant_ne_peut_pas_supprimer_theme_soumis(self):
        theme_id = self._creer_theme()
        self._auth(self.etudiant)
        self.client.post(f'/api/themes/{theme_id}/soumettre/')
        response = self.client.delete(f'/api/themes/{theme_id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # --- Notification ---

    def test_notification_creee_apres_validation(self):
        from notifications.models import Notification
        theme_id = self._creer_theme()
        self._auth(self.etudiant)
        self.client.post(f'/api/themes/{theme_id}/soumettre/')
        self._auth(self.chef)
        self.client.patch(f'/api/themes/{theme_id}/', {
            'statut': 'valide',
            'commentaire_validation': 'Excellent theme'
        })
        notifs = Notification.objects.filter(utilisateur=self.etudiant)
        self.assertGreater(notifs.count(), 0)
        self.assertTrue(any('valide' in n.message.lower() for n in notifs))
