from rest_framework.views import exception_handler
from rest_framework.response import Response
from django.conf import settings

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return Response(
            {
                "error": "Internal Server Error",
                "message": str(exc)
            },
            status=500
        )
    return response