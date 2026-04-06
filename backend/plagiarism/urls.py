from django.urls import path
from .views import TestPlagiatListCreateView, TestPlagiatDetailView, LancerTestPlagiatView

urlpatterns = [
    path('', TestPlagiatListCreateView.as_view()),
    path('<int:pk>/', TestPlagiatDetailView.as_view()),
    path('lancer/<int:document_id>/', LancerTestPlagiatView.as_view()),
]
