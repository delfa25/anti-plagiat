from django.urls import path
from .views import NotificationListView, NotificationMarkReadView

urlpatterns = [
    path('', NotificationListView.as_view()),
    path('<int:pk>/', NotificationMarkReadView.as_view()),
]
