from django.db import models

class Product(models.Model):
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=140)
    sku = models.CharField(max_length=64, blank=True)
    unit = models.CharField(max_length=20, default='pcs')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    low_stock_threshold = models.PositiveIntegerField(default=0)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        indexes = [
            models.Index(fields=['shop', 'is_active']),
            models.Index(fields=['shop', 'name']),
        ]
        
    def __str__(self):
        return self.name


# ✅ Add this below — don't touch anything above
class StockHistory(models.Model):
    ACTION_CHOICES = [
        ('SALE', 'Sale'),
        ('RESTOCK', 'Restock'),
        ('ADJUSTMENT', 'Adjustment'),
        ('RETURN', 'Return'),
    ]
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_history')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    quantity_change = models.DecimalField(max_digits=12, decimal_places=2)
    quantity_before = models.DecimalField(max_digits=12, decimal_places=2)
    quantity_after = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']