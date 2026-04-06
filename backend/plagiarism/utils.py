import PyPDF2
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def extraire_texte_pdf(fichier):
    try:
        reader = PyPDF2.PdfReader(fichier)
        return " ".join(page.extract_text() or "" for page in reader.pages)
    except Exception:
        return ""


def calculer_taux_plagiat(texte_nouveau, textes_existants):
    if not textes_existants or not texte_nouveau.strip():
        return 0.0

    corpus = textes_existants + [texte_nouveau]
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(corpus)

    similarities = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1])
    return round(float(similarities.max()) * 100, 2)
