from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from users.models import User
from themes.models import Theme
from documents.models import Document


def make_pdf():
    return SimpleUploadedFile("doc.pdf", b"%PDF-1.4 contenu test", content_type="application/pdf")


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
            titre='Thème mémoire', description='Desc', etudiant=self.etudiant, statut='valide'
        )

    def _auth(self, user):
        r = self.client.post('/api/token/', {'email': user.email, 'password': 'pass1234'})
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + r.data['access'])

    def _creer_document(self):
        self._auth(self.etudiant)
        response = self.client.post('/api/documents/', {
            'titre': 'Mon mémoire',
            'fichier': make_pdf(),
            'theme': self.theme.id,
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data['id']

    def test_creation_en_brouillon(self):
        doc_id = self._creer_document()
        doc = Document.objects.get(id=doc_id)
        self.assertEqual(doc.statut, 'brouillon')

    def test_etudiant_ne_peut_pas_creer_deux_documents(self):
        self._creer_document()
        self._auth(self.etudiant)
        response = self.client.post('/api/documents/', {
            'titre': 'Deuxième mémoire',
            'fichier': make_pdf(),
            'theme': self.theme.id,
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_soumission_par_etudiant(self):
        doc_id = self._creer_document()
        self._auth(self.etudiant)
        response = self.client.post(f'/api/documents/{doc_id}/soumettre/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Document.objects.get(id=doc_id).statut, 'soumis')

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
            'commentaire_validation': 'À revoir'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Document.objects.get(id=doc_id).statut, 'rejete_chef')

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

    def test_etudiant_ne_voit_pas_documents_autres(self):
        doc_id = self._creer_document()
        autre_etu = User.objects.create_user(
            email='autre@test.com', password='pass1234', role='etudiant'
        )
        self._auth(autre_etu)
        response = self.client.get(f'/api/documents/{doc_id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_chef_ne_voit_pas_brouillons(self):
        self._creer_document()  # statut brouillon
        self._auth(self.chef)
        response = self.client.get('/api/documents/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for doc in response.data:
            self.assertNotEqual(doc['statut'], 'brouillon')
