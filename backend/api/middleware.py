from django.core.cache import cache
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse

EXEMPT_PATHS = [
    # Auth
    "/api/token/",
    "/api/auth/register/",
    "/api/auth/refresh/",
    "/api/auth/logout/",
    "/api/auth/forgot-password/",
    "/api/auth/reset-password/",
    "/api/register-shop/",

    # Subscription & payments — expired users MUST reach these to renew
    "/api/subscription/check/",
    "/api/payments/subscription-status/",
    "/api/payments/create-order/",
    "/api/payments/verify-payment/",
    "/api/payments/start-trial/",
    "/api/payments/history/",
    "/api/payments/webhook/",

    # Public endpoints
    "/api/subscription-plans/",
    "/api/health/",
]

# Prefix-based exemptions (covers ViewSet sub-URLs like /api/me/list/)
EXEMPT_PREFIXES = [
    "/api/me/",
]


class SubscriptionMiddleware(MiddlewareMixin):
    def process_view(self, request, view_func, view_args, view_kwargs):
        path = request.path
        is_exempt = (
            path in EXEMPT_PATHS
            or path.startswith("/admin/")
            or any(path.startswith(p) for p in EXEMPT_PREFIXES)
        )
        if is_exempt:
            return None

        if not request.user.is_authenticated:
            return None

        # Cache subscription check for 5 minutes per user
        cache_key = f"sub_valid_{request.user.id}"

        try:
            is_valid = cache.get(cache_key)
        except Exception:
            is_valid = None

        if is_valid is None:
            subscription = getattr(request.user, "usersubscription", None)
            is_valid = subscription.is_valid() if subscription else False

            try:
                cache.set(cache_key, is_valid, timeout=300)
            except Exception:
                pass

        if not is_valid:
            return JsonResponse(
                {"detail": "Your subscription has expired or payment required."},
                status=403
            )

        return None