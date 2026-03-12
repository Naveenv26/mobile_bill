# Migration: backfill empty emails from username for old accounts
# Safe to run multiple times (only touches users where email is blank)

from django.db import migrations


def backfill_email_from_username(apps, schema_editor):
    User = apps.get_model('accounts', 'User')

    # Find users with blank email but a username that looks like an email
    for user in User.objects.filter(email=''):
        if user.username and '@' in user.username:
            # username is already an email — just copy it
            if not User.objects.filter(email=user.username).exclude(pk=user.pk).exists():
                user.email = user.username
                user.save(update_fields=['email'])
        elif user.username:
            # username is NOT an email — generate a placeholder so uniqueness holds
            placeholder = f"{user.username}@migrated.local"
            if not User.objects.filter(email=placeholder).exclude(pk=user.pk).exists():
                user.email = placeholder
                user.save(update_fields=['email'])


def reverse_backfill(apps, schema_editor):
    pass  # Irreversible (no data loss, just a backfill)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_alter_user_managers_alter_user_email_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_email_from_username, reverse_backfill),
    ]