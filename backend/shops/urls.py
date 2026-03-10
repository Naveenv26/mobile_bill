# backend/shops/urls.py

from django.urls import path
from .views import register_shop

# ✅ Router completely removed — everything is in api/urls.py now
# Only keeping register endpoint here since it has a different permission (AllowAny)

urlpatterns = [
    path("register/", register_shop, name="register-shop"),
]