# ScholarCheck — Système de Détection de Plagiat

Plateforme web de détection de plagiat pour mémoires et thèmes académiques.  
Stack : Django 6 · Django REST Framework · React 19 · PostgreSQL · Docker

---

## Fonctionnalités

- Dépôt et gestion de mémoires (PDF) et de thèmes
- Détection de plagiat par TF-IDF + similarité cosinus, optimisée pour le français
- OCR automatique pour les PDFs scannés (Tesseract + pdf2image)
- Extraction automatique du thème, auteur et année depuis les PDFs importés
- Pré-remplissage automatique du titre du mémoire à l'upload du PDF
- Analyse détaillée : source suspectée + passages suspects côte à côte
- Historique complet des tests de plagiat par document/thème
- Workflow de validation thèmes : Étudiant → Chef de département
- Workflow de validation mémoires : Étudiant → Chef de département → Directeur Adjoint
- Thème validé automatiquement associé au mémoire (pas de sélection manuelle)
- Bibliothèque de ressources : ajout par paires thème + mémoire liés
- Paramètres système configurables (seuil de plagiat, règles bibliothèque)
- Notifications à chaque étape du workflow
- Gestion des utilisateurs avec rôles et INE auto-généré pour les étudiants

---

## Rôles

| Rôle | Accès |
|---|---|
| `superadmin` | Tout (utilisateurs, paramètres, bibliothèque, validation thèmes) |
| `directeur` | Validation finale mémoires, bibliothèque, paramètres |
| `chef` | Validation thèmes et mémoires (1ère étape), test plagiat |
| `etudiant` | Dépôt thème/mémoire, test plagiat, soumission |

---

## Comptes de test (après init)

| Rôle | Email | Mot de passe |
|---|---|---|
| Super Admin | admin@scholarcheck.com | admin1234 |
| Directeur Adjoint | da@scholarcheck.com | dada1234 |
| Chef de département | chefdep@scholarcheck.com | chefdep1234 |
| Étudiant | etud@scholarcheck.com | etud1234 |

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
# Laisser vide sous Docker/Linux (Tesseract et Poppler dans le PATH)
TESSERACT_CMD=
POPPLER_PATH=
```

Pour générer une `SECRET_KEY` :

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 3. Lancer avec Docker

```bash
docker-compose up --build
```

Le backend applique automatiquement les migrations au démarrage.

- Frontend : http://localhost:3000
- Backend API : http://localhost:8000
- Admin Django : http://localhost:8000/admin

### 4. Initialiser la base (migrations + comptes de test)

```bash
docker-compose exec backend sh /app/init_db.sh
```

---

## Lancement sans Docker

### Dev local Windows

```bash
# Démarrer uniquement PostgreSQL
docker-compose up db -d

# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Dans `backend/.env`, adapter :

```env
DB_HOST=localhost
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
POPPLER_PATH=C:\poppler\poppler-25.12.0\Library\bin
```

```bash
# Initialiser (migrations + comptes de test)
init_local.bat

# Lancer
python manage.py runserver
```

### Dev local Linux / macOS

```bash
# Dépendances système
sudo apt-get install -y tesseract-ocr tesseract-ocr-fra poppler-utils  # Debian/Ubuntu
# brew install tesseract poppler  # macOS

# Démarrer PostgreSQL
docker compose up db -d

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Éditer .env : DB_HOST=localhost, laisser TESSERACT_CMD et POPPLER_PATH vides

python manage.py migrate
sh init_db.sh
python manage.py runserver
```

### Frontend (tous OS)

```bash
cd frontend
npm install
npm start
```

---

## Lancer les tests

```bash
# Avec Docker
docker-compose exec backend python manage.py test plagiarism documents themes

# En local
cd backend
python manage.py test plagiarism documents themes
```

---

## Scripts utilitaires

| Script | Description |
|---|---|
| `init_local.bat` | Windows — migrations + comptes de test + paramètres |
| `backend/init_db.sh` | Linux/Docker — même chose |
| `migrate.bat` | Windows — makemigrations + migrate toutes les apps |

---

## API — Endpoints principaux

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/token/` | Obtenir un token JWT |
| POST | `/api/token/refresh/` | Rafraîchir le token |
| GET | `/api/users/me/` | Profil utilisateur connecté |
| GET/POST | `/api/users/` | Gestion utilisateurs |
| GET/POST | `/api/themes/` | Thèmes |
| POST | `/api/themes/<id>/soumettre/` | Soumettre un thème |
| POST | `/api/plagiarism/lancer-theme/<id>/` | Tester plagiat d'un thème |
| GET | `/api/plagiarism/themes/` | Historique tests plagiat thèmes |
| GET/POST | `/api/documents/` | Mémoires |
| POST | `/api/documents/extraire-infos/` | Extraire titre/auteur/année d'un PDF |
| POST | `/api/documents/<id>/soumettre/` | Soumettre un mémoire |
| POST | `/api/plagiarism/lancer/<id>/` | Tester plagiat d'un mémoire |
| GET | `/api/plagiarism/` | Historique tests plagiat mémoires |
| GET/PUT | `/api/parametres/` | Paramètres système |
| GET | `/api/parametres/valeur/<cle>/` | Valeur d'un paramètre |
| GET/POST | `/api/bibliotheque/` | Bibliothèque de ressources |
| POST | `/api/bibliotheque/ajouter-paire/` | Ajouter thème + mémoire liés |
| POST | `/api/bibliotheque/extraire-infos/` | Extraire infos d'un PDF |
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
│   ├── plagiarism/     # Moteur TF-IDF + OCR + analyse passages
│   ├── validation/     # Historique validations
│   ├── notifications/  # Alertes
│   ├── parametres/     # Config dynamique
│   ├── bibliotheque/   # Ressources de référence + extraction PDF
│   ├── config/         # Settings Django
│   ├── init_db.sh      # Script init Linux/Docker
│   ├── init_users.py   # Création comptes de test
│   ├── init_params.py  # Paramètres par défaut
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/      # Dashboard, Thèmes, Documents, Bibliothèque...
│       └── components/ # PrivateRoute, Icons, HistoriqueTests
├── docker-compose.yml
├── init_local.bat      # Script init Windows
├── migrate.bat         # Script migrations Windows
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
| `DB_ENGINE` | Backend base de données | `postgresql` |
| `DB_NAME` | Nom de la base | `anti_plagiat` |
| `DB_USER` | Utilisateur DB | `postgres` |
| `DB_PASSWORD` | Mot de passe DB | `postgres` |
| `DB_HOST` | Hôte DB (`db` sous Docker, `localhost` en local) | `db` |
| `DB_PORT` | Port DB | `5432` |
| `TESSERACT_CMD` | Chemin Tesseract (Windows uniquement) | *(PATH sous Linux)* |
| `POPPLER_PATH` | Chemin Poppler (Windows uniquement) | *(PATH sous Linux)* |

---

## Compatibilité

| Composant | Version |
|---|---|
| Python | 3.11+ |
| Django | 5.x+ |
| Node.js | 18+ |
| PostgreSQL | 15 |
| Docker Compose | v2 (`docker compose`) |
