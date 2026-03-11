# backend/api/payment_views.py

import razorpay
import hmac
import hashlib
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db import transaction

from .models import SubscriptionPlan, UserSubscription, Payment
from .serializers import (
    SubscriptionPlanSerializer,
    UserSubscriptionSerializer,
    PaymentSerializer,
    CreateOrderSerializer,
    VerifyPaymentSerializer,
)

# ========== INITIALIZE RAZORPAY CLIENT ==========
razorpay_client = razorpay.Client(auth=(
    settings.RAZORPAY_KEY_ID,
    settings.RAZORPAY_KEY_SECRET,
))


# ========== SUBSCRIPTION PLANS VIEWSET ==========
class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """List all active subscription plans — public read, no auth needed to view plans"""
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAuthenticated]


# ========== CREATE RAZORPAY ORDER ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    """
    Creates a Razorpay order for subscription payment.
    Body: { "plan_id": 1 }
    Returns: Razorpay order details for frontend checkout
    """
    serializer = CreateOrderSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    plan_id = serializer.validated_data['plan_id']

    try:
        plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response(
            {"error": "Plan not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Convert to paise (Razorpay requires smallest currency unit)
    amount_paise = int(float(plan.price) * 100)

    try:
        razorpay_order = razorpay_client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {
                "user_id": str(request.user.id),
                "user_email": request.user.email,
                "plan_id": str(plan.id),
                "plan_name": plan.name,
            }
        })

        # Record the pending payment
        Payment.objects.create(
            user=request.user,
            plan=plan,
            order_id=razorpay_order['id'],
            amount=plan.price,
            currency='INR',
            status='PENDING',
        )

        return Response({
            "order_id": razorpay_order['id'],
            "amount": amount_paise,
            "currency": "INR",
            "key": settings.RAZORPAY_KEY_ID,
            "plan_name": plan.name,
            "user_name": request.user.username or request.user.email,
            "user_email": request.user.email,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {"error": f"Failed to create order: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ========== VERIFY PAYMENT ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    """
    Verifies Razorpay payment signature after frontend checkout completes.
    Activates subscription on success.
    Body: {
        "razorpay_order_id": "order_xxx",
        "razorpay_payment_id": "pay_xxx",
        "razorpay_signature": "signature_xxx"
    }
    """
    serializer = VerifyPaymentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    razorpay_order_id = serializer.validated_data['razorpay_order_id']
    razorpay_payment_id = serializer.validated_data['razorpay_payment_id']
    razorpay_signature = serializer.validated_data['razorpay_signature']

    # ✅ Verify signature using HMAC SHA256
    generated_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode('utf-8'),
        f"{razorpay_order_id}|{razorpay_payment_id}".encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # ✅ Use compare_digest to prevent timing attacks
    if not hmac.compare_digest(generated_signature, razorpay_signature):
        return Response(
            {"error": "Invalid payment signature. Please contact support."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Fetch payment record
    try:
        payment = Payment.objects.select_related('user', 'plan').get(
            order_id=razorpay_order_id,
            user=request.user,
        )
    except Payment.DoesNotExist:
        return Response(
            {"error": "Payment record not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Prevent double activation
    if payment.status == 'SUCCESS':
        subscription = UserSubscription.objects.get(user=request.user)
        return Response({
            "success": True,
            "message": "Subscription already active.",
            "subscription": UserSubscriptionSerializer(subscription).data,
        })

    # ✅ Atomic — both payment update and subscription activation succeed or both fail
    with transaction.atomic():
        payment.payment_id = razorpay_payment_id
        payment.signature = razorpay_signature
        payment.status = 'SUCCESS'
        payment.save()

        subscription, _ = UserSubscription.objects.get_or_create(user=request.user)
        subscription.activate_plan(payment.plan)

    return Response({
        "success": True,
        "message": "Payment verified! Your 30-day subscription is now active.",
        "subscription": UserSubscriptionSerializer(subscription).data,
    }, status=status.HTTP_200_OK)


# ========== SUBSCRIPTION STATUS ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_status(request):
    """
    Returns the current subscription status for the logged-in user.
    Used by frontend to show subscription info, countdown, upgrade prompts etc.
    """
    subscription, created = UserSubscription.objects.get_or_create(user=request.user)

    return Response({
        "is_valid": subscription.is_valid(),
        "status": subscription.get_status(),               # trial | active | grace | expired
        "days_remaining": subscription.days_remaining(),
        "plan_type": subscription.get_plan_type(),         # FREE | PRO
        "trial_end_date": subscription.trial_end_date,
        "end_date": subscription.end_date,
        "admin_override": subscription.allowed_by_admin,
        "subscription": UserSubscriptionSerializer(subscription).data,
    })


# ========== START FREE TRIAL ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_trial(request):
    """
    Starts the 30-day free trial for a new user.
    Can only be used once per account.
    """
    subscription, created = UserSubscription.objects.get_or_create(user=request.user)

    if subscription.trial_used:
        return Response(
            {"error": "Free trial has already been used on this account."},
            status=status.HTTP_400_BAD_REQUEST
        )

    success = subscription.start_trial()

    if success:
        return Response({
            "success": True,
            "message": "Your 30-day free trial is now active!",
            "days_remaining": subscription.days_remaining(),
            "trial_end_date": subscription.trial_end_date,
            "subscription": UserSubscriptionSerializer(subscription).data,
        }, status=status.HTTP_200_OK)

    return Response(
        {"error": "Failed to start trial. Please ensure the FREE plan is seeded in the database."},
        status=status.HTTP_400_BAD_REQUEST
    )


# ========== PAYMENT HISTORY ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_history(request):
    """
    Returns the payment history for the logged-in user.
    Shows all subscription payments — pending, success, failed.
    """
    payments = Payment.objects.filter(
        user=request.user
    ).order_by('-created_at')

    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)


# ========== RAZORPAY WEBHOOK ==========
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def razorpay_webhook(request):
    """
    Handles Razorpay webhook events for subscription payments.
    This is a backup to verify_payment — ensures subscription activates
    even if the frontend fails to call verify_payment after checkout.

    Configure in Razorpay Dashboard:
    https://yourdomain.com/api/payments/webhook/
    """
    # ✅ Fix 1 — use WEBHOOK secret, not API secret (these are different!)
    webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
    webhook_signature = request.headers.get('X-Razorpay-Signature', '')

    if not webhook_signature:
        return Response(
            {"error": "Missing webhook signature"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ✅ Fix 2 — proper exception handling
    try:
        razorpay_client.utility.verify_webhook_signature(
            request.body.decode('utf-8'),
            webhook_signature,
            webhook_secret,
        )
    except Exception:
        return Response(
            {"error": "Invalid webhook signature"},
            status=status.HTTP_400_BAD_REQUEST
        )

    webhook_body = request.data
    event = webhook_body.get('event')

    # ========== PAYMENT CAPTURED ==========
    if event == 'payment.captured':
        payment_entity = webhook_body['payload']['payment']['entity']
        order_id = payment_entity.get('order_id')
        payment_id = payment_entity.get('id')

        try:
            payment = Payment.objects.select_related('user', 'plan').get(
                order_id=order_id
            )

            # Skip if already processed (verify_payment may have handled it)
            if payment.status == 'SUCCESS':
                return Response({"status": "already processed"})

            with transaction.atomic():
                payment.payment_id = payment_id
                payment.status = 'SUCCESS'
                payment.save()

                subscription, _ = UserSubscription.objects.get_or_create(
                    user=payment.user
                )
                subscription.activate_plan(payment.plan)

        except Payment.DoesNotExist:
            # Log this — order exists in Razorpay but not in our DB
            pass

    # ========== PAYMENT FAILED ==========
    elif event == 'payment.failed':
        payment_entity = webhook_body['payload']['payment']['entity']
        order_id = payment_entity.get('order_id')

        try:
            payment = Payment.objects.get(order_id=order_id)
            if payment.status != 'SUCCESS':  # Don't overwrite a success
                payment.status = 'FAILED'
                payment.save()
        except Payment.DoesNotExist:
            pass

    return Response({"status": "ok"})



