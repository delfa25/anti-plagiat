# 🗺️ ROADMAP — Système de Détection de Plagiat

## ✅ FAIT
- [x] Création projet Django
- [x] Création apps (users, themes, documents, plagiarism, validation, notifications)
- [x] Création modèles
- [x] Docker (backend + frontend + postgres)
- [x] rest_framework installé

---

## 🧱 PHASE 1 — Backend API REST

### Étape 1 — Serializers ✅
- [x] users/serializers.py
- [x] themes/serializers.py
- [x] documents/serializers.py
- [x] plagiarism/serializers.py
- [x] validation/serializers.py
- [x] notifications/serializers.py

### Étape 2 — Views ✅
- [x] users/views.py
- [x] themes/views.py
- [x] documents/views.py
- [x] plagiarism/views.py
- [x] validation/views.py
- [x] notifications/views.py

### Étape 3 — URLs ✅
- [x] users/urls.py
- [x] themes/urls.py
- [x] documents/urls.py
- [x] plagiarism/urls.py
- [x] validation/urls.py
- [x] notifications/urls.py
- [x] config/urls.py (routeur principal)

### Étape 4 — Authentification JWT ✅
- [x] Installer djangorestframework-simplejwt
- [x] /api/token/ (login)
- [x] /api/token/refresh/
- [x] Protéger les endpoints avec permissions
- [x] Installer django-cors-headers
- [x] Configurer CORS pour React (localhost:3000)

### Étape 5 — Logique métier ✅
- [x] Détection plagiat (TF-IDF + cosine similarity)
- [x] Calcul taux plagiat
- [x] Mise à jour statut document après test
- [x] Envoi notification automatique après test

### Étape 6 — Migrations & Tests API ✅
- [x] makemigrations + migrate
- [x] Créer superuser
- [x] Tester avec curl (JWT + endpoints protégés)

---

## 🎨 PHASE 2 — Frontend React

### Étape 1 — Setup ✅
- [x] Installer Tailwind CSS (CDN)
- [x] Installer axios, react-router-dom
- [x] Configurer axios baseURL

### Étape 2 — Authentification ✅
- [x] Page Login
- [x] Page Register
- [x] Gestion token JWT (localStorage)
- [x] Route protégée (PrivateRoute)

### Étape 3 — Dashboard ✅
- [x] Page d'accueil et présentation
- [x] Dashboard Étudiant
- [x] Dashboard Chef Département
- [x] Dashboard Directeur Adjoint
- [x] Dashboard Super Admin
- [x] Gestion utilisateurs (CRUD)
- [x] Filtres par rôle + INE étudiants

### Étape 4 — Thèmes
- [ ] Formulaire soumission thème
- [ ] Liste thèmes (étudiant)
- [ ] Liste thèmes à valider (chef / directeur)
- [ ] Bouton valider / rejeter

### Étape 5 — Documents (Mémoires)
- [ ] Upload mémoire (PDF)
- [ ] Liste mémoires
- [ ] Résultat test plagiat
- [ ] Rapport plagiat

### Étape 6 — Notifications
- [ ] Afficher notifications
- [ ] Marquer comme lu

---

## 🐳 PHASE 3 — Docker & DevOps

- [ ] Vérifier docker-compose fonctionne
- [ ] Variables d'environnement (.env)
- [ ] Connecter backend à PostgreSQL via Docker

---

## 🧪 PHASE 4 — Tests

- [ ] Tests API (Postman)
- [ ] Tests upload fichiers
- [ ] Tests flux complet (étudiant → validation)

---

## 🚀 PHASE 5 — Déploiement

- [ ] Choisir plateforme (Railway / Render / VPS)
- [ ] Variables d'environnement production
- [ ] Build frontend
- [ ] Déployer

---

## 📍 ÉTAT ACTUEL

> On est ici 👇

**PHASE 2 — Étape 4 : Thèmes**

Prochaine action : formulaire soumission thème + liste thèmes
