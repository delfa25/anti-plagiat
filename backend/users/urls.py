from django.urls import path
from .views import MeView, UserListCreateView, UserDetailView

urlpatterns = [
    path('me/', MeView.as_view()),
    path('', UserListCreateView.as_view()),
    path('<int:pk>/', UserDetailView.as_view()),
]
