"""Django console views of reviews (read mostly; moderation goes through the API so it is audited)."""

from django.contrib import admin

from .models import Review, ReviewReply, ReviewReport


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """Reviews, newest first."""

    list_display = ("id", "author_role", "rating_overall", "status", "submitted_at", "published_at")
    list_filter = ("status", "author_role")
    raw_id_fields = ("booking", "author", "listing", "trip", "host_account")


@admin.register(ReviewReply)
class ReviewReplyAdmin(admin.ModelAdmin):
    """Host replies."""

    list_display = ("review", "created_at", "editable_until")
    raw_id_fields = ("review", "author")


@admin.register(ReviewReport)
class ReviewReportAdmin(admin.ModelAdmin):
    """Reports on reviews."""

    list_display = ("review", "reason_code", "status", "created_at")
    list_filter = ("status", "reason_code")
    raw_id_fields = ("review", "reporter")
