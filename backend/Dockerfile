FROM python:3.11-slim

WORKDIR /app

# Dépendances système : Tesseract OCR + langue française + Poppler (pdf2image)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-fra \
    poppler-utils \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Télécharger les stopwords NLTK au build
RUN python -c "import nltk; nltk.download('stopwords', quiet=True)"

COPY . .

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
