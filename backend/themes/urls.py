from django.urls import path
from .views import ThemeListCreateView, ThemeDetailView, SoumettreThemeView

urlpatterns = [
    path('', ThemeListCreateView.as_view()),
    path('<int:pk>/', ThemeDetailView.as_view()),
    path('<int:pk>/soumettre/', SoumettreThemeView.as_view()),
]
