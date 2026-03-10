from django.core.cache import cache
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse

EXEMPT_PATHS = [
    "/api/auth/login/",
    "/api/auth/register/",
    "/api/auth/refresh/",
    "/api/auth/logout/",
    "/api/auth/forgot-password/",
    "/api/auth/reset-password/",
    "/api/razorpay-webhook/",
    "/api/plans/",
]

class SubscriptionMiddleware(MiddlewareMixin):
    def process_view(self, request, view_func, view_args, view_kwargs):
        if request.path in EXEMPT_PATHS or request.path.startswith("/admin/"):
            return None

        if not request.user.is_authenticated:
            return None

        # ✅ Cache subscription check for 5 minutes per user
        cache_key = f"sub_valid_{request.user.id}"
        is_valid = cache.get(cache_key)

        if is_valid is None:
            subscription = getattr(request.user, "usersubscription", None)
            is_valid = subscription.is_valid() if subscription else False
            cache.set(cache_key, is_valid, timeout=300)  # 5 minutes

        if not is_valid:
            return JsonResponse(
                {"detail": "Your subscription has expired or payment required."},
                status=403
            )

        return None