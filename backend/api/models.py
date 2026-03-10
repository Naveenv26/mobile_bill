# backend/api/models.py
from django.core.cache import cache
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


# ========== SUBSCRIPTION PLANS ==========
class SubscriptionPlan(models.Model):

    PLAN_TYPE_CHOICES = [
        ('FREE', 'Free Trial'),
        ('PRO', 'Pro'),
    ]

    DURATION_CHOICES = [
        ('MONTHLY', 'Monthly'),
        ('YEARLY', 'Yearly'),
    ]

    name = models.CharField(max_length=100, default='Default Plan Name')
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPE_CHOICES, default='FREE')
    duration = models.CharField(max_length=20, choices=DURATION_CHOICES, default='MONTHLY')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    duration_days = models.IntegerField(help_text="Plan validity in days", default=30)

    # All features stored here as JSON
    # Example: {"billing": true, "stock": true, "reports": true,
    #           "export": true, "expenses": true, "whatsapp": true,
    #           "customers": true, "staff": true}
    features = models.JSONField(default=dict, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['plan_type', 'duration']

    def __str__(self):
        return f"{self.get_plan_type_display()} - {self.get_duration_display()} (₹{self.price})"


# ========== USER SUBSCRIPTION ==========
class UserSubscription(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="usersubscription"
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        null=True, blank=True,
        on_delete=models.SET_NULL
    )

    # Trial management
    trial_used = models.BooleanField(default=False)
    trial_start_date = models.DateTimeField(null=True, blank=True)
    trial_end_date = models.DateTimeField(null=True, blank=True)

    # Paid subscription dates
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)

    # Status
    active = models.BooleanField(default=False)
    allowed_by_admin = models.BooleanField(default=False)  # Admin override

    # Grace period (3 days after expiry before full lockout)
    grace_period_end = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --------------------------------------------------
    # TRIAL
    # --------------------------------------------------
    def start_trial(self):
        """
        Auto-called on registration.
        30-day free trial with ALL features unlocked.
        """
        if self.trial_used:
            return False
        try:
            free_plan = SubscriptionPlan.objects.get(
                plan_type='FREE', duration='MONTHLY'
            )
        except SubscriptionPlan.DoesNotExist:
            return False

        self.plan = free_plan
        self.trial_used = True
        self.trial_start_date = timezone.now()
        self.trial_end_date = timezone.now() + timedelta(days=30)
        self.active = True
        self.save()
        return True

    # --------------------------------------------------
    # PAID PLAN ACTIVATION (called after Razorpay success)
    # --------------------------------------------------
    def activate_paid_plan(self, plan):
        """
        Activates ₹300/month PRO plan after successful payment.
        Clears all trial fields.
        """
        self.plan = plan
        self.active = True
        self.start_date = timezone.now()
        self.end_date = timezone.now() + timedelta(days=plan.duration_days)
        self.grace_period_end = None

        # Clear trial fields — user is now on paid plan
        self.trial_start_date = None
        self.trial_end_date = None

        self.save()
        cache.delete(f"sub_valid_{self.user.id}")

    # Keep old name as alias so existing calls don't break
    def activate_plan(self, plan):
        return self.activate_paid_plan(plan)

    # --------------------------------------------------
    # GRACE PERIOD
    # --------------------------------------------------
    def enter_grace_period(self):
        """
        3-day grace period after subscription/trial expires.
        User still has access but should be shown a payment reminder.
        """
        self.grace_period_end = timezone.now() + timedelta(days=3)
        self.active = False
        self.save()
        cache.delete(f"sub_valid_{self.user.id}")

    # --------------------------------------------------
    # STATUS CHECKS
    # --------------------------------------------------
    def is_trial_active(self):
        """Returns True only if user is currently in their 30-day trial."""
        if not self.trial_used or not self.active:
            return False
        if not self.plan or self.plan.plan_type != 'FREE':
            return False
        return bool(self.trial_end_date and timezone.now() <= self.trial_end_date)

    def is_paid_active(self):
        """Returns True only if user has an active paid PRO subscription."""
        if not self.active or not self.end_date:
            return False
        if not self.plan or self.plan.plan_type == 'FREE':
            return False
        return timezone.now() <= self.end_date

    def is_in_grace(self):
        """Returns True if user is in the 3-day grace period."""
        if not self.grace_period_end:
            return False
        return timezone.now() <= self.grace_period_end

    def is_valid(self):
        """
        Master access check — called by middleware on every request.
        Returns True if user should have access to the app.
        """
        if self.allowed_by_admin:
            return True
        return self.is_trial_active() or self.is_paid_active() or self.is_in_grace()

    # --------------------------------------------------
    # HELPER METHODS (used by frontend)
    # --------------------------------------------------
    def get_status(self):
        """
        Returns human-readable status string for the frontend.
        Possible values: 'trial' | 'active' | 'grace' | 'expired' | 'admin_override'
        """
        if self.allowed_by_admin:
            return "admin_override"
        if self.is_trial_active():
            return "trial"
        if self.is_paid_active():
            return "active"
        if self.is_in_grace():
            return "grace"
        return "expired"

    def days_remaining(self):
        """
        Returns number of days left in current period.
        Used to show countdown in frontend.
        """
        now = timezone.now()
        if self.is_trial_active():
            return max(0, (self.trial_end_date - now).days)
        if self.is_paid_active():
            return max(0, (self.end_date - now).days)
        if self.is_in_grace():
            return max(0, (self.grace_period_end - now).days)
        return 0

    def get_plan_type(self):
        """Returns current plan type string e.g. 'FREE' or 'PRO'."""
        return self.plan.plan_type if self.plan else None

    def get_features(self):
        """
        Returns features dict of current plan.
        Returns empty dict if subscription is not valid.
        """
        if not self.is_valid():
            return {}
        return self.plan.features if self.plan else {}

    def has_feature(self, feature_name):
        """
        Check if user has access to a specific feature by name.
        Usage: subscription.has_feature('reports')
        """
        if self.allowed_by_admin:
            return True
        return self.get_features().get(feature_name, False)

    def __str__(self):
        return f"{self.user.email} | {self.get_status()} | {self.days_remaining()}d left"


# ========== PAYMENT TRACKING ==========
class Payment(models.Model):
    STATUS_CHOICES = [
        ('CREATED', 'Created'),
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payments"
    )
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True)

    # Razorpay details
    order_id = models.CharField(max_length=255, unique=True)
    payment_id = models.CharField(max_length=255, blank=True, null=True)
    signature = models.CharField(max_length=500, blank=True, null=True)

    # Payment info
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CREATED')

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Admin notes
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} | {self.plan} | {self.status} | ₹{self.amount}"


# ========== EXPENSES (PRO FEATURE) ==========
class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('RENT', 'Rent'),
        ('UTILITIES', 'Utilities'),
        ('SALARY', 'Salary'),
        ('INVENTORY', 'Inventory Purchase'),
        ('TRANSPORT', 'Transport'),
        ('MAINTENANCE', 'Maintenance'),
        ('OTHER', 'Other'),
    ]

    shop = models.ForeignKey(
        'shops.Shop',
        on_delete=models.CASCADE,
        related_name='expenses'
    )
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    date = models.DateField(default=timezone.now)

    receipt_number = models.CharField(max_length=100, blank=True, null=True)
    vendor_name = models.CharField(max_length=200, blank=True, null=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.category} - ₹{self.amount} - {self.date}"


# ========== FEEDBACK ==========
class Feedback(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.IntegerField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.rating} Stars"