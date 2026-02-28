from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, MeView, GoogleLoginView, GoogleCodeView, FacebookLoginView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('google/', GoogleLoginView.as_view(), name='google_login'),
    path('google-code/', GoogleCodeView.as_view(), name='google_code'),
    path('facebook/', FacebookLoginView.as_view(), name='facebook_login'),
]
