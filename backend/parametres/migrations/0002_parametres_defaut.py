from django.db import migrations


def creer_parametres_defaut(apps, schema_editor):
    Parametre = apps.get_model('parametres', 'Parametre')
    parametres = [
        {
            'cle': 'seuil_plagiat',
            'valeur': '20',
            'description': 'Seuil de plagiat en pourcentage (%). Au-delà de ce seuil, le document est considéré comme plagié.'
        },
        {
            'cle': 'ajout_auto_bibliotheque',
            'valeur': 'false',
            'description': 'Ajout automatique des documents validés dans la bibliothèque de ressources.'
        },
        {
            'cle': 'ajout_manuel_bibliotheque',
            'valeur': 'true',
            'description': 'Autoriser l\'ajout manuel de ressources dans la bibliothèque par le superadmin et le DA.'
        },
    ]
    for p in parametres:
        Parametre.objects.get_or_create(cle=p['cle'], defaults={'valeur': p['valeur'], 'description': p['description']})


class Migration(migrations.Migration):

    dependencies = [
        ('parametres', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(creer_parametres_defaut),
    ]
