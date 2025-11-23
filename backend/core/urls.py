# The core URL setup directs all traffic to 'api.urls'
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers

# We must import the specific views and tokens we use in this file
from api.views import ReportsViewSet
from accounts.views import ShopRegistrationView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# --- URL Patterns ---
# The front end is configured to call everything under /api/, 
# so we map the entire API structure to the root ("") of the domain.
urlpatterns = [
    # 1. Django Admin (Stays at /admin/)
    path('admin/', admin.site.urls),

    # --- API ROOT MAPPING ---
    # This single path includes ALL API ENDPOINTS from all sub-apps.
    # It ensures that when Vercel calls /api/register/, Django correctly finds register/
    path("", include("api.urls")),
    
    # --- NON-ROUTER, CUSTOM URLS (MUST be included here if they don't go through api.urls) ---
    # NOTE: Your original file was redundant, but let's re-add the necessary ones 
    # to be safe, ensuring they match what the frontend calls.

    # 5. Account Registration (Called via /api/register/)
    path("register-shop/", ShopRegistrationView.as_view(), name="shop-register"),

    # 6. Token Authentication Endpoints (These are explicitly defined in auth.js)
    # The frontend calls /api/token/ and /api/token/refresh/
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # These report paths must also be defined directly if they bypass the main api.urls router
    path('reports/sales', ReportsViewSet.as_view({'get': 'sales'}), name='report-sales'),
    path('reports/stock', ReportsViewSet.as_view({'get': 'stock'}), name='report-stock'),
    path('reports/', include('reports.urls')), # Includes reports/stock/ from reports app
    path('shops/', include('shops.urls')), # Includes other shops-related paths
]