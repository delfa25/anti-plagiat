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
        print(f"Cree : {u['email']} ({u['role']})")
    else:
        print(f"Deja existant : {u['email']}")
