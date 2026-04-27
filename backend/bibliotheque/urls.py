from django.urls import path
from .views import RessourceListCreateView, RessourceDetailView, ToggleRessourceView, ExtraireInfosPdfView, AjouterPaireView

urlpatterns = [
    path('', RessourceListCreateView.as_view()),
    path('ajouter-paire/', AjouterPaireView.as_view()),
    path('extraire-infos/', ExtraireInfosPdfView.as_view()),
    path('<int:pk>/', RessourceDetailView.as_view()),
    path('<int:pk>/toggle/', ToggleRessourceView.as_view()),
]
