# backend/api/views.py
from django.db import transaction
from django.db.models import F
# --- Django Imports ---
from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.db.models import Sum, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

# --- 3rd Party Imports ---
import razorpay
from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .pagination import SmallPagination, StandardPagination, LargePagination
from .throttles import ForgotPasswordThrottle
from rest_framework.exceptions import PermissionDenied

# --- Local App Imports ---
# Serializers (from .serializers)
from .serializers import (
    SubscriptionPlanSerializer,
    RegisterSerializer,
    ProductSerializer,
    CustomerSerializer,
    InvoiceSerializer,
    ShopSerializer,
    PaymentSerializer,
    UserSubscriptionSerializer,
    UserSerializer,
)

# Staff serializer import from accounts
from accounts.serializers import StaffSerializer
import random
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from accounts.models import PhoneVerification

@api_view(['POST'])
@permission_classes([AllowAny])
def check_availability(request):
    email = request.data.get('email')
    mobile = request.data.get('mobile')
    
    if email:
        if User.objects.filter(email__iexact=email).exists():
            return Response({"error": "This email is already registered."}, status=400)
    
    if mobile:
        from shops.models import Shop
        if Shop.objects.filter(contact_phone=mobile).exists():
            return Response({"error": "This mobile number is already registered."}, status=400)
            
    return Response({"message": "Available"})

@api_view(['POST'])
@permission_classes([AllowAny])
def send_otp(request):
    phone = request.data.get('phone')
    if not phone or len(phone) != 10:
        return Response({"error": "Invalid 10-digit phone number."}, status=400)
    
    otp = str(random.randint(100000, 999999))
    obj, _ = PhoneVerification.objects.update_or_create(
        phone=phone,
        defaults={'otp': otp, 'is_verified': False}
    )
    
    # Send SMS via Brevo API
    api_key = getattr(settings, 'BREVO_API_KEY', None)
    if api_key and api_key != 'YOUR_BREVO_API_KEY_HERE':
        import requests
        url = "https://api.brevo.com/v3/transactionalSMS/sms"
        payload = {
            "type": "transactional",
            "unicodeEnabled": True,
            "sender": "SPARKB",  # Max 11 characters
            "recipient": f"+91{phone}",
            "content": f"Your SparkBill verification code is: {otp}. Valid for 5 minutes."
        }
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": api_key
        }
        try:
            response = requests.post(url, json=payload, headers=headers)
            if response.status_code not in [200, 201]:
                print(f"Brevo SMS Error: {response.text}")
        except Exception as e:
            print(f"SMS Exception: {str(e)}")

    print(f"--- OTP for {phone}: {otp} ---") 
    
    return Response({"message": "OTP sent successfully!"})

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def admin_otp_logs(request):
    if request.user.role != 'SITE_ADMIN':
        return Response({"error": "Unauthorized"}, status=403)
    
    logs = PhoneVerification.objects.all().order_by('-updated_at')[:50]
    data = [{
        "phone": l.phone,
        "otp": l.otp,
        "verified": l.is_verified,
        "time": l.updated_at
    } for l in logs]
    return Response(data)

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    phone = request.data.get('phone')
    otp = request.data.get('otp')
    
    try:
        verify = PhoneVerification.objects.get(phone=phone, otp=otp)
        verify.is_verified = True
        verify.save()
        return Response({"message": "Phone verified successfully!", "verified": True})
    except PhoneVerification.DoesNotExist:
        return Response({"error": "Invalid OTP."}, status=400)

# Models (from *THIS* app - 'api')
from .models import SubscriptionPlan, Payment, UserSubscription
# from .models import Expense # Uncomment if you use Expense in this file

# Models (from *OTHER* apps)
from catalog.models import Product
from customers.models import Customer
from sales.models import Invoice
from shops.models import Shop

from .models import Feedback
from .serializers import FeedbackSerializer

# Email utilities
from .emails import send_password_reset_email

# --- Setup ---
User = get_user_model()


# ---------- Registration ----------
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


# ---------- Subscription ----------
class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = (permissions.IsAuthenticated,)


# ---------- Reports ----------
class ReportsViewSet(viewsets.ViewSet):
    permission_classes = (permissions.IsAuthenticated,)

    @action(detail=False, methods=['get'])
    def sales_summary(self, request):
        if not request.user.shop:
            return Response({"error": "User is not associated with a shop"}, status=400)

        summary = Invoice.objects.filter(shop=request.user.shop).aggregate(
            total_sales=Sum('grand_total'),
            total_invoices=Count('id')
        )

        return Response({
            "total_sales": summary['total_sales'] or 0,
            "total_invoices": summary['total_invoices'] or 0
        })

    def list(self, request):
        return Response({"detail": "Reports endpoint"})


# ---------- Base Class for Shop Filtering ----------
class ShopFilteredViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet that automatically filters querysets by request.user.shop
    and assigns request.user.shop on creation.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        base_queryset = super().get_queryset()

        if user.is_authenticated and hasattr(user, 'shop') and user.shop is not None:
            return base_queryset.filter(shop=user.shop)

        return base_queryset.none()

    def perform_create(self, serializer):
        if hasattr(self.request.user, 'shop') and self.request.user.shop is not None:
            serializer.save(shop=self.request.user.shop)
        else:
            raise permissions.ValidationError("You are not associated with a shop and cannot create this object.")


# ---------- Standard CRUD (FIXED with Filtering) ----------
class ProductViewSet(ShopFilteredViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'unit']
    search_fields = ['name', 'sku']
    ordering_fields = ['name', 'price', 'quantity', 'updated_at']
    ordering = ['name']

class CustomerViewSet(ShopFilteredViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    pagination_class = StandardPagination  


class InvoiceViewSet(ShopFilteredViewSet):
    queryset = Invoice.objects.all().order_by('-invoice_date')
    serializer_class = InvoiceSerializer
    pagination_class = StandardPagination

    def get_queryset(self):              # ✅ fix indent — should be 4 spaces
        return Invoice.objects.filter(   # ✅ not 8 spaces
            shop=self.request.user.shop
        ).select_related(
            'customer', 'created_by', 'shop'
        ).prefetch_related(
            'items__product'
        ).order_by('-invoice_date')

    @transaction.atomic
    def perform_create(self, serializer):
        user = self.request.user
        shop = user.shop

        # Save invoice first
        invoice = serializer.save(
            shop=shop,
            created_by=user
        )

        # ✅ Deduct stock atomically for each item
        for item in invoice.items.select_related('product').all():
            updated = Product.objects.filter(
                id=item.product_id,
                shop=shop,
                quantity__gte=item.qty       # only update if enough stock
            ).update(
                quantity=F('quantity') - item.qty
            )

            if updated == 0:
                # Check if it's an oversell or race condition
                product = Product.objects.get(id=item.product_id)
                if product.quantity < item.qty:
                    item.oversold = True      # ✅ mark as oversold
                    item.save()
                # Don't block the sale — just flag it

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        invoice = self.get_object()
        # Lock the shop row during renumbering to prevent race conditions
        shop = Shop.objects.select_for_update().get(id=invoice.shop_id)
        
        # 1. Revert stock
        for item in invoice.items.all():
            Product.objects.filter(id=item.product_id, shop=shop).update(
                quantity=F('quantity') + item.qty
            )
        
        # 2. Identify the sequence number of the deleted invoice
        try:
            parts = invoice.number.split('-')
            current_num = int(parts[-1])
        except (ValueError, IndexError):
            invoice.delete()
            return Response({"message": "Invoice deleted (non-standard format)"}, status=status.HTTP_200_OK)

        invoice.delete()

        # 3. Decrement shop counter
        if shop.counter_invoice > 0:
            shop.counter_invoice = F('counter_invoice') - 1
            shop.save()

        # 4. Renumber subsequent invoices
        subsequent_invoices = Invoice.objects.filter(shop=shop).order_by('id')
        
        to_update = []
        for inv in subsequent_invoices:
            try:
                inv_parts = inv.number.split('-')
                inv_num = int(inv_parts[-1])
                if inv_num > current_num:
                    inv_parts[-1] = str(inv_num - 1)
                    inv.number = '-'.join(inv_parts)
                    to_update.append(inv)
            except (ValueError, IndexError):
                continue
        
        for inv in sorted(to_update, key=lambda x: int(x.number.split('-')[-1])):
            inv.save(update_fields=['number'])

        return Response({"message": "Invoice deleted and sequence renumbered successfully."}, status=status.HTTP_200_OK)
class ShopViewSet(viewsets.ModelViewSet):
    queryset = Shop.objects.all()
    serializer_class = ShopSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and hasattr(user, 'shop') and user.shop is not None:
            return Shop.objects.filter(id=user.shop.id)
        return Shop.objects.none()

    def perform_update(self, serializer):
        if self.request.user.role not in ['SHOP_OWNER', 'SITE_ADMIN']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only shop owners can update shop settings.")
        serializer.save()


# ---------- Staff ViewSet (NEW) ----------
class StaffViewSet(viewsets.ModelViewSet):
    serializer_class = StaffSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        if hasattr(self.request.user, 'shop') and self.request.user.shop:
            return User.objects.filter(shop=self.request.user.shop).exclude(id=self.request.user.id)
        return User.objects.none()

    def perform_create(self, serializer):
        user = self.request.user

        if user.role not in ['SHOP_OWNER', 'SITE_ADMIN']:
            raise PermissionDenied("Only shop owners can create staff.")

        if not user.shop:
            raise PermissionDenied("You are not associated with a shop.")

        role = serializer.validated_data.get('role', 'SHOPKEEPER')
        if role == 'SITE_ADMIN':
            raise PermissionDenied("Cannot create Site Admin via this endpoint.")

        serializer.save(shop=user.shop)

    def perform_destroy(self, instance):
        if instance.shop != self.request.user.shop:
            raise PermissionDenied("Cannot delete staff from another shop.")
        instance.delete()


# ---------- Current User (FIXED) ----------
class MeViewSet(viewsets.ViewSet):
    permission_classes = (permissions.IsAuthenticated,)

    def list(self, request):
        user = request.user
        user_data = UserSerializer(user).data

        shop_data = None
        if getattr(user, "shop", None):
            shop_data = ShopSerializer(user.shop).data

        return Response({
            "user": user_data,
            "shop": shop_data
        })


# ---------- Payment & Subscription Views ----------
RAZORPAY_KEY_ID = settings.RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET = settings.RAZORPAY_KEY_SECRET

razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_subscription(request):
    subscription, created = UserSubscription.objects.get_or_create(user=request.user)
    if created:
        subscription.start_trial()

    return Response({
        "is_valid": subscription.is_valid(),
        "status": subscription.get_status(),       # "trial" / "active" / "grace" / "expired"
        "days_remaining": subscription.days_remaining(),
        "plan": subscription.plan.name if subscription.plan else None,
        "plan_type": subscription.plan.plan_type if subscription.plan else None,
        "expiry_date": subscription.end_date or subscription.trial_end_date,
        "admin_override": subscription.allowed_by_admin,
        "features": subscription.get_features(),
    })

# ---------- Forgot Password ----------
from rest_framework.views import APIView


class ForgotPasswordView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = [ForgotPasswordThrottle]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required."}, status=400)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"message": "If an account with this email exists, a reset link has been sent."})

        token = PasswordResetTokenGenerator().make_token(user)
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        frontend_url = settings.FRONTEND_URL or "http://localhost:5173"
        reset_url = f"{frontend_url}/reset-password/{uidb64}/{token}"

        send_password_reset_email(email, reset_url)
        return Response({"message": "Password reset link sent to your email."})


# ---------- Reset Password ----------
class ResetPasswordView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = get_object_or_404(User, pk=uid)
        except Exception:
            return Response({"error": "Invalid link."}, status=400)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({"error": "Invalid or expired token."}, status=400)

        password = request.data.get("password")
        password2 = request.data.get("password2")

        if not password or not password2:
            return Response({"error": "Password fields are required."}, status=400)

        if password != password2:
            return Response({"error": "Passwords do not match."}, status=400)

        user.set_password(password)
        user.save()
        return Response({"message": "Password reset successful."}, status=200)


class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Users only see their own feedback
        return Feedback.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)