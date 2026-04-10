from django.urls import path
from .views import TestPlagiatListCreateView, TestPlagiatDetailView, LancerTestPlagiatView, LancerTestPlagiatThemeView

urlpatterns = [
    path('', TestPlagiatListCreateView.as_view()),
    path('<int:pk>/', TestPlagiatDetailView.as_view()),
    path('lancer/<int:document_id>/', LancerTestPlagiatView.as_view()),
    path('lancer-theme/<int:theme_id>/', LancerTestPlagiatThemeView.as_view()),
]
