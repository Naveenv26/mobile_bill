from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
import threading

def _send_password_reset_email_task(email, reset_url):
    subject = "Reset Your Password - SparkBill"
    context = {'reset_url': reset_url}
    
    # Render the HTML template
    html_content = render_to_string('emails/password_reset.html', context)
    # Create a plain-text version for backup
    text_content = strip_tags(html_content)
    
    msg = EmailMultiAlternatives(
        subject,
        text_content,
        settings.DEFAULT_FROM_EMAIL,
        [email]
    )
    msg.attach_alternative(html_content, "text/html")
    msg.send(fail_silently=False)

def send_password_reset_email(email, reset_url):
    _send_password_reset_email_task(email, reset_url)