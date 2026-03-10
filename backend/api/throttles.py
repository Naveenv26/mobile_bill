from rest_framework.throttling import AnonRateThrottle

class ForgotPasswordThrottle(AnonRateThrottle):
    rate = '5/hour'
    scope = 'forgot_password'

class LoginThrottle(AnonRateThrottle):
    rate = '10/hour'
    scope = 'login'