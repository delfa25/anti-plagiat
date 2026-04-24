@echo off
echo ============================================
echo  ScholarCheck - Initialisation complete
echo ============================================

cd /d "%~dp0backend"

:: Verification du venv
if not exist "venv\Scripts\activate.bat" (
    echo [ERREUR] Le venv n'existe pas.
    echo Lancez d'abord depuis le dossier backend :
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    pause
    exit /b 1
)

call venv\Scripts\activate.bat

:: Verification des dependances
echo.
echo [1/6] Verification des dependances Python...
python -c "import django, rest_framework, decouple, sklearn, nltk, PyPDF2" 2>nul
if %errorlevel% neq 0 (
    echo Installation des dependances...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERREUR] Installation des dependances echouee.
        pause
        exit /b 1
    )
)
echo OK

:: Verification du .env
echo.
echo [2/6] Verification du fichier .env...
if not exist ".env" (
    if exist ".env.example" (
        echo Fichier .env manquant, copie depuis .env.example...
        copy .env.example .env
        echo [ATTENTION] Editez backend\.env avant de continuer.
        pause
    ) else (
        echo [ERREUR] Fichier .env manquant et pas de .env.example.
        pause
        exit /b 1
    )
)
echo OK

:: Telechargement stopwords NLTK
echo.
echo [3/6] Telechargement des donnees NLTK...
python -c "import nltk; nltk.download('stopwords', quiet=True)"
echo OK

:: Migrations
echo.
echo [4/6] Generation et application des migrations...
python manage.py makemigrations users themes documents plagiarism notifications parametres bibliotheque validation
if %errorlevel% neq 0 (
    echo [ERREUR] makemigrations a echoue.
    pause
    exit /b 1
)
python manage.py migrate
if %errorlevel% neq 0 (
    echo [ERREUR] migrate a echoue.
    pause
    exit /b 1
)
echo OK

:: Creation des utilisateurs
echo.
echo [5/6] Creation des utilisateurs de test...
python manage.py shell -c "exec(open('init_users.py').read())"
if %errorlevel% neq 0 (
    echo [ERREUR] Creation des utilisateurs echouee.
    pause
    exit /b 1
)

:: Parametres par defaut
echo.
echo [6/6] Chargement des parametres systeme...
python manage.py shell -c "exec(open('init_params.py').read())"
if %errorlevel% neq 0 (
    echo [ERREUR] Chargement des parametres echoue.
    pause
    exit /b 1
)

:: Verification finale
echo.
python manage.py check
if %errorlevel% neq 0 (
    echo [ATTENTION] Des problemes ont ete detectes. Verifiez la configuration.
    pause
)

echo.
echo ============================================
echo  Initialisation terminee avec succes !
echo.
echo  Comptes disponibles :
echo  superadmin : admin@scholarcheck.com    / admin1234
echo  directeur  : da@scholarcheck.com       / dada1234
echo  chef dept  : chefdep@scholarcheck.com  / chefdep1234
echo  etudiant   : etud@scholarcheck.com     / etud1234
echo.
echo  Pour lancer le backend :
echo    cd backend
echo    venv\Scripts\activate
echo    python manage.py runserver
echo.
echo  Pour lancer le frontend :
echo    cd frontend
echo    npm install
echo    npm start
echo ============================================
pause
