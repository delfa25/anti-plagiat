from django.urls import path
from .views import ValidationListCreateView, ValidationDetailView

urlpatterns = [
    path('', ValidationListCreateView.as_view()),
    path('<int:pk>/', ValidationDetailView.as_view()),
]
