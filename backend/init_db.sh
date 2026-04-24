#!/bin/sh
set -e

echo "============================================"
echo " ScholarCheck - Initialisation via Docker"
echo "============================================"

echo ""
echo "[1/4] Application des migrations..."
python manage.py migrate

echo ""
echo "[2/4] Creation des utilisateurs..."
python manage.py shell << 'EOF'
from users.models import User

users = [
    {'email': 'admin@scholarcheck.com',   'password': 'admin1234',   'role': 'superadmin', 'nom': 'Super Admin',          'superuser': True},
    {'email': 'da@scholarcheck.com',      'password': 'dada1234',    'role': 'directeur',  'nom': 'Directeur Adjoint DA', 'superuser': False},
    {'email': 'chefdep@scholarcheck.com', 'password': 'chefdep1234', 'role': 'chef',       'nom': 'Chef de Departement',  'superuser': False},
    {'email': 'etud@scholarcheck.com',    'password': 'etud1234',    'role': 'etudiant',   'nom': 'Etudiant Test',        'superuser': False},
]

for u in users:
    if not User.objects.filter(email=u['email']).exists():
        if u['superuser']:
            user = User.objects.create_superuser(email=u['email'], password=u['password'])
        else:
            user = User.objects.create_user(email=u['email'], password=u['password'], role=u['role'])
        user.nom = u['nom']
        user.save()
        print('Cree : ' + u['email'] + ' (' + u['role'] + ')')
    else:
        print('Deja existant : ' + u['email'])
EOF

echo ""
echo "[3/4] Chargement des parametres par defaut..."
python manage.py shell << 'EOF'
from parametres.models import Parametre

defaults = [
    ('seuil_plagiat', '20', 'Seuil de plagiat en pourcentage'),
    ('ajout_auto_bibliotheque', 'false', 'Ajout automatique a la bibliotheque apres validation'),
    ('ajout_manuel_bibliotheque', 'true', 'Autoriser l ajout manuel a la bibliotheque'),
]
for cle, valeur, desc in defaults:
    obj, created = Parametre.objects.get_or_create(cle=cle, defaults={'valeur': valeur, 'description': desc})
    status = 'cree' if created else 'deja existant'
    print('Parametre ' + status + ' : ' + cle + ' = ' + valeur)
EOF

echo ""
echo "[4/4] Verification..."
python manage.py check

echo ""
echo "============================================"
echo " Initialisation terminee !"
echo ""
echo " Comptes disponibles :"
echo " superadmin : admin@scholarcheck.com    / admin1234"
echo " directeur  : da@scholarcheck.com       / dada1234"
echo " chef dept  : chefdep@scholarcheck.com  / chefdep1234"
echo " etudiant   : etud@scholarcheck.com     / etud1234"
echo "============================================"
