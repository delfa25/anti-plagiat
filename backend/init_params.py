from parametres.models import Parametre

defaults = [
    ('seuil_plagiat', '20', 'Seuil de plagiat en pourcentage'),
    ('ajout_auto_bibliotheque', 'false', 'Ajout automatique a la bibliotheque apres validation'),
    ('ajout_manuel_bibliotheque', 'true', 'Autoriser l ajout manuel a la bibliotheque'),
]

for cle, valeur, desc in defaults:
    obj, created = Parametre.objects.get_or_create(cle=cle, defaults={'valeur': valeur, 'description': desc})
    status = 'cree' if created else 'deja existant'
    print(f"Parametre {status} : {cle} = {valeur}")
