# Notes pour la rédaction du rapport — ScholarCheck

## 1. Présentation du projet

**Nom du projet :** ScholarCheck  
**Type :** Plateforme web de détection de plagiat pour mémoires et thèmes académiques  
**Contexte :** Projet développé dans le cadre d'un stage / projet académique à l'IBAM (Institut Burkinabè des Arts et Métiers) / UJKZ

**Problématique :** Détecter automatiquement le plagiat dans les mémoires de fin d'études déposés par les étudiants, en tenant compte des spécificités des documents académiques burkinabè (structure IBAM, langue française).

---

## 2. Stack technique

| Composant | Technologie | Version |
|---|---|---|
| Backend | Django + Django REST Framework | Django 5.1+ |
| Authentification | JWT (SimpleJWT) | access 2h / refresh 7j |
| Base de données | PostgreSQL | 15 |
| Frontend | React | 19 |
| Conteneurisation | Docker + Docker Compose | v2 |
| OCR | Tesseract + pdf2image (Poppler) | tesseract-ocr-fra |
| Moteur NLP | scikit-learn (TF-IDF) + NLTK | — |
| Extraction PDF | PyPDF2 | — |

**Dépendances backend (requirements.txt) :**
```
django, djangorestframework, djangorestframework-simplejwt,
django-cors-headers, psycopg2-binary, PyPDF2, pdf2image,
pytesseract, Pillow, scikit-learn, nltk, python-decouple
```

---

## 3. Architecture du projet

```
anti-plagiat/
├── backend/
│   ├── users/          → Auth custom, rôles, INE auto-généré
│   ├── themes/         → Gestion des thèmes de mémoire
│   ├── documents/      → Mémoires PDF (upload, statut, validation)
│   ├── plagiarism/     → Moteur TF-IDF + OCR + analyse passages suspects
│   ├── validation/     → Historique des validations
│   ├── notifications/  → Alertes automatiques
│   ├── parametres/     → Configuration dynamique du système
│   ├── bibliotheque/   → Ressources de référence + extraction PDF
│   └── config/         → Settings Django
├── frontend/
│   └── src/
│       ├── pages/      → Dashboard, Thèmes, Documents, Bibliothèque, etc.
│       └── components/ → PrivateRoute, Icons, HistoriqueTests
└── docker-compose.yml
```

**Pattern :** API REST (backend) + SPA (frontend), communication via JWT.

---

## 4. Modèle de données (entités principales)

### User
- Champs : `email` (identifiant unique), `nom`, `role`, `ine`
- Rôles : `superadmin`, `directeur`, `chef`, `etudiant`
- INE auto-généré pour les étudiants : format `N01{année}{compteur:05d}`
- Authentification par email (USERNAME_FIELD = 'email')

### Theme
- Champs : `titre`, `description`, `etudiant (FK)`, `statut`, `taux_plagiat`
- Statuts : `brouillon → soumis → valide / rejete`
- Validation double : `valide_par_chef` + `valide_par_directeur`

### Document (Mémoire)
- Champs : `titre`, `fichier (PDF)`, `theme (OneToOne)`, `etudiant (FK)`, `statut`, `taux_plagiat`
- Statuts : `brouillon → soumis → valide_chef → valide` (avec rejets possibles)
- Relation OneToOne avec Theme : un thème = au plus un mémoire

### TestPlagiat / TestPlagiatTheme
- Champs : `taux_plagiat`, `source_titre`, `phrases_suspectes (JSON)`, `date_test`
- Historique complet des tests par document/thème

### Parametre
- Clé/valeur configurable : `seuil_plagiat`, `ajout_auto_bibliotheque`, marqueurs, stopwords, regex

### Ressource (Bibliothèque)
- Champs : `titre`, `fichier`, `type` (mémoire/thème), `auteur`, `annee`, `actif`

---

## 5. Moteur de détection de plagiat

### Algorithme principal
1. **Extraction du texte** : PyPDF2 en premier, OCR (Tesseract) en fallback pour les PDFs scannés
2. **Nettoyage du texte** :
   - Troncature à la zone utile (entre `INTRODUCTION` et `BIBLIOGRAPHIE`)
   - Suppression du bloc IBAM (présentation structure de formation)
   - Suppression du bruit structurel (numéros de page, titres, légendes figures/tableaux)
3. **Vectorisation TF-IDF** :
   - `ngram_range=(1,2)` — unigrammes + bigrammes
   - Stopwords français (NLTK) + stopwords métier IBAM + stopwords forcés
   - `strip_accents='unicode'`
4. **Similarité cosinus** entre le document testé et le corpus (bibliothèque + documents validés)
5. **Identification des passages suspects** : re-vectorisation phrase par phrase, top 5 passages les plus similaires avec leur correspondance dans la source

### Résultat retourné
```python
{
  'taux': float,           # % de similarité avec la source la plus proche
  'source_titre': str,     # titre du document source le plus similaire
  'phrases_suspectes': [   # liste des passages suspects
    {
      'phrase': str,
      'passage_source': str,
      'similarite': float  # en %
    }
  ]
}
```

### Paramètres configurables (via interface admin)
- `seuil_plagiat` : seuil d'alerte (défaut 20%)
- `plagiat_marqueurs_debut` / `plagiat_marqueurs_fin` : délimiteurs de zone utile
- `plagiat_bloc_debut` / `plagiat_bloc_fin` : blocs à exclure
- `plagiat_stopwords_metier` : mots métier à ignorer
- `plagiat_regex_exclusion_custom` : regex personnalisées

---

## 6. Workflow métier

### Workflow Thème
```
Étudiant crée → brouillon
Étudiant soumet → soumis
Chef valide/rejette → valide / rejete
```

### Workflow Mémoire
```
Étudiant crée (thème validé requis) → brouillon
Étudiant soumet → soumis
Chef valide/rejette → valide_chef / rejete_chef
Directeur Adjoint valide/rejette → valide / rejete
(Resoumission possible après rejet)
```

### Ajout automatique à la bibliothèque
Après validation finale d'un mémoire, une copie physique du PDF est ajoutée à la bibliothèque de référence (si `ajout_auto_bibliotheque = true`).

---

## 7. Gestion des rôles et permissions

| Rôle | Droits |
|---|---|
| `superadmin` | Tout : utilisateurs, paramètres, bibliothèque, validation |
| `directeur` | Validation finale, bibliothèque, paramètres |
| `chef` | Validation intermédiaire, test plagiat |
| `etudiant` | Dépôt thème/mémoire, test plagiat, soumission |

---

## 8. API REST — Endpoints principaux

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/token/` | Authentification JWT |
| POST | `/api/token/refresh/` | Rafraîchissement token |
| GET | `/api/users/me/` | Profil connecté |
| GET/POST | `/api/users/` | CRUD utilisateurs |
| GET/POST | `/api/themes/` | CRUD thèmes |
| POST | `/api/themes/<id>/soumettre/` | Soumettre un thème |
| POST | `/api/plagiarism/lancer-theme/<id>/` | Tester plagiat thème |
| GET/POST | `/api/documents/` | CRUD mémoires |
| POST | `/api/documents/<id>/soumettre/` | Soumettre un mémoire |
| POST | `/api/plagiarism/lancer/<id>/` | Tester plagiat mémoire |
| GET | `/api/plagiarism/` | Historique tests mémoires |
| GET | `/api/plagiarism/themes/` | Historique tests thèmes |
| GET/PUT | `/api/parametres/` | Paramètres système |
| GET/POST | `/api/bibliotheque/` | Bibliothèque de ressources |
| POST | `/api/bibliotheque/extraire-infos/` | Extraction infos PDF |
| GET | `/api/notifications/` | Notifications |

---

## 9. Déploiement (Docker)

**Services docker-compose :**
- `backend` : Django (port 8000) — attend que `db` soit healthy
- `frontend` : React (port 3000)
- `db` : PostgreSQL 15 (port 5432) avec healthcheck

**Variables d'environnement clés :**
- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `TESSERACT_CMD`, `POPPLER_PATH` (vides sous Linux/Docker, chemins Windows en dev local)

**Accès :**
- Frontend : http://localhost:3000
- API : http://localhost:8000
- Admin Django : http://localhost:8000/admin

---

## 10. Tests automatisés

**44 cas de test couvrant :**
- Moteur plagiat (8 cas) : identique, vide, corpus vide, partiel, source_titre, phrases_suspectes, plusieurs sources
- Nettoyage texte (4 cas) : vide, numéros, en-têtes IBAM, légendes
- API TestPlagiat mémoires (6 cas) : liste, authentification, persistance, accès interdit
- API TestPlagiatTheme (7 cas) : avec/sans corpus, accès interdit, historique
- Flux document (11 cas) : création, double, soumission, validation/rejet chef et DA
- Flux thème (12 cas) : création, soumission, validation/rejet, resoumission, notifications

```bash
python manage.py test plagiarism documents themes
```

---

## 11. Fonctionnalités notables à mettre en avant

- **OCR automatique** : les PDFs scannés sont traités via Tesseract (langue française), sans intervention manuelle
- **Extraction automatique des métadonnées PDF** : titre, auteur, année extraits intelligemment depuis le contenu du PDF (patterns `THEME :`, `Présenté par`, premier `20XX`)
- **Paramétrage dynamique** : tous les seuils, marqueurs et stopwords sont modifiables depuis l'interface sans redéploiement
- **Vue côte à côte** : les passages suspects sont affichés avec leur correspondance dans le document source
- **INE auto-généré** : format `N01{année}{compteur}` attribué automatiquement à chaque étudiant
- **Compatibilité multi-OS** : scripts d'initialisation distincts pour Windows (`init_local.bat`) et Linux/Docker (`init_db.sh`)

---

## 12. État d'avancement

| Phase | Description | Statut |
|---|---|---|
| 1 | Backend API REST | ✅ Terminée |
| 2 | Frontend React | ✅ Terminée |
| 3 | Moteur plagiat avancé (OCR + TF-IDF) | ✅ Terminée |
| 4 | Paramètres système | ✅ Terminée |
| 5 | Bibliothèque de ressources | ✅ Terminée |
| 6 | Workflow métier mémoire/thème | ✅ Terminée |
| 7 | Docker & DevOps | ✅ Terminée |
| 8 | Tests automatisés | ✅ Terminée |
| 9 | Améliorations UX | ✅ Terminée |
| 10 | Déploiement production | 🔲 À faire |
