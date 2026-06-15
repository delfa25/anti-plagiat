# Diagrammes UML — ScholarCheck

> Tous les diagrammes sont en syntaxe **Mermaid**.  
> Visualisation : VS Code (extension Mermaid Preview), GitHub, ou https://mermaid.live

---

## 1. Diagramme de classes

```mermaid
classDiagram
    class User {
        +BigInt id
        +String email
        +String nom
        +String role
        +String ine
        +Boolean is_active
        +Boolean is_staff
        +Boolean is_superuser
        +DateTime date_joined
        +can_manage_users() bool
        +save()
        +generer_ine()
    }

    class Theme {
        +BigInt id
        +String titre
        +String description
        +String statut
        +Float taux_plagiat
        +Boolean valide_par_chef
        +Boolean valide_par_directeur
        +String commentaire_validation
        +DateTime date_soumission
    }

    class Document {
        +BigInt id
        +String titre
        +File fichier
        +String statut
        +Float taux_plagiat
        +String commentaire_validation
        +DateTime date_soumission
    }

    class TestPlagiat {
        +BigInt id
        +Float taux_plagiat
        +String source_titre
        +JSON phrases_suspectes
        +File rapport
        +DateTime date_test
    }

    class TestPlagiatTheme {
        +BigInt id
        +Float taux_plagiat
        +String source_titre
        +JSON phrases_suspectes
        +DateTime date_test
    }

    class Validation {
        +BigInt id
        +String statut
        +String commentaire
        +DateTime date_validation
    }

    class Notification {
        +BigInt id
        +String message
        +Boolean lu
        +DateTime date
    }

    class Ressource {
        +BigInt id
        +String titre
        +File fichier
        +String type
        +String auteur
        +Integer annee
        +String description
        +Boolean actif
        +DateTime date_ajout
    }

    class Parametre {
        +BigInt id
        +String cle
        +String valeur
        +String description
    }

    User "1" --> "0..*" Theme : etudiant (FK)
    User "1" --> "0..*" Document : etudiant (FK)
    User "1" --> "0..*" Notification : utilisateur (FK)
    User "1" --> "0..*" Validation : validateur (FK)
    User "1" --> "0..*" Ressource : ajoute_par (FK)

    Theme "1" --> "0..1" Document : theme (OneToOne)
    Theme "1" --> "0..*" TestPlagiatTheme : theme (FK)

    Document "1" --> "0..*" TestPlagiat : document (FK)
    Document "1" --> "0..*" Validation : document (FK)

    Ressource "1" --> "0..1" Ressource : ressource_liee (OneToOne)
```

---

## 2. Diagramme de cas d'utilisation

```mermaid
graph TD
    ETU([Étudiant])
    CHEF([Chef de département])
    DA([Directeur Adjoint])
    SA([Super Admin])

    subgraph Authentification
        UC1[Se connecter]
        UC2[Consulter son profil]
    end

    subgraph Gestion des thèmes
        UC3[Créer un thème]
        UC4[Modifier un thème]
        UC5[Soumettre un thème]
        UC6[Tester le plagiat d'un thème]
        UC7[Valider / Rejeter un thème]
    end

    subgraph Gestion des mémoires
        UC8[Déposer un mémoire PDF]
        UC9[Modifier un mémoire]
        UC10[Soumettre un mémoire]
        UC11[Tester le plagiat d'un mémoire]
        UC12[Voir zones similaires et suggestions]
        UC13[Valider / Rejeter un mémoire - Chef]
        UC14[Valider / Rejeter un mémoire - DA]
    end

    subgraph Bibliothèque
        UC15[Consulter la bibliothèque]
        UC16[Ajouter une ressource]
        UC17[Ajouter une paire thème + mémoire]
        UC18[Activer / Désactiver une ressource]
        UC19[Extraire infos d'un PDF]
    end

    subgraph Administration
        UC20[Gérer les utilisateurs]
        UC21[Configurer les paramètres système]
        UC22[Consulter les notifications]
    end

    ETU --> UC1
    ETU --> UC2
    ETU --> UC3
    ETU --> UC4
    ETU --> UC5
    ETU --> UC6
    ETU --> UC8
    ETU --> UC9
    ETU --> UC10
    ETU --> UC11
    ETU --> UC12
    ETU --> UC15
    ETU --> UC22

    CHEF --> UC1
    CHEF --> UC6
    CHEF --> UC7
    CHEF --> UC11
    CHEF --> UC12
    CHEF --> UC13
    CHEF --> UC15
    CHEF --> UC22

    DA --> UC1
    DA --> UC14
    DA --> UC15
    DA --> UC16
    DA --> UC17
    DA --> UC18
    DA --> UC19
    DA --> UC21
    DA --> UC22

    SA --> UC1
    SA --> UC20
    SA --> UC21
    SA --> UC15
    SA --> UC16
    SA --> UC17
    SA --> UC18
    SA --> UC19
    SA --> UC22
```

---

## 3. Diagramme d'activité — Processus complet de soumission d'un mémoire

```mermaid
flowchart TD
    A([Début]) --> B[Étudiant crée un thème]
    B --> C[Étudiant teste le plagiat du thème]
    C --> D{Taux thème > seuil ?}
    D -- Oui --> E[Étudiant révise le thème]
    E --> C
    D -- Non --> F[Étudiant soumet le thème]
    F --> G[Notification envoyée aux chefs]
    G --> H{Chef valide le thème ?}
    H -- Rejet --> I[Notification envoyée à l'étudiant]
    I --> J[Étudiant modifie le thème]
    J --> F
    H -- Validation --> K[Notification envoyée à l'étudiant]
    K --> L[Étudiant dépose le mémoire PDF]
    L --> M[Extraction automatique du titre]
    M --> N[Étudiant lance le test de plagiat]
    N --> O[Notification résultat envoyée à l'étudiant]
    O --> P{Taux mémoire > seuil ?}
    P -- Oui --> Q[Affichage zones similaires + suggestions]
    Q --> R[Étudiant révise le mémoire]
    R --> L
    P -- Non --> S[Étudiant soumet le mémoire]
    S --> T[Notification envoyée aux chefs]
    T --> U{Chef valide le mémoire ?}
    U -- Rejet --> V[Notification envoyée à l'étudiant]
    V --> W[Étudiant corrige et resoumet]
    W --> S
    U -- Validation --> X[Notification envoyée au DA + à l'étudiant]
    X --> Y{Directeur Adjoint valide ?}
    Y -- Rejet --> Z[Notification envoyée à l'étudiant]
    Z --> W
    Y -- Validation --> AA[Mémoire validé définitivement]
    AA --> AB{ajout_auto_bibliotheque = true ?}
    AB -- Oui --> AC[Copie PDF ajoutée à la bibliothèque]
    AB -- Non --> AD([Fin])
    AC --> AD
```

---

## 4. Diagramme d'activité — Moteur de détection de plagiat

```mermaid
flowchart TD
    A([Début]) --> B[Réception du fichier PDF]
    B --> C[Extraction texte via PyPDF2]
    C --> D{Texte extrait ?}
    D -- Non / PDF scanné --> E[OCR via Tesseract - langue française]
    E --> F[Texte brut OCR]
    D -- Oui --> F2[Texte brut natif]
    F --> G[Nettoyage du texte]
    F2 --> G
    G --> G1[Troncature zone utile
INTRODUCTION à BIBLIOGRAPHIE]
    G1 --> G2[Suppression bloc IBAM
structure de formation]
    G2 --> G3[Suppression bruit structurel
numéros, titres, légendes]
    G3 --> H[Vectorisation TF-IDF
ngram 1-2, stopwords FR + métier]
    H --> I[Calcul similarité cosinus
avec corpus de référence]
    I --> J[Identification source la plus similaire]
    J --> K{Taux > seuil ?}
    K -- Non --> L[Retourne taux + source_titre + liste vide]
    K -- Oui --> M[Extraction passages suspects
Top 5 phrases score > 10%]
    M --> N[Filtrage titres de section
faux positifs]
    N --> O[Correspondance passage source
par re-vectorisation locale]
    O --> P[Retourne taux + source_titre
+ phrases_suspectes]
    L --> Q([Fin])
    P --> Q
```

---

## 5. Diagramme d'activité — Gestion de la bibliothèque

```mermaid
flowchart TD
    A([Début]) --> B{Source d'ajout ?}

    B -- Manuel --> C[Admin upload PDF]
    C --> D[Extraction automatique infos PDF
titre, auteur, année]
    D --> E[Pré-remplissage formulaire]
    E --> F{Ajout simple ou paire ?}
    F -- Paire thème + mémoire --> G[Création atomique des deux ressources liées]
    F -- Ressource seule --> H[Création ressource individuelle]
    G --> I[Ressources actif=true]
    H --> I

    B -- Automatique après validation mémoire --> J{ajout_auto_bibliotheque = true ?}
    J -- Non --> Z([Fin])
    J -- Oui --> K{Ressource déjà existante ?}
    K -- Oui --> Z
    K -- Non --> L[Copie physique du PDF]
    L --> M[Ressource type=memoire créée]
    M --> Z

    B -- Automatique après validation thème --> N{ajout_auto_bibliotheque = true ?}
    N -- Non --> Z
    N -- Oui --> O{Ressource déjà existante ?}
    O -- Oui --> Z
    O -- Non --> P[Ressource type=theme créée
sans fichier, avec description]
    P --> Z

    I --> Q[Ressource disponible dans le corpus plagiat]
    Q --> Z
```

---

## 6. Diagramme de séquence — Dépôt et test de plagiat d'un mémoire

```mermaid
sequenceDiagram
    actor Étudiant
    participant Frontend
    participant API
    participant DB
    participant MoteurPlagiat

    Étudiant->>Frontend: Upload PDF mémoire
    Frontend->>API: POST /api/documents/extraire-infos/
    API->>MoteurPlagiat: PyPDF2 lecture 3 premières pages
    MoteurPlagiat-->>API: titre, auteur, année extraits
    API-->>Frontend: Pré-remplissage formulaire

    Étudiant->>Frontend: Confirme et enregistre
    Frontend->>API: POST /api/documents/
    API->>DB: Vérifie thème validé de l'étudiant
    DB-->>API: Thème OK
    API->>DB: Crée Document statut=brouillon
    API-->>Frontend: 201 Document

    Étudiant->>Frontend: Lancer test plagiat
    Frontend->>API: POST /api/plagiarism/lancer/id/
    API->>DB: Récupère documents validés + bibliothèque actifs
    DB-->>API: Corpus de référence
    API->>MoteurPlagiat: extraire_texte_pdf(fichier)
    MoteurPlagiat-->>API: Texte nettoyé
    API->>MoteurPlagiat: calculer_taux_plagiat(texte, corpus)
    Note over MoteurPlagiat: TF-IDF + cosine similarity
    MoteurPlagiat-->>API: taux, source_titre, phrases_suspectes
    API->>DB: Crée TestPlagiat
    API->>DB: Met à jour taux_plagiat du Document
    API->>DB: Crée Notification pour l'étudiant
    API-->>Frontend: 201 TestPlagiat
    Frontend-->>Étudiant: Taux + zones similaires côte à côte
```

---

## 7. Diagramme de séquence — Workflow de validation d'un mémoire

```mermaid
sequenceDiagram
    actor Étudiant
    actor Chef
    actor DirecteurAdjoint
    participant API
    participant DB

    Étudiant->>API: POST /api/documents/id/soumettre/
    API->>DB: statut = soumis
    API->>DB: Notification → Étudiant
    API->>DB: Notification → tous les Chefs
    API-->>Étudiant: statut soumis

    Chef->>API: PATCH /api/documents/id/ statut=valide_chef
    API->>DB: statut = valide_chef
    API->>DB: Notification → Étudiant
    API->>DB: Notification → tous les Directeurs Adjoints
    API-->>Chef: Document mis à jour

    alt Rejet par le Chef
        Chef->>API: PATCH statut=rejete_chef + commentaire
        API->>DB: statut = rejete_chef
        API->>DB: Notification → Étudiant avec commentaire
        Étudiant->>API: PATCH nouveau fichier
        Étudiant->>API: POST soumettre à nouveau
    end

    DirecteurAdjoint->>API: PATCH /api/documents/id/ statut=valide
    API->>DB: statut = valide
    API->>DB: Notification → Étudiant
    API->>DB: Copie PDF → Bibliothèque si ajout_auto=true
    API-->>DirecteurAdjoint: Document validé

    alt Rejet par le DA
        DirecteurAdjoint->>API: PATCH statut=rejete + commentaire
        API->>DB: statut = rejete
        API->>DB: Notification → Étudiant
    end
```

---

## 8. Diagramme de séquence — Authentification JWT

```mermaid
sequenceDiagram
    actor Utilisateur
    participant Frontend
    participant API

    Utilisateur->>Frontend: Saisit email + mot de passe
    Frontend->>API: POST /api/token/
    API-->>Frontend: access (2h) + refresh (7j)
    Frontend->>Frontend: Stocke tokens dans localStorage

    loop Chaque requête authentifiée
        Frontend->>API: GET /api/... Authorization Bearer access
        API-->>Frontend: Données
    end

    Note over Frontend,API: Token access expiré
    Frontend->>API: POST /api/token/refresh/ avec refresh token
    API-->>Frontend: Nouveau access token
    Frontend->>Frontend: Met à jour localStorage

    Note over Frontend,API: Refresh token expiré
    Frontend->>Frontend: localStorage.clear()
    Frontend->>Frontend: Redirection vers /login
```
