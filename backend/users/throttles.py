from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """10 login attempts per minute per IP."""
    scope = 'login'


class OTPRateThrottle(AnonRateThrottle):
    """5 OTP/reset requests per hour per IP."""
    scope = 'otp'
