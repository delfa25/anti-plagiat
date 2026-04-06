from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email obligatoire')
        email = self.normalize_email(email)
        extra_fields.setdefault('username', email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'superadmin')
        return self.create_user(email, password, **extra_fields)


def generer_ine():
    annee = timezone.now().year
    count = User.objects.filter(role='etudiant', date_joined__year=annee).count() + 1
    return f"N01{annee}{count:05d}"


class User(AbstractUser):

    ROLE_CHOICES = (
        ('superadmin', 'Super Administrateur'),
        ('directeur', 'Directeur Adjoint'),
        ('chef', 'Chef Departement'),
        ('etudiant', 'Etudiant'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='etudiant')
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, blank=True, null=True)
    nom = models.CharField(max_length=100, blank=True, null=True)
    prenom = models.CharField(max_length=100, blank=True, null=True)
    ine = models.CharField(max_length=20, unique=True, blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    @property
    def can_manage_users(self):
        return self.role in ('superadmin', 'directeur') or self.is_superuser

    def save(self, *args, **kwargs):
        if self.role == 'etudiant' and not self.ine:
            self.ine = generer_ine()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email