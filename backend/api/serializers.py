from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.db import transaction
from django.db.models import F
import re

# Models
from .models import SubscriptionPlan, UserSubscription, Payment, Expense, Feedback
from shops.models import Shop, TaxProfile
from catalog.models import Product
from customers.models import Customer
from sales.models import Invoice, InvoiceItem

User = get_user_model()

# ============================
# USER & AUTH SERIALIZERS
# ============================

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "shop")
        read_only_fields = ("id", "role", "shop")

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "password2", "first_name", "last_name")

    def validate_username(self, value):
        if len(value) < 4:
            raise serializers.ValidationError("Username must be at least 4 characters long.")
        if not re.match(r"^[A-Za-z0-9_]+$", value):
            raise serializers.ValidationError("Username may contain only letters, numbers and underscore.")
        return value

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not re.search(r"\d", value):
            raise serializers.ValidationError("Password must contain at least one number.")
        return value

    def validate(self, attrs):
        pw = attrs.get("password")
        pw2 = attrs.get("password2") or attrs.get("password")
        if pw != pw2:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2", None)
        password = validated_data.pop("password")
        
        email = validated_data.get("email", "")
        username = validated_data.get("username", email)

        user = User(
            username=username,
            email=email,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )
        user.set_password(password)
        user.save()
        return user


# ============================
# SHOP & PRODUCT SERIALIZERS
# ============================

class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = "__all__"
        read_only_fields = ("id",)

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = ("id", "shop")

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price must be non-negative.")
        return value

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Quantity must be non-negative.")
        return value

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = ("id",)


# ============================
# INVOICE SERIALIZERS
# ============================

class InvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = InvoiceItem
        fields = ("id", "product", "product_name", "qty", "unit_price", "tax_rate")
        read_only_fields = ("id", "product_name")

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)
    # Allow frontend to send these, but we process them manually
    customer_name = serializers.CharField(allow_blank=True, required=False, write_only=True)
    customer_mobile = serializers.CharField(allow_blank=True, required=False, write_only=True)
    customer_detail = CustomerSerializer(source="customer", read_only=True)

    class Meta:
        model = Invoice
        fields = (
            "id", "shop", "customer", "customer_detail", "customer_name", "customer_mobile",
            "created_at", "total_amount", "subtotal", "tax_total", "grand_total", "status", "items",
            "invoice_date", "number", "payment_mode"
        )
        # IMPORTANT: Totals are read_only so backend calculates them
        read_only_fields = (
            "id", "shop", "customer", "created_at", "total_amount", "subtotal",
            "tax_total", "grand_total", "customer_detail", "invoice_date", "number"
        )

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        request = self.context.get('request')
        
        shop = Shop.objects.select_for_update().get(id=request.user.shop.id)

        # 1. Generate Invoice Number
        shop.counter_invoice = F('counter_invoice') + 1
        shop.save()
        shop.refresh_from_db()
        # Example: "INV-10-1" (ShopID-Counter)
        formatted_number = f"INV-{shop.id}-{shop.counter_invoice}"

        # 2. Handle Customer
        c_name = validated_data.pop("customer_name", "Walk-in")
        c_mobile = validated_data.pop("customer_mobile", None)
        customer = None
        if c_mobile:
            customer, _ = Customer.objects.get_or_create(
                shop=shop, mobile=c_mobile, defaults={'name': c_name, 'email': ''}
            )

        # 3. Create Invoice (Totals 0 initially)
        invoice = Invoice.objects.create(
            shop=shop,
            customer=customer,
            customer_name=c_name,
            customer_mobile=c_mobile,
            status="PAID",
            number=formatted_number,
            payment_mode=validated_data.get('payment_mode', 'cash'),
            created_by=request.user,
            grand_total=0 
        )

        # 4. Calculate Totals from Items
        total_calc = 0
        tax_calc = 0

        for item in items_data:
            prod = item['product']
            qty = item['qty']
            price = item['unit_price']
            tax = item.get('tax_rate', 0)

            line_total = price * qty
            line_tax = (line_total * tax) / 100
            
            total_calc += line_total
            tax_calc += line_tax

            InvoiceItem.objects.create(
                invoice=invoice, product=prod, qty=qty, unit_price=price,
                tax_rate=tax, line_total=line_total + line_tax
            )
            
            # Reduce Stock
            prod.quantity = F('quantity') - qty
            prod.save()

        # 5. Save Final Totals
        invoice.subtotal = total_calc
        invoice.tax_total = tax_calc
        invoice.grand_total = total_calc + tax_calc
        invoice.total_amount = invoice.grand_total
        invoice.save()

        return invoice

# ============================
# OTHER SERIALIZERS
# ============================

class TaxProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxProfile
        fields = "__all__"
        read_only_fields = ("id",)

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    plan_type_display = serializers.CharField(source='get_plan_type_display', read_only=True)
    duration_display = serializers.CharField(source='get_duration_display', read_only=True)
    
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'plan_type', 'plan_type_display',
            'duration', 'duration_display', 'price', 'duration_days',
            'features', 'is_active', 'created_at'
        ]

class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    plan_type = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    is_trial = serializers.SerializerMethodField()
    
    class Meta:
        model = UserSubscription
        fields = [
            'id', 'plan', 'plan_details', 'plan_type',
            'trial_used', 'trial_end_date', 'start_date', 'end_date',
            'active', 'allowed_by_admin', 'grace_period_end',
            'days_remaining', 'is_trial', 'created_at'
        ]
    
    def get_plan_type(self, obj):
        return obj.get_plan_type()
    
    def get_days_remaining(self, obj):
        from django.utils import timezone
        if obj.is_trial_active():
            delta = obj.trial_end_date - timezone.now()
            return max(0, delta.days)
        if obj.end_date:
            delta = obj.end_date - timezone.now()
            return max(0, delta.days)
        return 0
    
    def get_is_trial(self, obj):
        return obj.is_trial_active()

class PaymentSerializer(serializers.ModelSerializer):
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'user', 'user_email', 'user_name',
            'plan', 'plan_details', 'order_id', 'payment_id',
            'amount', 'currency', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['order_id', 'payment_id', 'status']

class CreateOrderSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField()
    
    def validate_plan_id(self, value):
        try:
            SubscriptionPlan.objects.get(id=value, is_active=True)
            return value
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive plan.")

class VerifyPaymentSerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()

class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Expense
        fields = [
            'id', 'shop', 'category', 'category_display',
            'amount', 'description', 'date', 'receipt_number',
            'vendor_name', 'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['created_by', 'created_at']

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ['id', 'rating', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']