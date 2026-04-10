# 🗺️ ROADMAP — ScholarCheck (Système de Détection de Plagiat)

---

## ✅ PHASE 1 — Backend API REST (Terminée)
- [x] Modèles, Serializers, Views, URLs
- [x] JWT + CORS
- [x] Détection plagiat de base (TF-IDF + cosine similarity)
- [x] Notifications automatiques
- [x] Workflow documents et thèmes

---

## ✅ PHASE 2 — Frontend React (Terminée)
- [x] Auth (Login, PrivateRoute)
- [x] Dashboard par rôle (superadmin, directeur, chef, etudiant)
- [x] Gestion utilisateurs (CRUD, filtres, INE)
- [x] Thèmes (création, test plagiat, soumission, validation)
- [x] Mémoires (upload, test plagiat, soumission, validation)
- [x] Notifications (badge, marquer lu, filtres)

---

## ✅ PHASE 3 — Améliorations moteur de plagiat

### Étape 1 — OCR pour PDFs scannés ✅
- [x] pytesseract + pdf2image + Tesseract
- [x] Pack langue française
- [x] `extraire_texte_pdf()` : PyPDF2 d'abord, OCR en fallback

### Étape 2 — Optimisation TF-IDF pour le français ✅
- [x] nltk + stopwords français
- [x] `ngram_range=(1,2)`
- [x] Mise à jour `calculer_taux_plagiat()`

### Étape 3 — Base de comparaison intelligente ✅
- [x] Documents de référence: statut `valide`
- [x] Logique équivalente pour les thèmes

### Étape 4 — Test plagiat sur les thèmes ✅
- [x] `LancerTestPlagiatThemeView`
- [x] `/api/plagiarism/lancer-theme/<theme_id>/`
- [x] Bouton test plagiat côté frontend

---

## ✅ PHASE 4 — Paramètres système (Implémentée)

### Étape 1 — Modèle Paramètres ✅
- [x] App `parametres`
- [x] Modèle `Parametre` (`cle`, `valeur`, `description`)
- [x] Paramètres initiaux:
  - `seuil_plagiat` (défaut: 20)
  - `ajout_auto_bibliotheque` (défaut: false)
  - `ajout_manuel_bibliotheque` (défaut: true)

### Étape 2 — API Paramètres ✅
- [x] GET `/api/parametres/` (utilisateurs authentifiés)
- [x] PUT `/api/parametres/<cle>/` (superadmin + directeur)

### Étape 3 — Frontend Paramètres ✅
- [x] Page Paramètres dans le dashboard
- [x] Modification du seuil de plagiat
- [x] Activation/désactivation des paramètres bibliothèque
- [x] Affichage des descriptions

---

## ✅ PHASE 5 — Bibliothèque de ressources (Terminée)

### Étape 1 — Modèle Ressource ✅
- [x] Modèle `Ressource`:
  - `titre`
  - `fichier` (PDF)
  - `type` (`theme` / `memoire`)
  - `auteur`
  - `annee`
  - `ajoute_par`
  - `date_ajout`
  - `actif`

### Étape 2 — API Ressources ✅
- [x] CRUD `/api/bibliotheque/` (superadmin + directeur)
- [x] Endpoint activation/désactivation: `/api/bibliotheque/<id>/toggle/`
- [x] Ajout automatique après validation finale (selon paramètre)
- [x] Appliquer strictement le paramètre `ajout_manuel_bibliotheque` côté API

### Étape 3 — Intégration moteur de plagiat ✅
- [x] Ressources actives incluses dans la base de comparaison
- [x] Corpus = ressources actives + documents validés
- [x] Rendre le seuil de décision dynamique via `seuil_plagiat` dans les écrans concernés

### Étape 4 — Frontend Bibliothèque ✅
- [x] Page Bibliothèque dans le dashboard
- [x] Filtres (type, actif/inactif, recherche)
- [x] Ajouter / Modifier / Supprimer une ressource
- [x] Activer / Désactiver une ressource
- [x] Ouvrir le fichier PDF
- [x] Harmoniser les droits UI avec le paramètre `ajout_manuel_bibliotheque`

### Étape 5 — Finalisation ✅
- [x] Harmoniser le nommage API: alias `/api/ressources/` vers la bibliothèque
- [x] Stabiliser le comportement manuel/automatique bibliothèque selon paramètres

---

## 🔁 PHASE 6 — Workflow métier mémoire/thème (Alignement métier)

### Règles de relation ✅
- [x] Un thème peut avoir au plus un mémoire
- [x] Un mémoire appartient à un seul thème

### Flux mémoire cible (etat actuel + verrouillages) ✅
- [x] Étudiant crée un mémoire en `brouillon`
- [x] Le mémoire n'est pas soumis automatiquement
- [x] Étudiant peut lancer des tests de plagiat avant soumission
- [x] Étudiant soumet manuellement (`soumis`)
- [x] Chef voit après soumission, peut tester plagiat, puis valider/rejeter
- [x] Si validé chef: statut `valide_chef` (transmis DA)
- [x] DA peut consulter le taux existant ou relancer son propre test
- [x] DA valide/rejette définitivement (`valide`/`rejete`)

### Flux thème (rappel) ✅
- [x] Étudiant crée en brouillon puis teste
- [x] Étudiant soumet manuellement
- [x] Chef/DA valident selon le workflow en place

---

## 🐳 PHASE 7 — Docker & DevOps (Partielle)
- [x] `docker-compose.yml` présent (backend + frontend + db)
- [ ] Vérifier fonctionnement end-to-end
- [ ] Variables d'environnement (`.env`)
- [ ] Basculer backend runtime vers PostgreSQL (au lieu de SQLite)

---

## 🧪 PHASE 8 — Tests (À faire)
- [ ] Tests API automatisés (pytest ou Django/DRF tests)
- [ ] Tests upload fichiers
- [ ] Tests flux complet (étudiant → chef → DA)
- [ ] Tests moteur plagiat (PDF texte + PDF scanné)

---

## 🚀 PHASE 9 — Déploiement (À faire)
- [ ] Choisir plateforme (Railway / Render / VPS)
- [ ] Variables d'environnement production
- [ ] Build frontend
- [ ] Déployer

---

## 📍 ÉTAT ACTUEL

> On est ici 👇

**Priorité immédiate**
1. Lancer la campagne de tests de flux réel (étudiant → chef → DA)
2. Stabiliser Docker + PostgreSQL + `.env`
3. Préparer la phase déploiement
