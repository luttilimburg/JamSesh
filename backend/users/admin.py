from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import UserProfile


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    fields = ['strike_count', 'is_banned', 'instruments', 'skill_level', 'bio', 'location', 'phone']


class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]
    list_display = ['username', 'email', 'get_strikes', 'get_banned', 'is_active', 'date_joined']

    @admin.display(description='Strikes', ordering='profile__strike_count')
    def get_strikes(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.strike_count if profile else 0

    @admin.display(description='Banned', boolean=True)
    def get_banned(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.is_banned if profile else False


admin.site.unregister(User)
admin.site.register(User, UserAdmin)
