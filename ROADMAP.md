# 🗺️ ROADMAP — ScholarCheck (Système de Détection de Plagiat)

---

## ✅ PHASE 1 — Backend API REST (Terminée)
- [x] Modèles, Serializers, Views, URLs
- [x] JWT + CORS (access 2h, refresh 7j)
- [x] Détection plagiat TF-IDF + cosine similarity
- [x] Notifications automatiques à chaque étape
- [x] Workflow documents et thèmes

---

## ✅ PHASE 2 — Frontend React (Terminée)
- [x] Auth (Login, PrivateRoute, refresh token automatique)
- [x] Dashboard par rôle (superadmin, directeur, chef, etudiant)
- [x] Gestion utilisateurs (CRUD, filtres, INE) — champ `nom` unique (nom + prénoms)
- [x] Thèmes (création, test plagiat, soumission, validation)
- [x] Mémoires (upload, test plagiat, soumission, validation)
- [x] Notifications (badge, marquer lu, filtres)

---

## ✅ PHASE 3 — Moteur de plagiat avancé (Terminée)

### OCR pour PDFs scannés ✅
- [x] pytesseract + pdf2image + Tesseract
- [x] Pack langue française (`tesseract-ocr-fra`)
- [x] `extraire_texte_pdf()` : PyPDF2 natif d'abord, OCR en fallback
- [x] Gestion `InMemoryUploadedFile` (fichiers en mémoire)

### Optimisation TF-IDF pour le français ✅
- [x] nltk + stopwords français + stopwords métier IBAM
- [x] `ngram_range=(1,2)` — unigrammes + bigrammes
- [x] Nettoyage structurel : blocs IBAM, titres numérotés, légendes, en-têtes

### Analyse détaillée des passages suspects ✅
- [x] `calculer_taux_plagiat()` retourne `{taux, source_titre, phrases_suspectes}`
- [x] Identification du document source le plus similaire
- [x] Extraction des passages suspects avec score de similarité
- [x] Passage correspondant dans le document source (vue côte à côte)
- [x] Filtrage des titres de section (faux positifs)

### Test plagiat sur les thèmes ✅
- [x] `LancerTestPlagiatThemeView`
- [x] `/api/plagiarism/lancer-theme/<theme_id>/`
- [x] Corpus thèmes = thèmes validés + ressources bibliothèque type `theme`

---

## ✅ PHASE 4 — Paramètres système (Terminée)
- [x] Modèle `Parametre` (`cle`, `valeur`, `description`)
- [x] `seuil_plagiat` (défaut: 20%)
- [x] `ajout_auto_bibliotheque` (défaut: false)
- [x] `ajout_manuel_bibliotheque` (défaut: true)
- [x] Paramètres filtres plagiat configurables (marqueurs début/fin, blocs, stopwords, regex)
- [x] GET `/api/parametres/valeur/<cle>/` — lecture d'un paramètre
- [x] Frontend : page Paramètres avec modification en temps réel

---

## ✅ PHASE 5 — Bibliothèque de ressources (Terminée)
- [x] Modèle `Ressource` (titre, fichier, type, auteur, annee, actif)
- [x] CRUD `/api/bibliotheque/` (superadmin + directeur)
- [x] Ajout automatique après validation finale (copie physique du PDF)
- [x] Ajout automatique des thèmes validés (titre + description)
- [x] Extraction automatique infos PDF : `/api/bibliotheque/extraire-infos/`
  - Thème/titre extrait intelligemment (patterns `THEME :`, heuristique)
  - Auteur extrait (`Présenté par`, `Réalisé par`...)
  - Année extraite (premier `20XX` trouvé)
- [x] Frontend : pré-remplissage automatique des champs à l'upload
- [x] Affichage nom du fichier + taille lors de la sélection

---

## ✅ PHASE 6 — Workflow métier mémoire/thème (Terminée)
- [x] Un thème → au plus un mémoire (OneToOne)
- [x] Vérification thème validé avant création d'un mémoire
- [x] Flux mémoire : `brouillon → soumis → valide_chef → valide`
- [x] Resoumission après rejet chef ou DA
- [x] Flux thème : `brouillon → soumis → valide/rejete`
- [x] Notifications à chaque transition de statut

---

## ✅ PHASE 7 — Docker & DevOps (Terminée)
- [x] `docker-compose.yml` (backend + frontend + db + healthcheck PostgreSQL)
- [x] Dockerfile backend : Tesseract + Poppler + toutes dépendances NLP
- [x] Dockerfile frontend : ordre `npm install` avant `COPY` (compatibilité Linux)
- [x] `requirements.txt` complet
- [x] `.env.example` documenté
- [x] Chemins OCR externalisés via variables d'environnement
- [x] `DEFAULT_AUTO_FIELD = BigAutoField` — warnings W042 supprimés
- [x] `init_db.sh` — script Linux/Docker : migrations + comptes + paramètres
- [x] `init_local.bat` — script Windows complet (venv, deps, migrations, comptes)
- [x] `migrate.bat` — script Windows migrations seules
- [x] Compatible Linux/macOS/Windows

---

## ✅ PHASE 8 — Tests automatisés (Terminée)
- [x] Compatibilité Django 6 + Python 3.14 vérifiée
- [x] Tests moteur plagiat (8 cas) : identique, vide, corpus vide, différents, partiel, source_titre, phrases_suspectes, plusieurs sources
- [x] Tests nettoyage texte (4 cas) : vide, numéros, en-têtes IBAM, légendes figures
- [x] Tests API TestPlagiat mémoires (6 cas) : liste étudiant/chef, non authentifié, persistance, document inexistant, accès interdit
- [x] Tests API TestPlagiatTheme (7 cas) : liste, sans corpus, avec corpus similaire, inexistant, accès interdit, chef, historique
- [x] Tests flux document (11 cas) : création, double, thème non validé, soumission, double soumission, validation chef, rejet chef, resoumission, validation DA, rejet DA, visibilité, suppression
- [x] Tests flux thème (12 cas) : création, double, sans description, soumission, double soumission, visibilité chef/étudiant, validation chef, rejet, modification rejeté, resoumission, modification interdite soumis/validé, suppression, notification

---

## ✅ PHASE 9 — Améliorations UX (Terminée)
- [x] Taux de plagiat affiché en grand sous le titre (rouge/vert selon seuil)
- [x] Historique des tests repliable par document/thème
- [x] Vue côte à côte : passages suspects document testé vs source
- [x] Score de similarité par passage (rouge ≥70%, orange ≥40%, jaune sinon)
- [x] Source suspectée affichée dans l'en-tête de chaque test
- [x] Composant `HistoriqueTests` partagé entre Documents et Thèmes

---

## 🚀 PHASE 10 — Améliorations détection & UX avancée (À faire)

### Visualisation zones similaires ✅ Planifié
- [ ] Affichage des passages suspects côte à côte (document testé vs source) quand taux > seuil
- [ ] Mise en surbrillance colorée des fragments similaires dans le texte
- [ ] Score de similarité par passage (rouge ≥70%, orange ≥40%, jaune sinon)
- [ ] Source suspectée affichée clairement avec son titre
- [ ] Panneau dépliable « Voir les zones similaires » accessible depuis l'historique des tests

### Suggestions de correction ✅ Planifié
- [ ] Génération automatique de suggestions de reformulation pour chaque passage suspect
- [ ] Affichage inline : passage original → suggestion reformulée
- [ ] Basé sur remplacement de synonymes + restructuration de phrases (NLP)
- [ ] Bouton « Copier la suggestion » pour faciliter la correction
- [ ] Indicateur visuel : passages corrigés vs non corrigés

### Refonte UI/UX layout (Terminé)
- [x] Suppression de `max-w-5xl` — les listes utilisent tout l'espace disponible
- [x] Layout 2 colonnes : liste à gauche + panneau détail/test à droite
- [x] Panneau de détail affichant zones similaires, passages suspects, source
- [x] Notifications ciblées par rôle : chef/DA pour soumissions, étudiant pour résultats

---

## 🚀 PHASE 11 — Déploiement (À faire)
- [ ] Choisir plateforme (Railway / Render / VPS Linux)
- [ ] `DEBUG=False` + `ALLOWED_HOSTS` production
- [ ] `STATIC_ROOT` + `collectstatic`
- [ ] Variables d'environnement production sécurisées
- [ ] Build frontend (`npm run build`)
- [ ] HTTPS (Nginx / Caddy)
- [ ] Déployer

---

## 📍 ÉTAT ACTUEL

> On est ici 👇

**Phases 1 à 9 terminées + Phase 10 (UI/UX + notifications ciblées) en cours.**

**Ce qui a été fait en Phase 10 :**
- Layout 2 colonnes : liste + panneau détail utilisant tout l'espace disponible
- Zones similaires affichées côte à côte (texte suspect vs source) quand taux > seuil
- Suggestions de reformulation inline par passage suspect
- Notifications ciblées : chef/DA alertés à la soumission, étudiant alerté aux résultats
- Serializers plagiat exposent `source_titre` et `phrases_suspectes`

**Prochaine étape : Phase 10 suite — Suggestions NLP avancées + Phase 11 Déploiement**

```
Commandes de démarrage rapide :

# Docker (recommandé)
cp backend/.env.example backend/.env
docker-compose up --build
docker-compose exec backend sh /app/init_db.sh

# Local Windows
docker-compose up db -d
init_local.bat
cd backend && python manage.py runserver

# Tests
python manage.py test plagiarism documents themes
```
