# Diagrammes UML — ScholarCheck

> Tous les diagrammes sont en syntaxe **Mermaid**.  
> Visualisation : VS Code (extension Mermaid Preview), GitHub, ou https://mermaid.live

---

## 1. Diagramme de cas d'utilisation

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
        UC12[Valider / Rejeter un mémoire - Chef]
        UC13[Valider / Rejeter un mémoire - DA]
    end

    subgraph Bibliothèque
        UC14[Consulter la bibliothèque]
        UC15[Ajouter une ressource]
        UC16[Activer / Désactiver une ressource]
        UC17[Extraire infos d'un PDF]
    end

    subgraph Administration
        UC18[Gérer les utilisateurs]
        UC19[Configurer les paramètres système]
        UC20[Consulter les notifications]
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
    ETU --> UC14
    ETU --> UC20

    CHEF --> UC1
    CHEF --> UC6
    CHEF --> UC7
    CHEF --> UC11
    CHEF --> UC12
    CHEF --> UC14
    CHEF --> UC20

    DA --> UC1
    DA --> UC13
    DA --> UC14
    DA --> UC15
    DA --> UC16
    DA --> UC17
    DA --> UC19
    DA --> UC20

    SA --> UC1
    SA --> UC18
    SA --> UC19
    SA --> UC14
    SA --> UC15
    SA --> UC16
    SA --> UC17
    SA --> UC20
```

---

## 2. Diagramme de classes

```mermaid
classDiagram
    class User {
        +int id
        +String email
        +String nom
        +String role
        +String ine
        +Boolean is_staff
        +can_manage_users() bool
        +save()
    }

    class Theme {
        +int id
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
        +int id
        +String titre
        +File fichier
        +String statut
        +Float taux_plagiat
        +String commentaire_validation
        +DateTime date_soumission
    }

    class TestPlagiat {
        +int id
        +Float taux_plagiat
        +String source_titre
        +JSON phrases_suspectes
        +DateTime date_test
    }

    class TestPlagiatTheme {
        +int id
        +Float taux_plagiat
        +String source_titre
        +JSON phrases_suspectes
        +DateTime date_test
    }

    class Validation {
        +int id
        +String statut
        +String commentaire
        +DateTime date_validation
    }

    class Notification {
        +int id
        +String message
        +Boolean lu
        +DateTime date
    }

    class Ressource {
        +int id
        +String titre
        +File fichier
        +String type
        +String auteur
        +int annee
        +String description
        +Boolean actif
        +DateTime date_ajout
    }

    class Parametre {
        +int id
        +String cle
        +String valeur
        +String description
    }

    User "1" --> "0..*" Theme : crée
    User "1" --> "0..1" Document : dépose
    User "1" --> "0..*" Notification : reçoit
    User "1" --> "0..*" Validation : effectue
    User "1" --> "0..*" Ressource : ajoute

    Theme "1" --> "0..1" Document : associé à
    Theme "1" --> "0..*" TestPlagiatTheme : testé par

    Document "1" --> "0..*" TestPlagiat : testé par
    Document "1" --> "0..*" Validation : validé par

    Ressource "1" --> "0..1" Ressource : liée à
```

---

## 3. Diagramme de séquence — Dépôt et test de plagiat d'un mémoire

```mermaid
sequenceDiagram
    actor Étudiant
    participant Frontend
    participant API
    participant DB
    participant MoteurPlagiat

    Étudiant->>Frontend: Upload PDF mémoire
    Frontend->>API: POST /api/documents/ (fichier, titre)
    API->>DB: Vérifie thème validé de l'étudiant
    DB-->>API: Thème OK
    API->>DB: Crée Document (statut=brouillon)
    DB-->>API: Document créé
    API-->>Frontend: 201 Document

    Étudiant->>Frontend: Lancer test plagiat
    Frontend->>API: POST /api/plagiarism/lancer/<id>/
    API->>DB: Récupère documents validés + bibliothèque
    DB-->>API: Corpus de référence
    API->>MoteurPlagiat: extraire_texte_pdf(fichier)
    MoteurPlagiat-->>API: Texte nettoyé
    API->>MoteurPlagiat: calculer_taux_plagiat(texte, corpus)
    Note over MoteurPlagiat: TF-IDF + cosine similarity<br/>Extraction passages suspects
    MoteurPlagiat-->>API: {taux, source_titre, phrases_suspectes}
    API->>DB: Sauvegarde TestPlagiat
    API->>DB: Met à jour taux_plagiat du Document
    API->>DB: Crée Notification pour l'étudiant
    DB-->>API: OK
    API-->>Frontend: 201 TestPlagiat (résultats)
    Frontend-->>Étudiant: Affiche taux + passages suspects côte à côte
```

---

## 4. Diagramme de séquence — Workflow de validation d'un mémoire

```mermaid
sequenceDiagram
    actor Étudiant
    actor Chef
    actor DirecteurAdjoint
    participant API
    participant DB

    Étudiant->>API: POST /api/documents/<id>/soumettre/
    API->>DB: statut = soumis
    API->>DB: Notification → Étudiant
    DB-->>API: OK
    API-->>Étudiant: {statut: soumis}

    Chef->>API: PUT /api/documents/<id>/ (statut=valide_chef)
    API->>DB: statut = valide_chef
    API->>DB: Notification → Étudiant
    DB-->>API: OK
    API-->>Chef: Document mis à jour

    alt Rejet par le Chef
        Chef->>API: PUT /api/documents/<id>/ (statut=rejete_chef)
        API->>DB: statut = rejete_chef
        API->>DB: Notification → Étudiant (avec commentaire)
        API-->>Chef: Document mis à jour
        Étudiant->>API: PUT /api/documents/<id>/ (nouveau fichier)
        Étudiant->>API: POST /api/documents/<id>/soumettre/
    end

    DirecteurAdjoint->>API: PUT /api/documents/<id>/ (statut=valide)
    API->>DB: statut = valide
    API->>DB: Notification → Étudiant
    API->>DB: Copie PDF → Bibliothèque (si ajout_auto=true)
    DB-->>API: OK
    API-->>DirecteurAdjoint: Document validé

    alt Rejet par le DA
        DirecteurAdjoint->>API: PUT /api/documents/<id>/ (statut=rejete)
        API->>DB: statut = rejete
        API->>DB: Notification → Étudiant
    end
```

---

## 5. Diagramme de séquence — Authentification JWT

```mermaid
sequenceDiagram
    actor Utilisateur
    participant Frontend
    participant API

    Utilisateur->>Frontend: Saisit email + mot de passe
    Frontend->>API: POST /api/token/
    API-->>Frontend: {access (2h), refresh (7j)}
    Frontend->>Frontend: Stocke tokens

    loop Chaque requête authentifiée
        Frontend->>API: GET /api/... (Authorization: Bearer access)
        API-->>Frontend: Données
    end

    Note over Frontend,API: Token expiré
    Frontend->>API: POST /api/token/refresh/ (refresh token)
    API-->>Frontend: Nouveau access token
```

---

## 6. Diagramme d'activité — Processus complet de soumission d'un mémoire

```mermaid
flowchart TD
    A([Début]) --> B[Étudiant crée un thème]
    B --> C[Étudiant soumet le thème]
    C --> D{Chef valide le thème ?}
    D -- Non / Rejet --> E[Étudiant modifie le thème]
    E --> C
    D -- Oui --> F[Étudiant dépose le mémoire PDF]
    F --> G[Étudiant lance le test de plagiat]
    G --> H{Taux > seuil ?}
    H -- Oui --> I[Étudiant révise le mémoire]
    I --> F
    H -- Non --> J[Étudiant soumet le mémoire]
    J --> K{Chef valide le mémoire ?}
    K -- Rejet --> L[Étudiant corrige et resoumet]
    L --> J
    K -- Valide --> M{Directeur Adjoint valide ?}
    M -- Rejet --> N[Étudiant corrige et resoumet]
    N --> J
    M -- Valide --> O[Mémoire validé définitivement]
    O --> P{ajout_auto_bibliotheque = true ?}
    P -- Oui --> Q[Copie ajoutée à la bibliothèque]
    P -- Non --> R([Fin])
    Q --> R
```

---

## 7. Diagramme d'activité — Moteur de détection de plagiat

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
    G --> G1[Troncature zone utile\nINTRODUCTION → BIBLIOGRAPHIE]
    G1 --> G2[Suppression bloc IBAM\nstructure de formation]
    G2 --> G3[Suppression bruit structurel\nnuméros, titres, légendes]
    G3 --> H[Vectorisation TF-IDF\nngram 1-2, stopwords FR + métier]
    H --> I[Calcul similarité cosinus\navec corpus de référence]
    I --> J[Identification source la plus similaire]
    J --> K[Extraction passages suspects\nTop 5 phrases - score > 10%]
    K --> L[Filtrage titres de section\nfaux positifs]
    L --> M[Retourne taux, source_titre,\nphrases_suspectes]
    M --> N([Fin])
```

---

## 8. Diagramme d'activité — Gestion de la bibliothèque

```mermaid
flowchart TD
    A([Début]) --> B{Source d'ajout ?}
    B -- Manuel --> C[Admin upload PDF]
    C --> D[Extraction automatique infos PDF\ntitre, auteur, année]
    D --> E[Pré-remplissage formulaire]
    E --> F[Admin confirme et sauvegarde]
    F --> G[Ressource créée - actif=true]

    B -- Automatique après validation --> H{ajout_auto_bibliotheque = true ?}
    H -- Non --> Z([Fin])
    H -- Oui --> I{Ressource déjà existante ?}
    I -- Oui --> Z
    I -- Non --> J[Copie physique du PDF]
    J --> K[Ressource créée - actif=true]
    K --> Z

    G --> L[Ressource disponible dans le corpus plagiat]
    L --> Z
```
