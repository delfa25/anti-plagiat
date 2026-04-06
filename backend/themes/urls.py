from django.urls import path
from .views import ThemeListCreateView, ThemeDetailView

urlpatterns = [
    path('', ThemeListCreateView.as_view()),
    path('<int:pk>/', ThemeDetailView.as_view()),
]
