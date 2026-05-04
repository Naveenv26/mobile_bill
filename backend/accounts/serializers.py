# accounts/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from shops.models import Shop

User = get_user_model()


# --- Nested Serializers for Validation ---

class NestedShopSerializer(serializers.ModelSerializer):
    """
    Validates the shop data.
    """
    class Meta:
        model = Shop
        fields = ['name', 'address', 'contact_phone', 'contact_email', 'language']


import re
from django.core.validators import validate_email
from django.core.exceptions import ValidationError as DjangoValidationError

def validate_password_strength(value):
    """
    8 char, 1 caps, 1 small, 1 symbol, 1 number
    """
    if len(value) < 8:
        raise serializers.ValidationError("Password must be at least 8 characters long.")
    if not re.search(r'[A-Z]', value):
        raise serializers.ValidationError("Password must contain at least one uppercase letter.")
    if not re.search(r'[a-z]', value):
        raise serializers.ValidationError("Password must contain at least one lowercase letter.")
    if not re.search(r'[0-9]', value):
        raise serializers.ValidationError("Password must contain at least one number.")
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
        raise serializers.ValidationError("Password must contain at least one special character.")

class NestedUserCreationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password_strength])
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'email']

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()


# --- Main Registration Serializer ---

class ShopRegistrationSerializer(serializers.Serializer):
    shop = NestedShopSerializer()
    owner = NestedUserCreationSerializer()
    create_shopkeeper = serializers.BooleanField(default=False)
    shopkeeper = NestedUserCreationSerializer(required=False)

    def validate(self, data):
        # 1. Validate Owner
        owner_email = data['owner']['email']
        if User.objects.filter(email__iexact=owner_email).exists():
             raise serializers.ValidationError({'owner': {'email': 'Email already registered.'}})

        # 2. Validate Shop Phone (Anti-Trial-Abuse + OTP Check)
        shop_phone = data['shop'].get('contact_phone')
        
        # Check if already registered
        if Shop.objects.filter(contact_phone=shop_phone).exists():
            raise serializers.ValidationError({'shop': {'contact_phone': 'This phone number is already registered.'}})

        # TEMPORARILY DISABLED: Check if OTP verified
        # from .models import PhoneVerification
        # if not PhoneVerification.objects.filter(phone=shop_phone, is_verified=True).exists():
        #     raise serializers.ValidationError({'shop': {'contact_phone': 'Please verify your mobile number first.'}})

        # 3. Check Usernames
        if User.objects.filter(username=data['owner']['username']).exists():
            raise serializers.ValidationError({'owner': {'username': 'An owner with this username already exists.'}})

        if data.get('create_shopkeeper') and data.get('shopkeeper'):
            if User.objects.filter(username=data['shopkeeper']['username']).exists():
                raise serializers.ValidationError({'shopkeeper': {'username': 'A shopkeeper with this username already exists.'}})
        
        return data

    @transaction.atomic
    def create(self, validated_data):
        shop_data = validated_data.pop("shop")
        owner_data = validated_data.pop("owner")
        create_shopkeeper = validated_data.pop("create_shopkeeper")
        shopkeeper_data = validated_data.pop("shopkeeper", None)

        # 1. Create Shop
        shop = Shop.objects.create(**shop_data)

        # 2. Create Owner User
        owner_password = owner_data.pop('password', None)
        owner = User.objects.create_user(
            **{k: v for k, v in owner_data.items() if k != 'password'},
            role=User.Role.SHOP_OWNER,
            shop=shop
        )
        if owner_password:
            owner.set_password(owner_password)
            owner.save()

        # 3. Create Shopkeeper if requested
        shopkeeper = None
        if create_shopkeeper and shopkeeper_data:
            shopkeeper_password = shopkeeper_data.pop('password', None)
            shopkeeper = User.objects.create_user(
                **{k: v for k, v in shopkeeper_data.items() if k != 'password'},
                role=User.Role.SHOPKEEPER,
                shop=shop
            )
            if shopkeeper_password:
                shopkeeper.set_password(shopkeeper_password)
                shopkeeper.save()

        return {
            "shop": shop,
            "owner": owner,
            "shopkeeper": shopkeeper,
        }


# --- Staff Serializer ---

class StaffSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password', 'default123')
        # create_user is used to respect any custom user manager behavior
        user = User.objects.create_user(**{k: v for k, v in validated_data.items()})
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
