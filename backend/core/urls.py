# backend/core/urls.py

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),

    # All API routes go through api.urls
    path("api/", include("api.urls")),

    # Reports (separate app)
    path("api/reports/", include("reports.urls")),
]