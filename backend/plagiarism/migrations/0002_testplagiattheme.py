from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('plagiarism', '0001_initial'),
        ('themes', '0002_theme_commentaire_validation'),
    ]

    operations = [
        migrations.CreateModel(
            name='TestPlagiatTheme',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('taux_plagiat', models.FloatField()),
                ('date_test', models.DateTimeField(auto_now_add=True)),
                ('theme', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='tests_plagiat',
                    to='themes.theme'
                )),
            ],
        ),
    ]
