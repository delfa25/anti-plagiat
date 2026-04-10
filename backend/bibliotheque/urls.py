from django.urls import path
from .views import RessourceListCreateView, RessourceDetailView, ToggleRessourceView

urlpatterns = [
    path('', RessourceListCreateView.as_view()),
    path('<int:pk>/', RessourceDetailView.as_view()),
    path('<int:pk>/toggle/', ToggleRessourceView.as_view()),
]
