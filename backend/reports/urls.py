# backend/reports/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('summary/', views.sales_summary, name='sales-summary'),
    path('top-products/', views.top_products, name='top-products'),
    path('low-stock/', views.low_stock, name='low-stock'),
    path('payment-modes/', views.payment_mode_breakdown, name='payment-modes'),
]