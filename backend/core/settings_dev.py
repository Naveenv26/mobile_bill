from .settings import *

DEBUG = True
ALLOWED_HOSTS = ['*']

# Use console email in dev
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Use local memory cache in dev
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}