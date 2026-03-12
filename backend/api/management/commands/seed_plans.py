# backend/api/management/commands/seed_plans.py
from django.core.management.base import BaseCommand
from api.models import SubscriptionPlan

FULL_FEATURES = {
    "billing": True,
    "stock": True,
    "reports": True,
    "export": True,
    "expenses": True,
    "whatsapp": True,
    "customers": True,
    "staff": True,
}

class Command(BaseCommand):
    help = 'Seeds the required FREE and PRO subscription plans'

    def handle(self, *args, **kwargs):
        free, created = SubscriptionPlan.objects.update_or_create(
            plan_type='FREE',
            defaults={
                'name': 'Free Trial',
                'duration': 'MONTHLY',
                'price': 0,
                'duration_days': 30,
                'is_active': True,
                'description': '30-day free trial — full access',
                'features': FULL_FEATURES,
            }
        )
        self.stdout.write(
            self.style.SUCCESS(f'{"✅ Created" if created else "🔄 Updated"} FREE plan (id={free.id})')
        )

        pro, created = SubscriptionPlan.objects.update_or_create(
            plan_type='PRO',
            defaults={
                'name': 'Pro Monthly',
                'duration': 'MONTHLY',
                'price': 300,
                'duration_days': 30,
                'is_active': True,
                'description': 'Full access — ₹300/month',
                'features': FULL_FEATURES,
            }
        )
        self.stdout.write(
            self.style.SUCCESS(f'{"✅ Created" if created else "🔄 Updated"} PRO plan (id={pro.id})')
        )

        self.stdout.write(self.style.SUCCESS('\n✅ Seed complete!'))
        for plan in SubscriptionPlan.objects.all():
            self.stdout.write(f'   → {plan.name} | ₹{plan.price} | {plan.duration_days} days | active={plan.is_active}')