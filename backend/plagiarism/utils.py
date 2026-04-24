import os
import re
import tempfile
import unicodedata
import PyPDF2
import pytesseract
from pdf2image import convert_from_path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from nltk.corpus import stopwords

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

STOPWORDS_FORCES = ['conception', 'realisation']

PATTERNS_A_SUPPRIMER = [
    r"^\s*\d+\s*$",
    r"^\s*[\dIVXivx]+[\s\.\-]+[A-Z]{3,}.*$",
    r"Rapport de stage pour l[''']obtention d[''']une licence en MIAGE",
    r"RAPPORT DE STAGE LICENCE MIAGE",
    r"Tableau\s+\d+\s*:\s*.*",
    r"Figure\s+\d+\s*:\s*.*",
    r"PRESENTATION DES? STRUCTURES? DE FORMATION.*",
    r"PRESENTATION DES? STRUCTURES? D.ACCUEIL.*",
    r"INSTITUT BURKINABE? DES ARTS ET METIERS",
    r"UNIVERSITE\s+JOSEPH\s+KI[-\s]?ZERBO",
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
        for m in get_param_list('plagiat_marqueurs_debut', ['INTRODUCTION GENERALE', 'INTRODUCTION'])
    ]
    index_debut = -1
    for marqueur in marqueurs_debut:
        idx = texte_upper.find(marqueur)
        if idx != -1:
            index_debut = idx if index_debut == -1 else min(index_debut, idx)

    fins = []
    marqueurs_fin = [
        normaliser_pour_recherche(m)
        for m in get_param_list('plagiat_marqueurs_fin', ['BIBLIOGRAPHIE', 'WEBOGRAPHIE', 'ANNEXES', 'ANNEXE'])
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

    blocs_debut = [
        normaliser_pour_recherche(m)
        for m in get_param_list('plagiat_bloc_debut', [
            "PRESENTATION DE LA STRUCTURE DE FORMATION",
            "PRESENTATION DES STRUCTURES DE FORMATION",
        ])
    ]
    fins_bloc = [
        normaliser_pour_recherche(m)
        for m in get_param_list('plagiat_bloc_fin', [
            "PRESENTATION DE LA STRUCTURE D'ACCUEIL",
            "PRESENTATION DE LA STRUCTURE D ACCUEIL",
            "PRESENTATION DES STRUCTURES D'ACCUEIL",
            "PRESENTATION DES STRUCTURES D ACCUEIL",
        ])
    ]

    debut = -1
    for marqueur in blocs_debut:
        idx = texte_upper.find(marqueur)
        if idx != -1:
            debut = idx if debut == -1 else min(debut, idx)
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


def _get_chemin_pdf(fichier):
    """
    Retourne un chemin physique vers le PDF.
    Si le fichier est en mémoire (InMemoryUploadedFile), l'écrit dans un
    fichier temporaire et retourne (chemin, True) — True = à supprimer après.
    """
    if hasattr(fichier, 'path') and fichier.path:
        return fichier.path, False
    # Fichier en mémoire : écrire dans un temporaire
    if hasattr(fichier, 'seek'):
        fichier.seek(0)
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    tmp.write(fichier.read())
    tmp.close()
    return tmp.name, True


def extraire_texte_pdf(fichier):
    """Extrait puis nettoie le texte d'un PDF (OCR en fallback)."""
    chemin = None
    tmp_a_supprimer = False
    try:
        chemin, tmp_a_supprimer = _get_chemin_pdf(fichier)

        reader = PyPDF2.PdfReader(chemin)
        texte = " ".join(page.extract_text() or "" for page in reader.pages).strip()

        if texte:
            return nettoyer_texte_analyse(texte)

        # Fallback OCR si PDF scanné
        images = convert_from_path(chemin, dpi=300, poppler_path=_poppler_path or None)
        texte_ocr = ""
        for image in images:
            texte_ocr += pytesseract.image_to_string(image, lang='fra') + " "
        return nettoyer_texte_analyse(texte_ocr.strip())

    except Exception as e:
        print(f"Erreur extraction PDF : {e}")
        return ""
    finally:
        if tmp_a_supprimer and chemin:
            try:
                os.remove(chemin)
            except Exception:
                pass


def _est_titre_section(phrase):
    """Retourne True si la phrase ressemble à un titre de section."""
    mots = phrase.strip().split()
    if len(mots) < 5:
        return True
    if len(mots) > 25:
        return False
    alpha = [c for c in phrase if c.isalpha()]
    if not alpha:
        return True
    ratio_maj = sum(1 for c in alpha if c.isupper()) / len(alpha)
    if ratio_maj > 0.6:
        return True
    mots_minuscules_longs = [m for m in mots if len(m) > 3 and m[0].islower()]
    if len(mots_minuscules_longs) < 2:
        return True
    return False


def _phrases_suspectes(texte_nouveau, texte_source, stopwords_final, top_n=5):
    """Retourne les phrases suspectes avec leur passage source correspondant."""
    phrases_brutes = re.split(r'[.;\n]', texte_nouveau)
    phrases = [
        p.strip() for p in phrases_brutes
        if len(p.strip()) > 60 and not _est_titre_section(p.strip())
    ]
    if not phrases:
        return []

    phrases_source_brutes = re.split(r'[.;\n]', texte_source)
    phrases_source = [
        p.strip() for p in phrases_source_brutes
        if len(p.strip()) > 30 and not _est_titre_section(p.strip())
    ]

    try:
        corpus_global = [texte_source] + phrases
        vec = TfidfVectorizer(stop_words=stopwords_final, ngram_range=(1, 2), strip_accents='unicode', analyzer='word')
        mat = vec.fit_transform(corpus_global)
        sims_global = cosine_similarity(mat[1:], mat[0:1]).flatten()

        indices = sims_global.argsort()[::-1][:top_n]
        resultats = []

        for i in indices:
            if sims_global[i] <= 0.1:
                continue
            phrase_testee = phrases[i]
            passage_source = ''

            if phrases_source:
                try:
                    corpus_local = [phrase_testee] + phrases_source
                    vec2 = TfidfVectorizer(stop_words=stopwords_final, ngram_range=(1, 2), strip_accents='unicode', analyzer='word')
                    mat2 = vec2.fit_transform(corpus_local)
                    sims_local = cosine_similarity(mat2[0:1], mat2[1:]).flatten()
                    idx_source = int(sims_local.argmax())
                    passage_source = phrases_source[idx_source]
                except Exception:
                    pass

            resultats.append({
                'phrase': phrase_testee,
                'passage_source': passage_source,
                'similarite': round(float(sims_global[i]) * 100, 1)
            })

        return [r for r in resultats if r['passage_source']]
    except Exception:
        return []


def calculer_taux_plagiat(texte_nouveau, textes_existants, titres_existants=None):
    """
    Calcule le taux de plagiat avec TF-IDF optimisé pour le français.
    Retourne un dict : taux, source_titre, phrases_suspectes.
    """
    texte_nouveau = nettoyer_texte_analyse(texte_nouveau)
    textes_existants = [nettoyer_texte_analyse(t) for t in textes_existants]

    if titres_existants is None:
        titres_existants = [f'Source {i+1}' for i in range(len(textes_existants))]

    paires = [(t, titre) for t, titre in zip(textes_existants, titres_existants) if t.strip()]
    if not paires or not texte_nouveau.strip():
        return {'taux': 0.0, 'source_titre': None, 'phrases_suspectes': []}

    textes_filtres, titres_filtres = zip(*paires)
    textes_filtres = list(textes_filtres)
    titres_filtres = list(titres_filtres)

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
        corpus = textes_filtres + [texte_nouveau]
        tfidf_matrix = vectorizer.fit_transform(corpus)
        similarities = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1]).flatten()
        idx_max = int(similarities.argmax())
        taux = round(float(similarities[idx_max]) * 100, 2)
        source_titre = titres_filtres[idx_max]
        phrases = _phrases_suspectes(texte_nouveau, textes_filtres[idx_max], stopwords_final)
        return {'taux': taux, 'source_titre': source_titre, 'phrases_suspectes': phrases}
    except Exception as e:
        print(f"Erreur calcul plagiat : {e}")
        return {'taux': 0.0, 'source_titre': None, 'phrases_suspectes': []}
