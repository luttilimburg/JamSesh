from django.contrib import admin
from .models import JamSession

@admin.register(JamSession)
class JamSessionAdmin(admin.ModelAdmin):
    list_display = ("title", "genre", "skill_level", "date_time", "location", "created_by")
    list_filter = ("genre", "skill_level", "date_time")
    search_fields = ("title", "description", "location", "created_by__username")
