# backend/api/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from sales.views import invoice_pdf , invoice_whatsapp
from .views import (
    ResetPasswordView,
    check_subscription,
    create_order,
    SubscriptionPlanViewSet,
    RegisterView,
    ProductViewSet,
    CustomerViewSet,
    InvoiceViewSet,
    ShopViewSet,
    MeViewSet,
    ReportsViewSet,
    ForgotPasswordView,
    StaffViewSet,   # <-- ADDED
)
from .views import FeedbackViewSet
# Auth
from .auth_views import CookieTokenObtainPairView, CookieTokenRefreshView, logout_view

# Shop Registration
from shops.views import register_shop , TaxProfileViewSet

# Razorpay
from .razorpay_webhook import razorpay_webhook
from .payment_views import (
    verify_payment,
    subscription_status,
    start_trial,
    payment_history,
)

# --------------------------------------------------------------------

router = DefaultRouter()
router.register(r'subscription-plans', SubscriptionPlanViewSet, basename='subscriptionplan')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'taxprofiles', TaxProfileViewSet, basename='taxprofile')
router.register(r'shops', ShopViewSet, basename='shop')
router.register(r'me', MeViewSet, basename='me')
router.register(r'reports', ReportsViewSet, basename='reports')
router.register(r'staff', StaffViewSet, basename='staff')   # <-- ADDED
router.register(r'feedback', FeedbackViewSet, basename='feedback')
# --------------------------------------------------------------------

urlpatterns = [
    # Shop registration
    path("register-shop/", register_shop, name="register_shop"),

    # Auth
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("token/", CookieTokenObtainPairView.as_view(), name="login"),
    path("auth/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", logout_view, name="logout"),

    # Password reset
    path("auth/forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("auth/reset-password/<uidb64>/<token>/", ResetPasswordView.as_view(), name="reset-password"),

    # Payments
    path("payments/create-order/", create_order, name="create-order"),
    path("payments/verify-payment/", verify_payment, name="verify-payment"),
    path("payments/subscription-status/", subscription_status, name="subscription-status"),
    path("payments/start-trial/", start_trial, name="start-trial"),
    path("payments/history/", payment_history, name="payment-history"),
    path("payments/webhook/", razorpay_webhook, name="razorpay-webhook"),
    path('invoices/<int:invoice_id>/pdf/', invoice_pdf, name='invoice-pdf'),
    # API (router)
    path("", include(router.urls)),
]
