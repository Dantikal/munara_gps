from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    CombatTrainingJournal,
    CombatTrainingJournalSection,
    LessonSchedulePeriod,
    MethodicalManualSubject,
    TrainingPeriod,
    TrainingSection,
    TrainingTable,
    User,
)

LESSON_SCHEDULE_SECTION_SLUGS = ("lesson-schedule", "command-lesson-schedule")
COMBAT_TRAINING_JOURNAL_SECTION_SLUG = "combat-training-journal"


class TrainingPeriodInline(admin.TabularInline):
    model = TrainingPeriod
    extra = 0
    fields = ("slug", "title", "order", "is_active")
    show_change_link = True


class TrainingTableInline(admin.StackedInline):
    model = TrainingTable
    extra = 0
    max_num = 1
    fields = (
        "title",
        "variant",
        "columns",
        "header_fields",
        "header_rows",
        "rows",
        "is_active",
    )


@admin.register(TrainingSection)
class TrainingSectionAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "parent", "order", "is_active")
    list_editable = ("order", "is_active")
    list_filter = ("is_active", "parent")
    search_fields = ("title", "slug")
    ordering = ("parent_id", "order", "title")
    inlines = (TrainingPeriodInline,)


@admin.register(TrainingPeriod)
class TrainingPeriodAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "section", "order", "is_active")
    list_editable = ("order", "is_active")
    list_filter = ("is_active", "section")
    search_fields = ("title", "slug", "section__title")
    ordering = ("section", "order", "title")
    inlines = (TrainingTableInline,)


@admin.register(LessonSchedulePeriod)
class LessonSchedulePeriodAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "section", "order", "is_active")
    list_editable = ("order", "is_active")
    list_filter = ("is_active", "section")
    search_fields = ("title", "slug", "section__title")
    ordering = ("section", "order", "title")
    inlines = (TrainingTableInline,)

    def get_queryset(self, request):
        return super().get_queryset(request).filter(section__slug__in=LESSON_SCHEDULE_SECTION_SLUGS)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "section":
            kwargs["queryset"] = TrainingSection.objects.filter(slug__in=LESSON_SCHEDULE_SECTION_SLUGS)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(CombatTrainingJournalSection)
class CombatTrainingJournalSectionAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "order", "is_active")
    list_editable = ("order", "is_active")
    search_fields = ("title", "slug")
    inlines = (TrainingPeriodInline,)

    def get_queryset(self, request):
        return super().get_queryset(request).filter(slug=COMBAT_TRAINING_JOURNAL_SECTION_SLUG)


@admin.register(CombatTrainingJournal)
class CombatTrainingJournalAdmin(admin.ModelAdmin):
    list_display = ("title", "year", "unit_name", "scope", "owner", "created_at")
    list_filter = ("scope", "created_at", "owner")
    search_fields = ("title", "year", "unit_name", "scope", "storage_id")
    readonly_fields = ("storage_id", "created_at", "updated_at")
    ordering = ("-created_at", "-id")


@admin.register(TrainingTable)
class TrainingTableAdmin(admin.ModelAdmin):
    list_display = ("title", "period", "variant", "is_active", "updated_at")
    list_filter = ("is_active", "variant", "period__section")
    search_fields = ("title", "period__title", "period__section__title")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("period",)


@admin.register(MethodicalManualSubject)
class MethodicalManualSubjectAdmin(admin.ModelAdmin):
    list_display = ("title", "order", "is_active", "updated_at")
    list_editable = ("order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("title",)
    readonly_fields = ("created_at", "updated_at")
    ordering = ("order", "title")


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    actions = ("approve_requests", "reject_requests")
    list_display = (
        "email",
        "full_name",
        "military_rank",
        "position",
        "role",
        "status",
        "region",
        "outpost_name",
        "is_staff",
        "is_active",
        "date_joined",
    )
    list_editable = ("role", "status")
    list_filter = (
        "role",
        "status",
        "region",
        "unit_type",
        "is_staff",
        "is_superuser",
        "is_active",
        "date_joined",
    )
    search_fields = (
        "email",
        "username",
        "full_name",
        "military_rank",
        "position",
        "phone",
        "region",
        "outpost_name",
    )
    ordering = ("email",)
    readonly_fields = (
        "date_joined",
        "last_login",
        "reviewed_at",
        "reviewed_by",
        "photo_face_preview",
        "photo_military_id_preview",
    )

    fieldsets = UserAdmin.fieldsets + (
        (
            "Профиль военнослужащего",
            {
                "fields": (
                    "full_name",
                    "military_rank",
                    "position",
                    "unit_type",
                    "phone",
                    "region",
                    "outpost_name",
                    "role",
                    "status",
                    "photo_face",
                    "photo_face_preview",
                    "photo_military_id",
                    "photo_military_id_preview",
                    "rejection_reason",
                    "reviewed_by",
                    "reviewed_at",
                )
            },
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Профиль военнослужащего",
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "full_name",
                    "military_rank",
                    "position",
                    "unit_type",
                    "phone",
                    "region",
                    "outpost_name",
                    "role",
                    "status",
                    "photo_face",
                    "photo_military_id",
                ),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        if change and "status" in form.changed_data:
            obj.reviewed_by = request.user
            obj.reviewed_at = timezone.now()
        super().save_model(request, obj, form, change)

    def delete_model(self, request, obj):
        if obj.role == User.Role.ADMIN and not User.objects.filter(
            role=User.Role.ADMIN
        ).exclude(pk=obj.pk).exists():
            self.message_user(
                request,
                "Нельзя удалить последнего администратора.",
                level=messages.ERROR,
            )
            return

        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        protected_admin_ids = set()
        admin_ids = set(User.objects.filter(role=User.Role.ADMIN).values_list("pk", flat=True))
        deleted_admin_ids = set(queryset.filter(role=User.Role.ADMIN).values_list("pk", flat=True))

        if admin_ids and admin_ids.issubset(deleted_admin_ids):
            protected_admin_ids.add(next(iter(admin_ids)))

        if protected_admin_ids:
            queryset = queryset.exclude(pk__in=protected_admin_ids)
            self.message_user(
                request,
                "Последний администратор не удален.",
                level=messages.ERROR,
            )

        super().delete_queryset(request, queryset)

    @admin.action(description="Подтвердить выбранные заявки")
    def approve_requests(self, request, queryset):
        updated = 0
        for user in queryset.exclude(role=User.Role.ADMIN):
            user.status = User.Status.ACTIVE
            user.rejection_reason = ""
            user.reviewed_by = request.user
            user.reviewed_at = timezone.now()
            user.save()
            updated += 1
        self.message_user(request, f"Подтверждено заявок: {updated}.")

    @admin.action(description="Отклонить выбранные заявки")
    def reject_requests(self, request, queryset):
        updated = 0
        for user in queryset.exclude(role=User.Role.ADMIN):
            user.status = User.Status.REJECTED
            if not user.rejection_reason:
                user.rejection_reason = "Отклонено администратором."
            user.reviewed_by = request.user
            user.reviewed_at = timezone.now()
            user.save()
            updated += 1
        self.message_user(request, f"Отклонено заявок: {updated}.")

    @admin.display(description="Фото лица")
    def photo_face_preview(self, obj):
        return self._image_preview(obj.photo_face)

    @admin.display(description="Фото военного билета")
    def photo_military_id_preview(self, obj):
        return self._image_preview(obj.photo_military_id)

    def _image_preview(self, image):
        if not image:
            return "-"
        return format_html(
            '<a href="{0}" target="_blank"><img src="{0}" style="max-width: 260px; max-height: 180px; border-radius: 6px;" /></a>',
            image.url,
        )
