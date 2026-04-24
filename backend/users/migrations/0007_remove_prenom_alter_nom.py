from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_user_ine'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='prenom',
        ),
        migrations.AlterField(
            model_name='user',
            name='nom',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
    ]
