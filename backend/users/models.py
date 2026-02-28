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

    def __str__(self):
        return f"{self.user.username}'s profile"
