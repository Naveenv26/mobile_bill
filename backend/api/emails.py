from django.core.mail import send_mail
from django.conf import settings
import threading

def _send_password_reset_email_task(email, reset_url):
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

def send_password_reset_email(email, reset_url):
    # Launch email task in a separate thread so it doesn't block the request
    thread = threading.Thread(target=_send_password_reset_email_task, args=(email, reset_url))
    thread.daemon = True
    thread.start()