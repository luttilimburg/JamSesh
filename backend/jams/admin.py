from django.contrib import admin
from .models import JamSession, Report


@admin.register(JamSession)
class JamSessionAdmin(admin.ModelAdmin):
    list_display = ("title", "genre", "skill_level", "date_time", "location", "created_by")
    list_filter = ("genre", "skill_level", "date_time")
    search_fields = ("title", "description", "location", "created_by__username")


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['reporter', 'reported_user', 'reason', 'jam_session', 'status', 'created_at']
    list_filter = ['status', 'reason']
    search_fields = ['reporter__username', 'reported_user__username']
    readonly_fields = ['reporter', 'reported_user', 'jam_session', 'reason', 'details', 'created_at']
    actions = ['issue_strike', 'ban_user_directly', 'dismiss_report']

    @admin.action(description='Issue strike to reported user (auto-ban at 3)')
    def issue_strike(self, request, queryset):
        for report in queryset.filter(status='pending'):
            profile = report.reported_user.profile
            profile.strike_count += 1
            if profile.strike_count >= 3:
                profile.is_banned = True
            profile.save()
            report.status = 'actioned'
            report.save()
        self.message_user(request, 'Strikes issued.')

    @admin.action(description='Ban reported user immediately')
    def ban_user_directly(self, request, queryset):
        for report in queryset:
            profile = report.reported_user.profile
            profile.is_banned = True
            profile.save()
            report.status = 'actioned'
            report.save()
        self.message_user(request, 'Users banned.')

    @admin.action(description='Dismiss selected reports')
    def dismiss_report(self, request, queryset):
        queryset.update(status='dismissed')
        self.message_user(request, 'Reports dismissed.')
