from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from users.models import User
from themes.models import Theme
from documents.models import Document


# PDF minimal valide que PyPDF2 peut lire sans erreur
PDF_MINIMAL = (
    b"%PDF-1.4\n"
    b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
    b"/Contents 4 0 R /Resources << /Font << /F1 << /Type /Font "
    b"/Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n"
    b"4 0 obj\n<< /Length 44 >>\nstream\n"
    b"BT /F1 12 Tf 100 700 Td (Contenu test) Tj ET\n"
    b"endstream\nendobj\n"
    b"xref\n0 5\n0000000000 65535 f\n"
    b"trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n0\n%%EOF"
)


def make_pdf(nom="doc.pdf"):
    return SimpleUploadedFile(nom, PDF_MINIMAL, content_type="application/pdf")


class DocumentFluxTest(APITestCase):

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
        self.theme = Theme.objects.create(
            titre='Conception et realisation dun systeme de gestion',
            description='Developpement dune application web de gestion des ressources humaines',
            etudiant=self.etudiant,
            statut='valide'
        )

    def _auth(self, user):
        r = self.client.post('/api/token/', {'email': user.email, 'password': 'pass1234'})
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + r.data['access'])

    def _creer_document(self):
        self._auth(self.etudiant)
        response = self.client.post('/api/documents/', {
            'titre': 'Memoire sur la gestion des ressources humaines',
            'fichier': make_pdf(),
            'theme': self.theme.id,
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data['id']

    # --- Creation ---

    def test_creation_en_brouillon(self):
        doc_id = self._creer_document()
        self.assertEqual(Document.objects.get(id=doc_id).statut, 'brouillon')

    def test_etudiant_ne_peut_pas_creer_deux_documents(self):
        self._creer_document()
        self._auth(self.etudiant)
        response = self.client.post('/api/documents/', {
            'titre': 'Deuxieme memoire',
            'fichier': make_pdf(),
            'theme': self.theme.id,
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_document_sans_theme_valide_refuse(self):
        theme_brouillon = Theme.objects.create(
            titre='Theme brouillon', description='desc',
            etudiant=self.etudiant, statut='brouillon'
        )
        self._auth(self.etudiant)
        response = self.client.post('/api/documents/', {
            'titre': 'Memoire sans theme valide',
            'fichier': make_pdf(),
            'theme': theme_brouillon.id,
        }, format='multipart')
        # Le theme n'est pas valide — doit echouer
        self.assertNotEqual(response.status_code, status.HTTP_201_CREATED)

    # --- Soumission ---

    def test_soumission_par_etudiant(self):
        doc_id = self._creer_document()
        self._auth(self.etudiant)
        response = self.client.post(f'/api/documents/{doc_id}/soumettre/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Document.objects.get(id=doc_id).statut, 'soumis')

    def test_soumission_impossible_si_deja_soumis(self):
        doc_id = self._creer_document()
        self._auth(self.etudiant)
        self.client.post(f'/api/documents/{doc_id}/soumettre/')
        response = self.client.post(f'/api/documents/{doc_id}/soumettre/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Validation chef ---

    def test_chef_valide_document_soumis(self):
        doc_id = self._creer_document()
        self._auth(self.etudiant)
        self.client.post(f'/api/documents/{doc_id}/soumettre/')
        self._auth(self.chef)
        response = self.client.patch(f'/api/documents/{doc_id}/', {
            'statut': 'valide_chef',
            'commentaire_validation': 'Bon travail'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Document.objects.get(id=doc_id).statut, 'valide_chef')

    def test_chef_rejette_document(self):
        doc_id = self._creer_document()
        self._auth(self.etudiant)
        self.client.post(f'/api/documents/{doc_id}/soumettre/')
        self._auth(self.chef)
        response = self.client.patch(f'/api/documents/{doc_id}/', {
            'statut': 'rejete_chef',
            'commentaire_validation': 'A revoir'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Document.objects.get(id=doc_id).statut, 'rejete_chef')

    def test_etudiant_peut_resoumettre_apres_rejet_chef(self):
        doc_id = self._creer_document()
        self._auth(self.etudiant)
        self.client.post(f'/api/documents/{doc_id}/soumettre/')
        self._auth(self.chef)
        self.client.patch(f'/api/documents/{doc_id}/', {'statut': 'rejete_chef'})
        self._auth(self.etudiant)
        response = self.client.post(f'/api/documents/{doc_id}/soumettre/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Document.objects.get(id=doc_id).statut, 'soumis')

    # --- Validation directeur ---

    def test_directeur_valide_definitivement(self):
        doc_id = self._creer_document()
        self._auth(self.etudiant)
        self.client.post(f'/api/documents/{doc_id}/soumettre/')
        self._auth(self.chef)
        self.client.patch(f'/api/documents/{doc_id}/', {'statut': 'valide_chef'})
        self._auth(self.directeur)
        response = self.client.patch(f'/api/documents/{doc_id}/', {'statut': 'valide'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Document.objects.get(id=doc_id).statut, 'valide')

    def test_directeur_rejette_definitivement(self):
        doc_id = self._creer_document()
        self._auth(self.etudiant)
        self.client.post(f'/api/documents/{doc_id}/soumettre/')
        self._auth(self.chef)
        self.client.patch(f'/api/documents/{doc_id}/', {'statut': 'valide_chef'})
        self._auth(self.directeur)
        response = self.client.patch(f'/api/documents/{doc_id}/', {
            'statut': 'rejete',
            'commentaire_validation': 'Taux de plagiat trop eleve'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Document.objects.get(id=doc_id).statut, 'rejete')

    # --- Visibilite ---

    def test_etudiant_ne_voit_pas_documents_autres(self):
        doc_id = self._creer_document()
        autre = User.objects.create_user(email='autre@test.com', password='pass1234', role='etudiant')
        self._auth(autre)
        response = self.client.get(f'/api/documents/{doc_id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_chef_ne_voit_pas_brouillons(self):
        self._creer_document()
        self._auth(self.chef)
        response = self.client.get('/api/documents/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for doc in response.data:
            self.assertNotEqual(doc['statut'], 'brouillon')

    def test_directeur_ne_voit_que_valide_chef_et_plus(self):
        doc_id = self._creer_document()
        self._auth(self.etudiant)
        self.client.post(f'/api/documents/{doc_id}/soumettre/')
        self._auth(self.directeur)
        response = self.client.get('/api/documents/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for doc in response.data:
            self.assertIn(doc['statut'], ['valide_chef', 'valide', 'rejete'])

    # --- Suppression ---

    def test_etudiant_peut_supprimer_brouillon(self):
        doc_id = self._creer_document()
        self._auth(self.etudiant)
        response = self.client.delete(f'/api/documents/{doc_id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_etudiant_ne_peut_pas_supprimer_soumis(self):
        doc_id = self._creer_document()
        self._auth(self.etudiant)
        self.client.post(f'/api/documents/{doc_id}/soumettre/')
        response = self.client.delete(f'/api/documents/{doc_id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
