# backend/api/urls.py

from django.http import JsonResponse
from django.db import connection
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from sales.views import invoice_pdf, invoice_whatsapp
from .views import (
    ResetPasswordView,
    check_subscription,
    SubscriptionPlanViewSet,
    RegisterView,
    ProductViewSet,
    CustomerViewSet,
    InvoiceViewSet,
    ShopViewSet,
    MeViewSet,
    ReportsViewSet,
    ForgotPasswordView,
    StaffViewSet,
    FeedbackViewSet,
    check_availability,
    send_otp,
    verify_otp,
    admin_otp_logs,
)

# create_order imported from payment_views (the full, correct version)
from .payment_views import create_order

from .auth_views import CookieTokenObtainPairView, CookieTokenRefreshView, logout_view
from shops.views import register_shop, TaxProfileViewSet, AdminShopViewSet
from .razorpay_webhook import razorpay_webhook
from .payment_views import (
    verify_payment,
    subscription_status,
    start_trial,
    payment_history,
)

def health_check(request):
    # Check DB connection
    try:
        connection.ensure_connection()
        db_status = "ok"
    except Exception:
        db_status = "error"

    return JsonResponse({
        "status": "ok",
        "db": db_status,
        "version": "1.0.0"
    })


# --------------------------------------------------------------------

router = DefaultRouter()
router.register(r'subscription-plans', SubscriptionPlanViewSet, basename='subscriptionplan')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'taxprofiles', TaxProfileViewSet, basename='taxprofile')
router.register(r'shops', ShopViewSet, basename='shop')
router.register(r'admin/shops', AdminShopViewSet, basename='admin-shops')  # ✅ added
router.register(r'me', MeViewSet, basename='me')
router.register(r'reports', ReportsViewSet, basename='reports')
router.register(r'staff', StaffViewSet, basename='staff')
router.register(r'feedback', FeedbackViewSet, basename='feedback')

# --------------------------------------------------------------------

urlpatterns = [
    # Shop registration
    path("register-shop/", register_shop, name="register_shop"),

    # Auth
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/check-availability/', check_availability, name='check_availability'),
    path('auth/send-otp/', send_otp, name='send_otp'),
    path('auth/verify-otp/', verify_otp, name='verify_otp'),
    path('auth/admin-otp-logs/', admin_otp_logs, name='admin_otp_logs'),
    path('auth/login/', CookieTokenObtainPairView.as_view(), name='login'),
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

    # Invoice actions
    path("invoices/<int:invoice_id>/pdf/", invoice_pdf, name="invoice-pdf"),
    path("invoices/<int:invoice_id>/whatsapp/", invoice_whatsapp, name="invoice-whatsapp"),  # ✅ added

    # Subscription check
    path("subscription/check/", check_subscription, name="check-subscription"),

    # Router URLs
    path("", include(router.urls)),
    path('health/', health_check, name='health-check'),
]