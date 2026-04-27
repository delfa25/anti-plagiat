from django.urls import path
from .views import DocumentListCreateView, DocumentDetailView, SoumettreDocumentView, ExtraireInfosDocumentView

urlpatterns = [
    path('', DocumentListCreateView.as_view()),
    path('extraire-infos/', ExtraireInfosDocumentView.as_view()),
    path('<int:pk>/', DocumentDetailView.as_view()),
    path('<int:pk>/soumettre/', SoumettreDocumentView.as_view()),
]
