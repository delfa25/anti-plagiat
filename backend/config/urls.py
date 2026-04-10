from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),
    path('api/users/', include('users.urls')),
    path('api/themes/', include('themes.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/plagiarism/', include('plagiarism.urls')),
    path('api/validation/', include('validation.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/parametres/', include('parametres.urls')),
    path('api/bibliotheque/', include('bibliotheque.urls')),
    path('api/ressources/', include('bibliotheque.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
