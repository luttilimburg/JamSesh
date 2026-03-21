from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, LoginView, MeView, GoogleLoginView, GoogleCodeView, FacebookLoginView, PublicProfileView, MusicianListView, SendPhoneOTPView, VerifyPhoneOTPView, ForgotPasswordRequestView, ForgotPasswordConfirmView, UpdatePushTokenView, ChangePasswordView, ChangeEmailView, DeleteAccountView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('phone/send-otp/', SendPhoneOTPView.as_view(), name='phone-send-otp'),
    path('phone/verify/', VerifyPhoneOTPView.as_view(), name='phone-verify'),
    path('google/', GoogleLoginView.as_view(), name='google_login'),
    path('google-code/', GoogleCodeView.as_view(), name='google_code'),
    path('facebook/', FacebookLoginView.as_view(), name='facebook_login'),
    path('password/forgot/', ForgotPasswordRequestView.as_view(), name='password-forgot'),
    path('password/reset/', ForgotPasswordConfirmView.as_view(), name='password-reset'),
    path('push-token/', UpdatePushTokenView.as_view(), name='push-token'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('change-email/', ChangeEmailView.as_view(), name='change-email'),
    path('delete-account/', DeleteAccountView.as_view(), name='delete-account'),
    path('musicians/', MusicianListView.as_view(), name='musicians'),
    path('users/<str:username>/', PublicProfileView.as_view(), name='public-profile'),
]
