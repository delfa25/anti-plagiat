from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import TestPlagiat
from .serializers import TestPlagiatSerializer
from .utils import extraire_texte_pdf, calculer_taux_plagiat
from documents.models import Document
from notifications.models import Notification


class TestPlagiatListCreateView(generics.ListCreateAPIView):
    serializer_class = TestPlagiatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TestPlagiat.objects.filter(document__etudiant=self.request.user)


class TestPlagiatDetailView(generics.RetrieveAPIView):
    serializer_class = TestPlagiatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TestPlagiat.objects.filter(document__etudiant=self.request.user)


class LancerTestPlagiatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, document_id):
        try:
            document = Document.objects.get(id=document_id, etudiant=request.user)
        except Document.DoesNotExist:
            return Response({'error': 'Document introuvable'}, status=status.HTTP_404_NOT_FOUND)

        autres_documents = Document.objects.exclude(id=document_id)
        textes_existants = []

        for doc in autres_documents:
            texte = extraire_texte_pdf(doc.fichier)
            if texte.strip():
                textes_existants.append(texte)

        texte_nouveau = extraire_texte_pdf(document.fichier)
        taux = calculer_taux_plagiat(texte_nouveau, textes_existants)

        document.taux_plagiat = taux
        document.save()

        test = TestPlagiat.objects.create(document=document, taux_plagiat=taux)

        Notification.objects.create(
            utilisateur=request.user,
            message=f"Test plagiat terminé pour '{document.titre}' — Taux : {taux}%"
        )

        return Response(TestPlagiatSerializer(test).data, status=status.HTTP_201_CREATED)
