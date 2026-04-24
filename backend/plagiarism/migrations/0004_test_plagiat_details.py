from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('plagiarism', '0003_delete_notification'),
    ]

    operations = [
        migrations.AddField(
            model_name='testplagiat',
            name='source_titre',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='testplagiat',
            name='phrases_suspectes',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='testplagiattheme',
            name='source_titre',
            field=models.CharField(blank=True, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='testplagiattheme',
            name='phrases_suspectes',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
