from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from themes.models import Theme
from documents.models import Document
from .models import TestPlagiat, TestPlagiatTheme
from .utils import calculer_taux_plagiat, nettoyer_texte_analyse


# ---------------------------------------------------------------------------
# Moteur plagiat
# ---------------------------------------------------------------------------

class CalculerTauxPlagiatTest(TestCase):

    def test_texte_identique_retourne_100(self):
        texte = "La gestion des ressources humaines dans les entreprises modernes"
        taux = calculer_taux_plagiat(texte, [texte])
        self.assertEqual(taux, 100.0)

    def test_texte_vide_retourne_0(self):
        taux = calculer_taux_plagiat("", ["un texte quelconque"])
        self.assertEqual(taux, 0.0)

    def test_corpus_vide_retourne_0(self):
        taux = calculer_taux_plagiat("un texte quelconque", [])
        self.assertEqual(taux, 0.0)

    def test_textes_differents_taux_faible(self):
        texte_a = "La photosynthèse est le processus par lequel les plantes produisent de l'énergie"
        texte_b = "Le droit constitutionnel régit l'organisation des pouvoirs publics de l'État"
        taux = calculer_taux_plagiat(texte_a, [texte_b])
        self.assertLess(taux, 30.0)

    def test_texte_partiellement_similaire(self):
        original = "La gestion des ressources humaines est essentielle dans les organisations modernes"
        similaire = "La gestion des ressources humaines joue un rôle clé dans les entreprises"
        taux = calculer_taux_plagiat(similaire, [original])
        self.assertGreater(taux, 20.0)


class NettoyerTexteTest(TestCase):

    def test_texte_vide(self):
        self.assertEqual(nettoyer_texte_analyse(""), "")

    def test_supprime_numeros_seuls(self):
        texte = "Introduction\n42\nSuite du texte"
        resultat = nettoyer_texte_analyse(texte)
        self.assertNotIn("\n42\n", resultat)


# ---------------------------------------------------------------------------
# API TestPlagiat (mémoires)
# ---------------------------------------------------------------------------

class TestPlagiatAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.etudiant = User.objects.create_user(
            email='etudiant@test.com', password='pass1234', role='etudiant'
        )
        self.chef = User.objects.create_user(
            email='chef@test.com', password='pass1234', role='chef'
        )
        self.theme = Theme.objects.create(
            titre='Thème test', description='Description test', etudiant=self.etudiant
        )
        fichier = SimpleUploadedFile("test.pdf", b"%PDF-1.4 test content", content_type="application/pdf")
        self.document = Document.objects.create(
            titre='Mémoire test', fichier=fichier, theme=self.theme, etudiant=self.etudiant
        )

    def _auth(self, user):
        response = self.client.post('/api/token/', {'email': user.email, 'password': 'pass1234'})
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.data['access'])

    def test_liste_tests_etudiant_voit_ses_tests(self):
        self._auth(self.etudiant)
        TestPlagiat.objects.create(document=self.document, taux_plagiat=15.0)
        response = self.client.get('/api/plagiarism/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_liste_tests_chef_voit_tout(self):
        self._auth(self.chef)
        TestPlagiat.objects.create(document=self.document, taux_plagiat=15.0)
        response = self.client.get('/api/plagiarism/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_non_authentifie_refuse(self):
        response = self.client.get('/api/plagiarism/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# API TestPlagiatTheme
# ---------------------------------------------------------------------------

class TestPlagiatThemeAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.etudiant = User.objects.create_user(
            email='etu2@test.com', password='pass1234', role='etudiant'
        )
        self.theme = Theme.objects.create(
            titre='Thème IA', description='Intelligence artificielle et apprentissage automatique',
            etudiant=self.etudiant
        )

    def _auth(self, user):
        response = self.client.post('/api/token/', {'email': user.email, 'password': 'pass1234'})
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.data['access'])

    def test_liste_tests_theme_etudiant(self):
        self._auth(self.etudiant)
        TestPlagiatTheme.objects.create(theme=self.theme, taux_plagiat=10.0)
        response = self.client.get('/api/plagiarism/themes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['taux_plagiat'], 10.0)

    def test_lancer_test_theme_sans_corpus_retourne_0(self):
        self._auth(self.etudiant)
        response = self.client.post(f'/api/plagiarism/lancer-theme/{self.theme.id}/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('taux_plagiat', response.data)
        self.assertEqual(response.data['taux_plagiat'], 0.0)
        # Vérifier persistance en base
        self.assertEqual(TestPlagiatTheme.objects.filter(theme=self.theme).count(), 1)

    def test_lancer_test_theme_inexistant(self):
        self._auth(self.etudiant)
        response = self.client.post('/api/plagiarism/lancer-theme/9999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_lancer_test_theme_autre_etudiant_refuse(self):
        autre = User.objects.create_user(
            email='autre@test.com', password='pass1234', role='etudiant'
        )
        self._auth(autre)
        response = self.client.post(f'/api/plagiarism/lancer-theme/{self.theme.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
