from django.core.mail import send_mail
from django.conf import settings
from background_task import background

@background(schedule=0)
def send_password_reset_email_async(email, reset_url):
    subject = "Password Reset - SparkBill"
    message = f"""
Hi,

Click the link below to reset your password:

{reset_url}

This link expires in 24 hours.

Thanks,
SparkBill Team
"""
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )

# Keep sync version as fallback
def send_password_reset_email(email, reset_url):
    send_password_reset_email_async(email, reset_url)