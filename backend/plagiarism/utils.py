import os
import re
import unicodedata
import PyPDF2
import pytesseract
from pdf2image import convert_from_path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from nltk.corpus import stopwords

# Chemin Tesseract : variable d'env en priorité, sinon chemin Windows local
_tesseract_cmd = os.environ.get('TESSERACT_CMD', r'C:\Program Files\Tesseract-OCR\tesseract.exe')
pytesseract.pytesseract.tesseract_cmd = _tesseract_cmd

_poppler_path = os.environ.get('POPPLER_PATH', r'C:\poppler\poppler-25.12.0\Library\bin')

STOPWORDS_FR = list(stopwords.words('french'))

STOPWORDS_METIER = [
    'universite', 'institut', 'burkina', 'faso', 'licence', 'professionnelle',
    'miage', 'ibam', 'ujkz', 'stage', 'rapport', 'theme', 'maitre',
    'directeur', 'academique', 'annee', 'semestre', 'soutenance',
    'presentateur', 'etudiant'
]

# Termes a ignorer explicitement pour les titres/themes trop generiques.
STOPWORDS_FORCES = ['conception', 'realisation']

PATTERNS_A_SUPPRIMER = [
    r"^\s*\d+\s*$",
    r"Rapport de stage pour l[’']obtention d[’']une licence en MIAGE",
    r"RAPPORT DE STAGE LICENCE MIAGE",
    r"Tableau\s+\d+\s*:\s*.*",
    r"Figure\s+\d+\s*:\s*.*",
    r"INSTITUT BURKINAB[ÉE] DES ARTS ET M[ÉE]TIERS",
    r"UNIVERSIT[ÉE]\s+JOSEPH\s+KI[-\s]?ZERBO",
]


def get_param_value(cle, default_value):
    try:
        from parametres.models import Parametre
        p = Parametre.objects.filter(cle=cle).first()
        if p and p.valeur and p.valeur.strip():
            return p.valeur.strip()
    except Exception:
        pass
    return default_value


def get_param_list(cle, default_list, separator='|'):
    raw = get_param_value(cle, separator.join(default_list))
    values = [v.strip() for v in raw.split(separator)]
    return [v for v in values if v]


def normaliser_pour_recherche(texte):
    texte = unicodedata.normalize('NFKD', texte)
    texte = ''.join(ch for ch in texte if not unicodedata.combining(ch))
    return texte.upper()


def tronquer_zone_utile(texte_complet):
    texte_upper = normaliser_pour_recherche(texte_complet)

    marqueurs_debut = [
        normaliser_pour_recherche(m)
        for m in get_param_list(
            'plagiat_marqueurs_debut',
            ['INTRODUCTION GENERALE', 'INTRODUCTION']
        )
    ]
    index_debut = -1
    for marqueur in marqueurs_debut:
        idx = texte_upper.find(marqueur)
        if idx != -1:
            index_debut = idx if index_debut == -1 else min(index_debut, idx)

    fins = []
    marqueurs_fin = [
        normaliser_pour_recherche(m)
        for m in get_param_list(
            'plagiat_marqueurs_fin',
            ['BIBLIOGRAPHIE', 'WEBOGRAPHIE', 'ANNEXES', 'ANNEXE']
        )
    ]
    for marqueur_fin in marqueurs_fin:
        idx = texte_upper.find(marqueur_fin)
        if idx != -1:
            fins.append(idx)
    index_fin = min(fins) if fins else -1

    debut = index_debut if index_debut != -1 else 0
    fin = index_fin if index_fin != -1 and index_fin > debut else len(texte_complet)
    return texte_complet[debut:fin]


def supprimer_bloc_ibam(texte):
    texte_upper = normaliser_pour_recherche(texte)
    bloc_debut = normaliser_pour_recherche(
        get_param_value('plagiat_bloc_debut', "PRESENTATION DE LA STRUCTURE DE FORMATION")
    )
    fins_bloc = [
        normaliser_pour_recherche(m)
        for m in get_param_list(
            'plagiat_bloc_fin',
            ["PRESENTATION DE LA STRUCTURE D'ACCUEIL", "PRESENTATION DE LA STRUCTURE D ACCUEIL"]
        )
    ]

    debut = texte_upper.find(bloc_debut)
    if debut == -1:
        return texte

    fin = -1
    for marqueur_fin in fins_bloc:
        idx = texte_upper.find(marqueur_fin, debut)
        if idx != -1:
            fin = idx if fin == -1 else min(fin, idx)
    if fin == -1:
        return texte
    return texte[:debut] + " " + texte[fin:]


def nettoyer_bruit_structure(texte):
    texte_nettoye = texte
    patterns = list(PATTERNS_A_SUPPRIMER)
    patterns_custom = get_param_list('plagiat_regex_exclusion_custom', [])
    patterns.extend(patterns_custom)

    for pattern in patterns:
        texte_nettoye = re.sub(pattern, "", texte_nettoye, flags=re.IGNORECASE | re.MULTILINE)
    texte_nettoye = re.sub(r"\s+", " ", texte_nettoye).strip()
    return texte_nettoye


def nettoyer_texte_analyse(texte):
    if not texte:
        return ""
    texte = tronquer_zone_utile(texte)
    texte = supprimer_bloc_ibam(texte)
    texte = nettoyer_bruit_structure(texte)
    return texte


def extraire_texte_pdf(fichier):
    """Extrait puis nettoie le texte d'un PDF (OCR en fallback)."""
    try:
        # Tentative extraction texte natif
        reader = PyPDF2.PdfReader(fichier)
        texte = " ".join(page.extract_text() or "" for page in reader.pages).strip()

        if texte:
            return nettoyer_texte_analyse(texte)

        # Fallback OCR si PDF scanné
        chemin = fichier.path if hasattr(fichier, 'path') else str(fichier)
        images = convert_from_path(chemin, dpi=300, poppler_path=_poppler_path or None)
        texte_ocr = ""
        for image in images:
            texte_ocr += pytesseract.image_to_string(image, lang='fra') + " "
        return nettoyer_texte_analyse(texte_ocr.strip())

    except Exception as e:
        print(f"Erreur extraction PDF : {e}")
        return ""


def calculer_taux_plagiat(texte_nouveau, textes_existants):
    """Calcule le taux de plagiat avec TF-IDF optimisé pour le français."""
    texte_nouveau = nettoyer_texte_analyse(texte_nouveau)
    textes_existants = [nettoyer_texte_analyse(t) for t in textes_existants]
    textes_existants = [t for t in textes_existants if t.strip()]

    if not textes_existants or not texte_nouveau.strip():
        return 0.0

    corpus = textes_existants + [texte_nouveau]
    stopwords_metier_custom = get_param_list('plagiat_stopwords_metier', STOPWORDS_METIER)
    stopwords_final = list(set(STOPWORDS_FR + stopwords_metier_custom + STOPWORDS_FORCES))

    vectorizer = TfidfVectorizer(
        stop_words=stopwords_final,
        ngram_range=(1, 2),
        min_df=1,
        strip_accents='unicode',
        analyzer='word',
    )

    try:
        tfidf_matrix = vectorizer.fit_transform(corpus)
        similarities = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1])
        return round(float(similarities.max()) * 100, 2)
    except Exception as e:
        print(f"Erreur calcul plagiat : {e}")
        return 0.0
