from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    SKILL_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    instruments = models.CharField(max_length=255, blank=True)
    genres = models.CharField(max_length=255, blank=True)
    skill_level = models.CharField(max_length=50, choices=SKILL_CHOICES, blank=True)
    bio = models.TextField(blank=True)
    location = models.CharField(max_length=255, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    avatar_url = models.URLField(max_length=500, blank=True)  # Google / social photo URL
    instagram_handle = models.CharField(max_length=100, blank=True)
    tiktok_handle = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    phone_verified = models.BooleanField(default=False)
    strike_count = models.PositiveIntegerField(default=0)
    is_banned = models.BooleanField(default=False)
    expo_push_token = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return f"{self.user.username}'s profile"


class PhoneOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='phone_otps')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']


class PasswordResetOTP(models.Model):
    email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
