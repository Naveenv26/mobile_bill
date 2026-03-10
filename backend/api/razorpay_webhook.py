import json
import hmac
import hashlib
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from .models import Payment, UserSubscription


@csrf_exempt
@require_POST
def razorpay_webhook(request):
    # Verify signature
    webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
    received_signature = request.headers.get('X-Razorpay-Signature', '')
    body = request.body

    expected_signature = hmac.new(
        webhook_secret.encode('utf-8'),
        body,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, received_signature):
        return JsonResponse({"error": "Invalid signature"}, status=400)

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    event = payload.get('event')

    # Subscription payment success
    if event == 'payment.captured':
        order_id = payload['payload']['payment']['entity'].get('order_id')
        payment_id = payload['payload']['payment']['entity'].get('id')

        try:
            payment = Payment.objects.select_related(
                'user', 'plan'
            ).get(order_id=order_id)

            payment.payment_id = payment_id
            payment.status = 'SUCCESS'
            payment.save()

            # Activate 1 month subscription
            subscription, _ = UserSubscription.objects.get_or_create(
                user=payment.user
            )
            subscription.activate_plan(payment.plan)

        except Payment.DoesNotExist:
            return JsonResponse({"error": "Payment record not found"}, status=404)

    elif event == 'payment.failed':
        order_id = payload['payload']['payment']['entity'].get('order_id')
        try:
            payment = Payment.objects.get(order_id=order_id)
            payment.status = 'FAILED'
            payment.save()
        except Payment.DoesNotExist:
            pass

    return JsonResponse({"status": "ok"})