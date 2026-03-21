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
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
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

class Message(models.Model):
    jam_session = models.ForeignKey(JamSession, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.username}: {self.text[:50]}"


class Review(models.Model):
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    reviewee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')
    jam_session = models.ForeignKey(JamSession, on_delete=models.CASCADE, related_name='reviews')
    showed_up = models.BooleanField()
    would_jam_again = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('reviewer', 'reviewee', 'jam_session')

    def __str__(self):
        return f"{self.reviewer.username} -> {self.reviewee.username} @ {self.jam_session.title}"


class Report(models.Model):
    REASON_CHOICES = [
        ('harassment', 'Harassment or abuse'),
        ('no_show', 'Repeatedly no-show'),
        ('fake_profile', 'Fake profile'),
        ('inappropriate', 'Inappropriate content'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('actioned', 'Actioned'),
        ('dismissed', 'Dismissed'),
    ]
    reporter      = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_filed')
    reported_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_received')
    jam_session   = models.ForeignKey(JamSession, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports')
    reason        = models.CharField(max_length=50, choices=REASON_CHOICES)
    details       = models.TextField(blank=True)
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reporter.username} reported {self.reported_user.username} ({self.reason})"
