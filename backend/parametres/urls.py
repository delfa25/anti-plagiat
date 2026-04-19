from django.urls import path
from .views import ParametreListView, ParametreDetailView, ParametreValueView

urlpatterns = [
    path('', ParametreListView.as_view()),
    path('valeur/<str:cle>/', ParametreValueView.as_view()),
    path('<str:cle>/', ParametreDetailView.as_view()),
]
