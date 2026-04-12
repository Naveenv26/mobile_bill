# backend/api/management/commands/reset_admin.py
# ONE-TIME USE — remove from build.sh after first deploy
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Resets the superuser password from ADMIN_PASSWORD env var"

    def handle(self, *args, **kwargs):
        email    = os.environ.get("ADMIN_EMAIL", "").strip()
        password = os.environ.get("ADMIN_PASSWORD", "").strip()

        if not email or not password:
            self.stdout.write(self.style.WARNING(
                "⚠️  reset_admin skipped — ADMIN_EMAIL or ADMIN_PASSWORD env var not set."
            ))
            return

        user = User.objects.filter(email__iexact=email).first()

        if user:
            user.set_password(password)
            user.is_staff     = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS(
                f"✅ Password reset for {user.email}"
            ))
        else:
            # Account doesn't exist at all — create it fresh
            user = User.objects.create_superuser(
                email=email,
                username=email,
                password=password,
            )
            self.stdout.write(self.style.SUCCESS(
                f"✅ Superuser created: {user.email}"
            ))