from django.db import migrations


def creer_parametres_filtrage_plagiat(apps, schema_editor):
    Parametre = apps.get_model('parametres', 'Parametre')
    parametres = [
        {
            'cle': 'plagiat_marqueurs_debut',
            'valeur': 'INTRODUCTION GENERALE|INTRODUCTION',
            'description': 'Marqueurs de debut de zone utile (separes par |).'
        },
        {
            'cle': 'plagiat_marqueurs_fin',
            'valeur': 'BIBLIOGRAPHIE|WEBOGRAPHIE|ANNEXES|ANNEXE',
            'description': 'Marqueurs de fin de zone utile (separes par |).'
        },
        {
            'cle': 'plagiat_bloc_debut',
            'valeur': 'PRESENTATION DE LA STRUCTURE DE FORMATION',
            'description': 'Debut du bloc institutionnel a supprimer.'
        },
        {
            'cle': 'plagiat_bloc_fin',
            'valeur': "PRESENTATION DE LA STRUCTURE D'ACCUEIL|PRESENTATION DE LA STRUCTURE D ACCUEIL",
            'description': 'Fin du bloc institutionnel a supprimer (separee par |).'
        },
        {
            'cle': 'plagiat_stopwords_metier',
            'valeur': 'universite|institut|burkina|faso|licence|professionnelle|miage|ibam|ujkz|stage|rapport|theme|maitre|directeur|academique|annee|semestre|soutenance|presentateur|etudiant|conception|realisation',
            'description': 'Stopwords metier additionnels pour le calcul (separes par |).'
        },
        {
            'cle': 'plagiat_regex_exclusion_custom',
            'valeur': '',
            'description': 'Regex personnalisees a exclure avant calcul (separees par |).'
        },
    ]

    for p in parametres:
        Parametre.objects.get_or_create(
            cle=p['cle'],
            defaults={'valeur': p['valeur'], 'description': p['description']}
        )


class Migration(migrations.Migration):

    dependencies = [
        ('parametres', '0002_parametres_defaut'),
    ]

    operations = [
        migrations.RunPython(creer_parametres_filtrage_plagiat),
    ]
