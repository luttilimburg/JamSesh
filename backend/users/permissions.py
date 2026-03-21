from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied


class IsNotBanned(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        profile = getattr(request.user, 'profile', None)
        if profile and profile.is_banned:
            raise PermissionDenied('Your account has been suspended. Please contact support.')
        return True
