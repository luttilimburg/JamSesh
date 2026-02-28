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
from .serializers import RegisterSerializer, UserSerializer, UserProfileSerializer


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
