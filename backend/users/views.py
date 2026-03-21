import json
import os
import urllib.parse
import urllib.request
from rest_framework import generics, permissions, parsers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView as _BaseLoginView
from .serializers import RegisterSerializer, UserSerializer, UserProfileSerializer
from .throttles import LoginRateThrottle, OTPRateThrottle


class LoginView(_BaseLoginView):
    """JWT login with per-IP rate limiting (10/minute)."""
    throttle_classes = [LoginRateThrottle]


def _unique_username(base):
    base = base[:28]
    username = base
    n = 1
    while User.objects.filter(username=username).exists():
        username = f"{base}{n}"
        n += 1
    return username


def _save_google_picture(user, picture_url):
    """Save Google profile picture URL only if user hasn't uploaded a custom avatar."""
    if picture_url and not user.profile.avatar:
        user.profile.avatar_url = picture_url
        user.profile.save(update_fields=['avatar_url'])


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user.profile,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user, context={'request': request}).data)


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        access_token = request.data.get('access_token')
        if not access_token:
            raise AuthenticationFailed('No access_token provided.')

        try:
            req = urllib.request.Request(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            with urllib.request.urlopen(req) as resp:
                payload = json.loads(resp.read())
        except Exception:
            raise AuthenticationFailed('Invalid Google token.')

        email = payload.get('email')
        if not email:
            raise AuthenticationFailed('Google account has no email.')

        user, created = User.objects.get_or_create(email=email)
        if created:
            user.username = _unique_username(email.split('@')[0])
            user.first_name = payload.get('given_name', '')
            user.last_name = payload.get('family_name', '')
            user.save()

        _save_google_picture(user, payload.get('picture'))

        refresh = RefreshToken.for_user(user)
        return Response({'access': str(refresh.access_token), 'refresh': str(refresh)})


class GoogleCodeView(APIView):
    """Receives an authorization code from the mobile app, exchanges it for
    an access token using the client secret (kept server-side), then creates
    or retrieves the user and returns app JWT tokens."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        client_id = os.environ.get('GOOGLE_CLIENT_ID', '')
        client_secret = os.environ.get('GOOGLE_CLIENT_SECRET', '')
        code = request.data.get('code')
        code_verifier = request.data.get('codeVerifier')
        redirect_uri = request.data.get('redirectUri')

        if not code or not redirect_uri:
            raise AuthenticationFailed('code and redirectUri are required.')

        params = {
            'code': code,
            'client_id': client_id,
            'client_secret': client_secret,
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code',
        }
        if code_verifier:
            params['code_verifier'] = code_verifier

        try:
            req = urllib.request.Request(
                'https://oauth2.googleapis.com/token',
                data=urllib.parse.urlencode(params).encode(),
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                method='POST',
            )
            with urllib.request.urlopen(req) as resp:
                token_data = json.loads(resp.read())
        except Exception:
            raise AuthenticationFailed('Failed to exchange Google authorization code.')

        access_token = token_data.get('access_token')
        if not access_token:
            raise AuthenticationFailed('No access token in Google response.')

        try:
            req = urllib.request.Request(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'},
            )
            with urllib.request.urlopen(req) as resp:
                payload = json.loads(resp.read())
        except Exception:
            raise AuthenticationFailed('Failed to fetch Google user info.')

        email = payload.get('email')
        if not email:
            raise AuthenticationFailed('Google account has no email.')

        user, created = User.objects.get_or_create(email=email)
        if created:
            user.username = _unique_username(email.split('@')[0])
            user.first_name = payload.get('given_name', '')
            user.last_name = payload.get('family_name', '')
            user.save()

        _save_google_picture(user, payload.get('picture'))

        refresh = RefreshToken.for_user(user)
        return Response({'access': str(refresh.access_token), 'refresh': str(refresh)})


class SendPhoneOTPView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        profile = request.user.profile
        phone = profile.phone.strip()
        if not phone:
            return Response({'detail': 'Save a phone number to your profile first.'}, status=400)

        email = request.user.email
        if not email:
            return Response({'detail': 'No email address on your account.'}, status=400)

        import random
        code = str(random.randint(100000, 999999))

        from .models import PhoneOTP
        PhoneOTP.objects.filter(user=request.user, is_used=False).update(is_used=True)
        PhoneOTP.objects.create(user=request.user, code=code)

        from django.core.mail import send_mail
        try:
            send_mail(
                subject='MusiMeet — phone verification code',
                message=(
                    f'Hi {request.user.username},\n\n'
                    f'Your phone verification code is:\n\n'
                    f'  {code}\n\n'
                    f'This code expires in 10 minutes.\n\n'
                    f'If you did not request this, you can ignore this email.'
                ),
                from_email=None,  # uses DEFAULT_FROM_EMAIL from settings
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception:
            pass  # OTP is stored; email is best-effort

        return Response({'detail': 'Code sent!', 'email': email})


class VerifyPhoneOTPView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .models import PhoneOTP
        from django.utils import timezone
        from datetime import timedelta

        code = str(request.data.get('code', '')).strip()
        if not code:
            return Response({'detail': 'Code is required.'}, status=400)

        cutoff = timezone.now() - timedelta(minutes=10)
        otp = PhoneOTP.objects.filter(
            user=request.user,
            code=code,
            is_used=False,
            created_at__gte=cutoff,
        ).first()

        if not otp:
            return Response({'detail': 'Invalid or expired code. Try sending a new one.'}, status=400)

        otp.is_used = True
        otp.save()

        request.user.profile.phone_verified = True
        request.user.profile.save(update_fields=['phone_verified'])

        return Response(UserSerializer(request.user, context={'request': request}).data)


class ForgotPasswordRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'detail': 'Email is required.'}, status=400)

        from django.contrib.auth.models import User as AuthUser
        user = AuthUser.objects.filter(email__iexact=email).first()
        # Always respond the same way to avoid leaking which emails exist
        if user:
            import random
            code = str(random.randint(100000, 999999))
            from .models import PasswordResetOTP
            PasswordResetOTP.objects.filter(email=email, is_used=False).update(is_used=True)
            PasswordResetOTP.objects.create(email=email, code=code)
            from django.core.mail import send_mail
            try:
                send_mail(
                    subject='MusiMeet — password reset code',
                    message=(
                        f'Hi {user.username},\n\n'
                        f'Your password reset code is:\n\n'
                        f'  {code}\n\n'
                        f'This code expires in 10 minutes.\n\n'
                        f'If you did not request this, you can ignore this email.'
                    ),
                    from_email=None,
                    recipient_list=[user.email],
                    fail_silently=True,  # OTP is stored; email is best-effort
                )
            except Exception:
                pass  # Email was queued even if SMTP closed with an error

        return Response({'detail': 'If that email is registered, a reset code has been sent.'})


class ForgotPasswordConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        code = str(request.data.get('code', '')).strip()
        new_password = request.data.get('new_password', '')

        if not email or not code or not new_password:
            return Response({'detail': 'email, code, and new_password are required.'}, status=400)
        if len(new_password) < 8:
            return Response({'detail': 'Password must be at least 8 characters.'}, status=400)

        from .models import PasswordResetOTP
        from django.utils import timezone
        from datetime import timedelta
        cutoff = timezone.now() - timedelta(minutes=10)
        otp = PasswordResetOTP.objects.filter(
            email=email, code=code, is_used=False, created_at__gte=cutoff,
        ).first()

        if not otp:
            return Response({'detail': 'Invalid or expired code.'}, status=400)

        from django.contrib.auth.models import User as AuthUser
        user = AuthUser.objects.filter(email__iexact=email).first()
        if not user:
            return Response({'detail': 'No account found for this email.'}, status=400)

        user.set_password(new_password)
        user.save()
        otp.is_used = True
        otp.save()

        return Response({'detail': 'Password reset successfully. You can now log in.'})


class UpdatePushTokenView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = request.data.get('token', '').strip()
        if token:
            request.user.profile.expo_push_token = token
            request.user.profile.save(update_fields=['expo_push_token'])
        return Response({'ok': True})


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current = request.data.get('current_password', '')
        new_pw = request.data.get('new_password', '')
        if not request.user.check_password(current):
            return Response({'detail': 'Current password is incorrect.'}, status=400)
        if len(new_pw) < 8:
            return Response({'detail': 'New password must be at least 8 characters.'}, status=400)
        request.user.set_password(new_pw)
        request.user.save()
        return Response({'detail': 'Password updated.'})


class ChangeEmailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        password = request.data.get('password', '')
        new_email = request.data.get('new_email', '').strip().lower()
        if not request.user.check_password(password):
            return Response({'detail': 'Password is incorrect.'}, status=400)
        if not new_email:
            return Response({'detail': 'Email is required.'}, status=400)
        if User.objects.filter(email__iexact=new_email).exclude(pk=request.user.pk).exists():
            return Response({'detail': 'Email already in use.'}, status=400)
        request.user.email = new_email
        request.user.save()
        return Response({'detail': 'Email updated.'})


class DeleteAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        password = request.data.get('password', '')
        if not request.user.check_password(password):
            return Response({'detail': 'Password is incorrect.'}, status=400)
        request.user.delete()
        return Response({'detail': 'Account deleted.'})


class MusicianListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = User.objects.select_related('profile').filter(profile__isnull=False)
        q = self.request.query_params.get('q', '').strip()
        instrument = self.request.query_params.get('instrument', '').strip()
        genre = self.request.query_params.get('genre', '').strip()
        skill = self.request.query_params.get('skill_level', '').strip()
        if q:
            qs = qs.filter(username__icontains=q)
        if instrument:
            qs = qs.filter(profile__instruments__icontains=instrument)
        if genre:
            qs = qs.filter(profile__genres__icontains=genre)
        if skill:
            qs = qs.filter(profile__skill_level=skill)
        return qs.order_by('username')


class PublicProfileView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    queryset = User.objects.select_related('profile').all()
    lookup_field = 'username'


class FacebookLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        access_token = request.data.get('access_token')
        if not access_token:
            raise AuthenticationFailed('No access_token provided.')

        try:
            url = (
                'https://graph.facebook.com/me'
                '?fields=id,name,email'
                f'&access_token={access_token}'
            )
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req) as resp:
                payload = json.loads(resp.read())
        except Exception:
            raise AuthenticationFailed('Invalid Facebook token.')

        fb_id = payload.get('id')
        email = payload.get('email') or f"{fb_id}@facebook.com"
        name = payload.get('name', 'user')

        user, created = User.objects.get_or_create(email=email)
        if created:
            base = name.replace(' ', '').lower()
            user.username = _unique_username(base)
            parts = name.split(' ')
            user.first_name = parts[0]
            user.last_name = parts[-1] if len(parts) > 1 else ''
            user.save()

        refresh = RefreshToken.for_user(user)
        return Response({'access': str(refresh.access_token), 'refresh': str(refresh)})
