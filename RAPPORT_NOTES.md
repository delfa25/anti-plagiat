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

### User (`users.User` — hérite de `AbstractUser`)
- Champs : `email` (identifiant unique), `nom` (max 200), `role`, `ine`, `is_active`, `is_staff`, `is_superuser`, `date_joined`
- Champ `username` conservé mais optionnel (rempli automatiquement avec l'email)
- Rôles : `superadmin`, `directeur`, `chef`, `etudiant`
- INE auto-généré pour les étudiants : format `N01{année}{compteur:05d}` — généré dans `save()`
- Authentification par email (`USERNAME_FIELD = 'email'`)
- Propriété `can_manage_users` : vrai pour `superadmin` et `directeur`
- Manager custom `UserManager` avec `create_user` et `create_superuser`

### Theme (`themes.Theme`)
- Champs : `titre` (max 255), `description` (TextField), `etudiant` (FK User), `statut`, `taux_plagiat` (Float, défaut 0), `valide_par_chef` (Bool), `valide_par_directeur` (Bool), `commentaire_validation`, `date_soumission`
- Statuts : `brouillon → soumis → valide / rejete`
- Relation : `etudiant` FK vers `User` (`related_name='themes'`)

### Document (`documents.Document`) — Mémoire
- Champs : `titre` (max 255), `fichier` (FileField `upload_to='documents/'`), `theme` (OneToOne vers Theme), `etudiant` (FK User), `taux_plagiat` (Float, défaut 0), `statut`, `commentaire_validation`, `date_soumission`
- Statuts : `brouillon → soumis → valide_chef → valide` (rejets : `rejete_chef`, `rejete`)
- Contrainte forte : un thème = au plus un mémoire (OneToOne)
- Création impossible sans thème validé

### TestPlagiat (`plagiarism.TestPlagiat`)
- Champs : `document` (FK Document, `related_name='tests_plagiat'`), `taux_plagiat` (Float), `source_titre` (max 500, nullable), `phrases_suspectes` (JSONField, liste de `{phrase, passage_source, similarite}`), `rapport` (FileField, nullable), `date_test` (auto)
- Historique complet : plusieurs tests possibles par document

### TestPlagiatTheme (`plagiarism.TestPlagiatTheme`)
- Champs : `theme` (FK Theme, `related_name='tests_plagiat'`), `taux_plagiat` (Float), `source_titre` (max 500, nullable), `phrases_suspectes` (JSONField), `date_test` (auto)
- Corpus comparé : thèmes validés + ressources de type `theme` dans la bibliothèque

### Validation (`validation.Validation`)
- Champs : `document` (FK Document), `validateur` (FK User), `statut` (`valide` / `rejete`), `commentaire`, `date_validation` (auto)
- Historique des décisions de validation sur les mémoires

### Notification (`notifications.Notification`)
- Champs : `utilisateur` (FK User, `related_name='notifications'`), `message` (TextField), `lu` (Bool, défaut False), `date` (auto)
- Envoi ciblé par rôle :
  - Étudiant : résultat test plagiat, décision validation, confirmation soumission
  - Chef : nouveau thème soumis, nouveau mémoire soumis
  - Directeur Adjoint : mémoire validé par le chef (en attente validation finale)

### Parametre (`parametres.Parametre`)
- Champs : `cle` (max 100, unique), `valeur` (max 255), `description` (TextField)
- Clés prédéfinies : `seuil_plagiat` (défaut 20), `ajout_auto_bibliotheque`, `ajout_manuel_bibliotheque`, `plagiat_marqueurs_debut`, `plagiat_marqueurs_fin`, `plagiat_bloc_debut`, `plagiat_bloc_fin`, `plagiat_stopwords_metier`, `plagiat_regex_exclusion_custom`

### Ressource (`bibliotheque.Ressource`)
- Champs : `titre` (max 255), `fichier` (FileField `upload_to='bibliotheque/'`, nullable), `type` (`theme` / `memoire`), `auteur` (max 255, nullable), `annee` (Integer, nullable), `description` (nullable), `ajoute_par` (FK User, SET_NULL), `date_ajout` (auto), `actif` (Bool, défaut True), `ressource_liee` (OneToOne vers self, nullable)
- Liaison possible entre une ressource thème et une ressource mémoire (paire liée)
- Seules les ressources `actif=True` sont incluses dans le corpus plagiat

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

---

## 13. Diagrammes UML (voir DIAGRAMMES.md)

### Diagramme de classes — 9 classes

| Classe | App | Relations principales |
|---|---|---|
| `User` | `users` | hérite `AbstractUser` — source de toutes les FK |
| `Theme` | `themes` | FK `User` (etudiant) |
| `Document` | `documents` | OneToOne `Theme`, FK `User` (etudiant) |
| `TestPlagiat` | `plagiarism` | FK `Document` |
| `TestPlagiatTheme` | `plagiarism` | FK `Theme` |
| `Validation` | `validation` | FK `Document`, FK `User` (validateur) |
| `Notification` | `notifications` | FK `User` (utilisateur) |
| `Ressource` | `bibliotheque` | FK `User` (ajoute_par), OneToOne vers self (ressource_liee) |
| `Parametre` | `parametres` | aucune FK |

### Cas d'utilisation — 22 UC répartis par rôle

| Rôle | Cas d'utilisation |
|---|---|
| **Étudiant** | Se connecter, consulter profil, créer/modifier/soumettre/tester thème, déposer/modifier/soumettre/tester mémoire, voir zones similaires et suggestions, consulter bibliothèque, consulter notifications |
| **Chef** | Se connecter, tester plagiat thème, valider/rejeter thème, tester plagiat mémoire, valider/rejeter mémoire (1ère étape), voir zones similaires, consulter bibliothèque, consulter notifications |
| **Directeur Adjoint** | Se connecter, valider/rejeter mémoire (finale), CRUD bibliothèque, ajouter paire thème+mémoire, activer/désactiver ressource, extraire infos PDF, configurer paramètres, consulter notifications |
| **Super Admin** | Se connecter, gérer utilisateurs (CRUD), configurer paramètres, CRUD bibliothèque, ajouter paires, activer/désactiver ressource, extraire infos PDF, consulter notifications |

### Diagrammes d'activités — 3 processus

**1. Processus complet soumission mémoire**
```
Créer thème → Tester plagiat thème → Soumettre thème
  → [Notification chefs] → Chef valide/rejette
  → Déposer mémoire PDF (extraction titre auto)
  → Tester plagiat mémoire → [Notification étudiant]
  → Si taux > seuil : afficher zones similaires + suggestions → Réviser
  → Soumettre mémoire → [Notification chefs]
  → Chef valide/rejette → [Notification DA + étudiant]
  → DA valide/rejette → [Notification étudiant]
  → Si validé + ajout_auto=true : copie PDF → Bibliothèque
```

**2. Moteur de détection de plagiat**
```
Réception PDF → PyPDF2 extraction
  → Si vide : OCR Tesseract (langue fra)
  → Nettoyage : troncature zone utile + suppression bloc IBAM + bruit structurel
  → TF-IDF vectorisation (ngram 1-2, stopwords FR + métier)
  → Similarité cosinus vs corpus (documents validés + bibliothèque actifs)
  → Identification source principale
  → Si taux > seuil : extraction top 5 passages suspects + correspondance source
  → Retourne {taux, source_titre, phrases_suspectes}
```

**3. Gestion de la bibliothèque**
```
Ajout manuel :
  Upload PDF → Extraction auto (titre, auteur, année) → Pré-remplissage
  → Ressource seule OU paire thème+mémoire liés (transaction atomique)

Ajout automatique (post-validation mémoire) :
  ajout_auto=true ? → Ressource existante ? → Copie PDF → Ressource type=memoire

Ajout automatique (post-validation thème) :
  ajout_auto=true ? → Ressource existante ? → Ressource type=theme (sans fichier)
```

### Diagrammes de séquence — 3 flux

- **Dépôt et test plagiat** : extraction titre PDF → création document → test plagiat (TF-IDF) → notification étudiant → affichage résultat + zones similaires
- **Workflow validation mémoire** : soumission → notification chefs → chef décide → notification DA → DA décide → notification étudiant → ajout bibliothèque si auto
- **Authentification JWT** : login → access 2h + refresh 7j → intercepteur axios auto-refresh → logout si refresh expiré
