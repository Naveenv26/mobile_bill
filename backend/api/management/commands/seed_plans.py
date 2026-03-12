# backend/seed_plans.py

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import SubscriptionPlan

# Clear old plans
SubscriptionPlan.objects.all().delete()
print("Cleared old plans...")

# FREE Trial — 30 days, all features
SubscriptionPlan.objects.create(
    name="Free Trial",
    plan_type="FREE",
    duration="MONTHLY",
    price=0,
    duration_days=30,
    features={
        "billing": True,
        "stock": True,
        "reports": True,
        "export": True,
        "expenses": True,
        "whatsapp": True,
        "customers": True,
        "staff": True,
    },
    is_active=True
)

# PRO — ₹300/month, all features
SubscriptionPlan.objects.create(
    name="Pro Monthly",
    plan_type="PRO",
    duration="MONTHLY",
    price=300,
    duration_days=30,
    features={
        "billing": True,
        "stock": True,
        "reports": True,
        "export": True,
        "expenses": True,
        "whatsapp": True,
        "customers": True,
        "staff": True,
    },
    is_active=True
)

print("✅ Plans seeded successfully!")
for plan in SubscriptionPlan.objects.all():
    print(f"  - {plan.name} | ₹{plan.price} | {plan.duration_days} days")