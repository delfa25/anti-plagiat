@echo off
echo ============================================
echo  ScholarCheck - Migrations completes
echo ============================================

cd /d "%~dp0backend"
call venv\Scripts\activate.bat

echo.
echo [1/2] Generation des migrations (makemigrations)...
python manage.py makemigrations users
python manage.py makemigrations themes
python manage.py makemigrations documents
python manage.py makemigrations plagiarism
python manage.py makemigrations notifications
python manage.py makemigrations parametres
python manage.py makemigrations bibliotheque
python manage.py makemigrations validation

echo.
echo [2/2] Application des migrations (migrate)...
python manage.py migrate

echo.
echo ============================================
echo  Migrations terminees !
echo ============================================
pause
