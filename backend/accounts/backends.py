# backend/accounts/backends.py

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()

        user = None

        # 1. Try email lookup first (all new users login this way)
        if username:
            try:
                user = UserModel.objects.get(email__iexact=username)
            except UserModel.DoesNotExist:
                pass

        # 2. Fallback: username lookup for old accounts created before
        #    the email-based auth migration (username was the login field then)
        if user is None and username:
            try:
                user = UserModel.objects.get(username__iexact=username)
            except UserModel.DoesNotExist:
                pass

        if user is None:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None