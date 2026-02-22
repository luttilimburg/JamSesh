from django.db import models
from django.contrib.auth.models import User


class JamSession(models.Model):
    GENRE_CHOICES = [
        ("jazz", "Jazz"),
        ("rock", "Rock"),
        ("pop", "Pop"),
        ("hiphop", "Hip Hop"),
        ("classical", "Classical"),
        ("other", "Other"),
    ]

    SKILL_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    genre = models.CharField(max_length=50, choices=GENRE_CHOICES)
    skill_level = models.CharField(max_length=50, choices=SKILL_CHOICES)
    location = models.CharField(max_length=255)
    date_time = models.DateTimeField()
    max_participants = models.IntegerField()
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Participation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    jam_session = models.ForeignKey(JamSession, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'jam_session')

    def __str__(self):
        return f"{self.user.username} -> {self.jam_session.title}"