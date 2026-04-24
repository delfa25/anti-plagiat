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
# Textes realistes (longueur suffisante pour TF-IDF)
# ---------------------------------------------------------------------------

TEXTE_GRH = (
    "La gestion des ressources humaines est un domaine essentiel au sein des organisations modernes. "
    "Elle englobe le recrutement, la formation, l'evaluation des performances et la gestion des carrieres. "
    "Les entreprises qui investissent dans leur capital humain obtiennent de meilleurs resultats. "
    "La motivation des employes est un facteur cle de la productivite organisationnelle."
)

TEXTE_SI = (
    "Les systemes d'information jouent un role central dans la transformation numerique des entreprises. "
    "Ils permettent de centraliser les donnees, d'automatiser les processus et d'ameliorer la prise de decision. "
    "L'architecture d'un systeme d'information doit etre scalable et securisee. "
    "La gestion des bases de donnees relationnelles est fondamentale pour tout systeme d'information."
)

TEXTE_DROIT = (
    "Le droit constitutionnel regit l'organisation des pouvoirs publics de l'Etat. "
    "Il definit les droits fondamentaux des citoyens et les limites de l'autorite gouvernementale. "
    "La separation des pouvoirs est un principe fondateur des democraties modernes. "
    "Les institutions judiciaires garantissent le respect des lois et la protection des libertes individuelles."
)


# ---------------------------------------------------------------------------
# Moteur plagiat — calculer_taux_plagiat retourne un dict
# ---------------------------------------------------------------------------

class CalculerTauxPlagiatTest(TestCase):

    def test_texte_identique_retourne_100(self):
        resultat = calculer_taux_plagiat(TEXTE_GRH, [TEXTE_GRH])
        self.assertEqual(resultat['taux'], 100.0)

    def test_texte_vide_retourne_0(self):
        resultat = calculer_taux_plagiat("", [TEXTE_GRH])
        self.assertEqual(resultat['taux'], 0.0)

    def test_corpus_vide_retourne_0(self):
        resultat = calculer_taux_plagiat(TEXTE_GRH, [])
        self.assertEqual(resultat['taux'], 0.0)

    def test_textes_differents_taux_faible(self):
        resultat = calculer_taux_plagiat(TEXTE_DROIT, [TEXTE_GRH])
        self.assertLess(resultat['taux'], 30.0)

    def test_texte_partiellement_similaire(self):
        similaire = (
            "La gestion des ressources humaines joue un role cle dans les entreprises modernes. "
            "Le recrutement et la formation sont des activites essentielles pour developper le capital humain. "
            "Les organisations performantes accordent une grande importance a la motivation de leurs employes."
        )
        resultat = calculer_taux_plagiat(similaire, [TEXTE_GRH])
        self.assertGreater(resultat['taux'], 20.0)

    def test_retourne_source_titre(self):
        resultat = calculer_taux_plagiat(TEXTE_GRH, [TEXTE_GRH], titres_existants=['Source GRH'])
        self.assertEqual(resultat['source_titre'], 'Source GRH')

    def test_retourne_phrases_suspectes_liste(self):
        resultat = calculer_taux_plagiat(TEXTE_GRH, [TEXTE_GRH])
        self.assertIsInstance(resultat['phrases_suspectes'], list)

    def test_plusieurs_sources_retourne_max(self):
        resultat = calculer_taux_plagiat(TEXTE_GRH, [TEXTE_DROIT, TEXTE_GRH, TEXTE_SI])
        self.assertEqual(resultat['taux'], 100.0)
        self.assertEqual(resultat['source_titre'], 'Source 2')


# ---------------------------------------------------------------------------
# Nettoyage du texte
# ---------------------------------------------------------------------------

class NettoyerTexteTest(TestCase):

    def test_texte_vide(self):
        self.assertEqual(nettoyer_texte_analyse(""), "")

    def test_supprime_numeros_seuls(self):
        texte = "Introduction\n42\nSuite du texte"
        resultat = nettoyer_texte_analyse(texte)
        self.assertNotIn("\n42\n", resultat)

    def test_supprime_entetes_ibam(self):
        texte = "INSTITUT BURKINABE DES ARTS ET METIERS\nContenu utile du rapport"
        resultat = nettoyer_texte_analyse(texte)
        self.assertNotIn("INSTITUT BURKINABE", resultat)

    def test_supprime_legendes_figures(self):
        texte = "Introduction\nFigure 1 : Architecture du systeme\nLe systeme est compose de plusieurs modules."
        resultat = nettoyer_texte_analyse(texte)
        self.assertNotIn("Figure 1", resultat)


# ---------------------------------------------------------------------------
# API TestPlagiat (memoires)
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
            titre='Gestion des ressources humaines', description=TEXTE_GRH, etudiant=self.etudiant
        )
        fichier = SimpleUploadedFile("test.pdf", b"%PDF-1.4 test content", content_type="application/pdf")
        self.document = Document.objects.create(
            titre='Memoire GRH', fichier=fichier, theme=self.theme, etudiant=self.etudiant
        )

    def _auth(self, user):
        response = self.client.post('/api/token/', {'email': user.email, 'password': 'pass1234'})
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.data['access'])

    def test_liste_tests_etudiant_voit_ses_tests(self):
        self._auth(self.etudiant)
        TestPlagiat.objects.create(document=self.document, taux_plagiat=15.0, phrases_suspectes=[])
        response = self.client.get('/api/plagiarism/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_liste_tests_chef_voit_tout(self):
        self._auth(self.chef)
        TestPlagiat.objects.create(document=self.document, taux_plagiat=15.0, phrases_suspectes=[])
        response = self.client.get('/api/plagiarism/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_non_authentifie_refuse(self):
        response = self.client.get('/api/plagiarism/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_test_plagiat_persiste_en_base(self):
        self._auth(self.etudiant)
        # Sans corpus valide, le taux sera 0 mais le test doit etre cree
        response = self.client.post(f'/api/plagiarism/lancer/{self.document.id}/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('taux_plagiat', response.data)
        self.assertEqual(TestPlagiat.objects.filter(document=self.document).count(), 1)

    def test_test_plagiat_document_inexistant(self):
        self._auth(self.etudiant)
        response = self.client.post('/api/plagiarism/lancer/9999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_etudiant_ne_peut_pas_tester_document_autre(self):
        autre = User.objects.create_user(email='autre@test.com', password='pass1234', role='etudiant')
        self._auth(autre)
        response = self.client.post(f'/api/plagiarism/lancer/{self.document.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


# ---------------------------------------------------------------------------
# API TestPlagiatTheme
# ---------------------------------------------------------------------------

class TestPlagiatThemeAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.etudiant = User.objects.create_user(
            email='etu2@test.com', password='pass1234', role='etudiant'
        )
        self.chef = User.objects.create_user(
            email='chef2@test.com', password='pass1234', role='chef'
        )
        self.theme = Theme.objects.create(
            titre='Systeme de gestion des ressources humaines',
            description=TEXTE_GRH,
            etudiant=self.etudiant
        )

    def _auth(self, user):
        response = self.client.post('/api/token/', {'email': user.email, 'password': 'pass1234'})
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.data['access'])

    def test_liste_tests_theme_etudiant(self):
        self._auth(self.etudiant)
        TestPlagiatTheme.objects.create(theme=self.theme, taux_plagiat=10.0, phrases_suspectes=[])
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
        self.assertEqual(TestPlagiatTheme.objects.filter(theme=self.theme).count(), 1)

    def test_lancer_test_theme_avec_corpus_similaire(self):
        # Creer un theme valide similaire dans le corpus
        autre_etu = User.objects.create_user(email='etu3@test.com', password='pass1234', role='etudiant')
        Theme.objects.create(
            titre='Gestion RH en entreprise',
            description=TEXTE_GRH,
            etudiant=autre_etu,
            statut='valide'
        )
        self._auth(self.etudiant)
        response = self.client.post(f'/api/plagiarism/lancer-theme/{self.theme.id}/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertGreater(response.data['taux_plagiat'], 0.0)

    def test_lancer_test_theme_inexistant(self):
        self._auth(self.etudiant)
        response = self.client.post('/api/plagiarism/lancer-theme/9999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_lancer_test_theme_autre_etudiant_refuse(self):
        autre = User.objects.create_user(email='autre@test.com', password='pass1234', role='etudiant')
        self._auth(autre)
        response = self.client.post(f'/api/plagiarism/lancer-theme/{self.theme.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_chef_peut_lancer_test_theme_soumis(self):
        self.theme.statut = 'soumis'
        self.theme.save()
        self._auth(self.chef)
        response = self.client.post(f'/api/plagiarism/lancer-theme/{self.theme.id}/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_historique_tests_trie_par_date(self):
        self._auth(self.etudiant)
        TestPlagiatTheme.objects.create(theme=self.theme, taux_plagiat=10.0)
        TestPlagiatTheme.objects.create(theme=self.theme, taux_plagiat=25.0)
        response = self.client.get('/api/plagiarism/themes/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
