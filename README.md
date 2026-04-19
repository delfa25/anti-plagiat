# ScholarCheck — Système de Détection de Plagiat

Plateforme web de détection de plagiat pour mémoires et thèmes académiques.  
Stack : Django REST Framework · React · PostgreSQL · Docker

---

## Fonctionnalités

- Dépôt et gestion de mémoires (PDF) et de thèmes
- Détection de plagiat par TF-IDF + similarité cosinus, optimisée pour le français
- OCR automatique pour les PDFs scannés (Tesseract)
- Workflow de validation multi-niveaux : Étudiant → Chef de département → Directeur Adjoint
- Bibliothèque de ressources de référence (ajout manuel ou automatique après validation)
- Paramètres système configurables (seuil de plagiat, règles bibliothèque)
- Notifications en temps réel à chaque étape du workflow
- Gestion des utilisateurs avec rôles et INE auto-généré pour les étudiants

---

## Rôles

| Rôle | Accès |
|---|---|
| `superadmin` | Tout (utilisateurs, paramètres, bibliothèque) |
| `directeur` | Validation finale, bibliothèque, paramètres |
| `chef` | Validation intermédiaire, test plagiat |
| `etudiant` | Dépôt thème/mémoire, test plagiat, soumission |

---

## Prérequis

- [Docker](https://www.docker.com/) et Docker Compose

---

## Installation et lancement

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd anti-plagiat
```

### 2. Configurer les variables d'environnement

```bash
cp backend/.env.example backend/.env
```

Éditer `backend/.env` et renseigner au minimum :

```env
SECRET_KEY=une-cle-secrete-longue-et-aleatoire
DEBUG=True
DB_ENGINE=django.db.backends.postgresql
DB_NAME=anti_plagiat
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432
```

Pour générer une `SECRET_KEY` :

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 3. Lancer avec Docker

```bash
docker-compose up --build
```

- Frontend : http://localhost:3000
- Backend API : http://localhost:8000
- Admin Django : http://localhost:8000/admin

### 4. Créer un superadmin

```bash
docker-compose exec backend python manage.py createsuperuser
```

---

## Lancement sans Docker (dev local Windows)

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Dans `backend/.env`, adapter les chemins OCR :

```env
DB_ENGINE=django.db.backends.sqlite3
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
POPPLER_PATH=C:\poppler\poppler-25.12.0\Library\bin
```

```bash
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm start
```

---

## Lancer les tests

```bash
docker-compose exec backend python manage.py test plagiarism documents themes
```

Ou en local :

```bash
cd backend
python manage.py test plagiarism documents themes
```

---

## API — Endpoints principaux

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/token/` | Obtenir un token JWT |
| POST | `/api/token/refresh/` | Rafraîchir le token |
| GET/POST | `/api/users/` | Gestion utilisateurs |
| GET/POST | `/api/themes/` | Thèmes |
| POST | `/api/themes/<id>/soumettre/` | Soumettre un thème |
| POST | `/api/plagiarism/lancer-theme/<id>/` | Tester plagiat d'un thème |
| GET | `/api/plagiarism/themes/` | Historique tests plagiat thèmes |
| GET/POST | `/api/documents/` | Mémoires |
| POST | `/api/documents/<id>/soumettre/` | Soumettre un mémoire |
| POST | `/api/plagiarism/lancer/<id>/` | Tester plagiat d'un mémoire |
| GET | `/api/plagiarism/` | Historique tests plagiat mémoires |
| GET/PUT | `/api/parametres/` | Paramètres système |
| GET/POST | `/api/bibliotheque/` | Bibliothèque de ressources |
| POST | `/api/bibliotheque/<id>/toggle/` | Activer/désactiver une ressource |
| GET | `/api/notifications/` | Notifications |

---

## Structure du projet

```
anti-plagiat/
├── backend/
│   ├── users/          # Auth custom, rôles, INE
│   ├── themes/         # Thèmes de mémoire
│   ├── documents/      # Mémoires PDF
│   ├── plagiarism/     # Moteur TF-IDF + OCR
│   ├── validation/     # Historique validations
│   ├── notifications/  # Alertes
│   ├── parametres/     # Config dynamique
│   ├── bibliotheque/   # Ressources de référence
│   └── config/         # Settings Django
├── frontend/
│   └── src/
│       ├── pages/      # Dashboard, Thèmes, Documents, ...
│       └── components/ # PrivateRoute, Icons
├── docker-compose.yml
├── ROADMAP.md
└── README.md
```

---

## Variables d'environnement

| Variable | Description | Défaut |
|---|---|---|
| `SECRET_KEY` | Clé secrète Django | *(obligatoire)* |
| `DEBUG` | Mode debug | `True` |
| `ALLOWED_HOSTS` | Hôtes autorisés | `localhost,127.0.0.1` |
| `DB_ENGINE` | Backend base de données | `sqlite3` |
| `DB_NAME` | Nom de la base | `db.sqlite3` |
| `DB_USER` | Utilisateur DB | *(vide)* |
| `DB_PASSWORD` | Mot de passe DB | *(vide)* |
| `DB_HOST` | Hôte DB | *(vide)* |
| `DB_PORT` | Port DB | *(vide)* |
| `TESSERACT_CMD` | Chemin Tesseract (Windows) | *(dans le PATH sous Linux)* |
| `POPPLER_PATH` | Chemin Poppler (Windows) | *(dans le PATH sous Linux)* |
