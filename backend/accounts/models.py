from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Администратор"
        REGIONAL = "regional", "Областное управление"
        OUTPOST = "outpost", "Застава"

    class Status(models.TextChoices):
        PENDING = "pending", "На рассмотрении"
        ACTIVE = "active", "Активен"
        REJECTED = "rejected", "Отклонен"

    class UnitType(models.TextChoices):
        REGIONAL = "regional_department", "Войсковая часть №"
        OUTPOST = "outpost", "Застава"

    email = models.EmailField("Email", unique=True)
    full_name = models.CharField("ФИО", max_length=255, blank=True)
    military_rank = models.CharField("Воинское звание", max_length=120, blank=True)
    position = models.CharField("Должность", max_length=160, blank=True)
    unit_type = models.CharField("Подразделение", max_length=160)
    phone = models.CharField("Телефон", max_length=20, blank=True)
    region = models.CharField("Область", max_length=120, blank=True)
    outpost_name = models.CharField("Название заставы", max_length=160, blank=True)
    role = models.CharField("Роль", max_length=20, choices=Role.choices)
    status = models.CharField(
        "Статус", max_length=20, choices=Status.choices, default=Status.PENDING
    )
    photo_face = models.ImageField("Фото лица", upload_to="users/faces/", blank=True)
    avatar = models.ImageField("Аватар", upload_to="users/avatars/", blank=True)
    photo_military_id = models.ImageField(
        "Фото военного билета", upload_to="users/military_ids/", blank=True
    )
    rejection_reason = models.TextField("Причина отклонения", blank=True)
    reviewed_at = models.DateTimeField("Дата модерации", null=True, blank=True)
    reviewed_by = models.ForeignKey(
        "self",
        verbose_name="Проверил",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_users",
    )

    REQUIRED_FIELDS = ["email", "full_name"]

    def clean(self):
        super().clean()
        if not self.pk:
            return

        previous = type(self).objects.filter(pk=self.pk).only("role").first()
        if (
            previous
            and previous.role == self.Role.ADMIN
            and self.role != self.Role.ADMIN
            and not type(self).objects.filter(role=self.Role.ADMIN).exclude(pk=self.pk).exists()
        ):
            raise ValidationError(
                {"role": "Нельзя снять роль администратора у последнего администратора."}
            )

    def save(self, *args, **kwargs):
        if self.is_superuser or self.role == self.Role.ADMIN:
            self.role = self.Role.ADMIN
            self.status = self.Status.ACTIVE
            self.is_staff = True
            self.is_superuser = True
        else:
            self.is_staff = False
            self.is_superuser = False

        self.is_active = self.status == self.Status.ACTIVE
        if not self.full_name:
            self.full_name = self.get_full_name() or self.username
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.email})"


class TrainingSection(models.Model):
    slug = models.SlugField("ID раздела", max_length=80, unique=True)
    title = models.CharField("Название", max_length=255)
    parent = models.ForeignKey(
        "self",
        verbose_name="Родительский раздел",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="subsections",
    )
    order = models.PositiveIntegerField("Порядок", default=0)
    is_active = models.BooleanField("Активен", default=True)

    class Meta:
        ordering = ("parent_id", "order", "title")
        verbose_name = "Раздел подготовки"
        verbose_name_plural = "Разделы подготовки"

    def __str__(self):
        if self.parent_id:
            return f"{self.parent.title} / {self.title}"
        return self.title


class TrainingPeriod(models.Model):
    section = models.ForeignKey(
        TrainingSection,
        verbose_name="Раздел",
        on_delete=models.CASCADE,
        related_name="periods",
    )
    created_by = models.ForeignKey(
        User,
        verbose_name="Создал",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="created_training_periods",
    )
    slug = models.SlugField("ID периода", max_length=100)
    title = models.CharField("Название", max_length=255)
    order = models.PositiveIntegerField("Порядок", default=0)
    is_active = models.BooleanField("Активен", default=True)

    class Meta:
        ordering = ("section", "order", "title")
        constraints = [
            models.UniqueConstraint(
                fields=("section", "slug"),
                name="unique_training_period_per_section",
            )
        ]
        verbose_name = "Период подготовки"
        verbose_name_plural = "Периоды подготовки"

    def __str__(self):
        return self.title


class LessonSchedulePeriod(TrainingPeriod):
    class Meta:
        proxy = True
        verbose_name = "Сабактардын жүгүртмөсү"
        verbose_name_plural = "Сабактардын жүгүртмөсү"


class CombatTrainingJournalSection(TrainingSection):
    class Meta:
        proxy = True
        verbose_name = "\u0428\u0430\u0431\u043b\u043e\u043d \u0440\u0430\u0437\u0434\u0435\u043b\u0430 \u043a\u04af\u0436\u04af\u0440\u043c\u04e9\u043d \u0434\u0430\u044f\u0440\u0434\u043e\u043e"
        verbose_name_plural = "\u0428\u0430\u0431\u043b\u043e\u043d \u0440\u0430\u0437\u0434\u0435\u043b\u0430 \u043a\u04af\u0436\u04af\u0440\u043c\u04e9\u043d \u0434\u0430\u044f\u0440\u0434\u043e\u043e"


class CombatTrainingJournal(models.Model):
    owner = models.ForeignKey(
        User,
        verbose_name="\u0412\u043b\u0430\u0434\u0435\u043b\u0435\u0446",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="combat_training_journals",
    )
    storage_id = models.CharField("ID", max_length=255, unique=True)
    title = models.TextField("\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435")
    year = models.CharField("\u041e\u043a\u0443\u0443 \u0436\u044b\u043b\u044b", max_length=40, blank=True)
    unit_name = models.CharField(
        "\u0411\u04e9\u043b\u04af\u043a\u0447\u04e9\u043d\u04af\u043d \u0430\u0442\u0430\u043b\u044b\u0448\u044b",
        max_length=255,
        blank=True,
    )
    scope = models.CharField("\u041e\u0431\u043b\u0430\u0441\u0442\u044c", max_length=255, blank=True)
    created_at = models.DateTimeField("\u0421\u043e\u0437\u0434\u0430\u043d\u043e", default=timezone.now)
    updated_at = models.DateTimeField("\u041e\u0431\u043d\u043e\u0432\u043b\u0435\u043d\u043e", auto_now=True)

    class Meta:
        ordering = ("-created_at", "-id")
        verbose_name = "\u041a\u04af\u0436\u04af\u0440\u043c\u04e9\u043d \u0434\u0430\u044f\u0440\u0434\u043e\u043e\u043d\u0443 \u043a\u0430\u0442\u0442\u043e\u043e \u0436\u0443\u0440\u043d\u0430\u043b\u044b"
        verbose_name_plural = "\u041a\u04af\u0436\u04af\u0440\u043c\u04e9\u043d \u0434\u0430\u044f\u0440\u0434\u043e\u043e\u043d\u0443 \u043a\u0430\u0442\u0442\u043e\u043e \u0436\u0443\u0440\u043d\u0430\u043b\u044b"

    def __str__(self):
        return self.title


class TrainingTable(models.Model):
    class Variant(models.TextChoices):
        DEFAULT = "", "Обычная таблица"
        LESSON_SCHEDULE = "lesson-schedule", "Сабактардын жүгүртмөсү"

    period = models.OneToOneField(
        TrainingPeriod,
        verbose_name="Период",
        on_delete=models.CASCADE,
        related_name="table",
    )
    title = models.CharField("Название", max_length=500)
    variant = models.CharField(
        "Тип таблицы",
        max_length=40,
        blank=True,
        choices=Variant.choices,
        default=Variant.DEFAULT,
    )
    columns = models.JSONField("Колонки", default=list)
    rows = models.JSONField("Строки", default=list, blank=True)
    header_fields = models.JSONField("Поля шапки", default=list, blank=True)
    header_rows = models.JSONField("Строки шапки", default=list, blank=True)
    is_active = models.BooleanField("Активна", default=True)
    created_at = models.DateTimeField("Создана", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлена", auto_now=True)

    class Meta:
        ordering = ("period",)
        verbose_name = "Таблица подготовки"
        verbose_name_plural = "Таблицы подготовки"

    def clean(self):
        super().clean()
        for field_name in ("columns", "rows", "header_fields", "header_rows"):
            value = getattr(self, field_name)
            if not isinstance(value, list):
                raise ValidationError({field_name: "Значение должно быть JSON-массивом."})

    def to_payload(self):
        payload = {
            "title": self.title,
            "columns": self.columns or [],
            "rows": self.rows or [],
        }
        if self.variant:
            payload["variant"] = self.variant
        if self.header_fields:
            payload["headerFields"] = self.header_fields
        if self.header_rows:
            payload["headerRows"] = self.header_rows
        return payload

    def __str__(self):
        return self.title


class ThematicAccountSubmission(models.Model):
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="thematic_account_submissions",
    )
    unit_number = models.CharField("Аскер бөлүгүнүн номери", max_length=120)
    outpost_name = models.CharField("Заставанын аталышы", max_length=160, blank=True)
    document_title = models.CharField("Иш кагаздардын аталышы", max_length=255)
    section_slug = models.CharField("Раздел", max_length=80, default="thematic-account")
    period_slug = models.CharField("Период", max_length=100, blank=True)
    table_data = models.JSONField("Таблица", default=dict)
    created_at = models.DateTimeField("Отправлено", auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-id")
        verbose_name = "Отправленный тематический эсеп"
        verbose_name_plural = "Отправленные тематические эсептер"

    def __str__(self):
        return self.document_title


class SubmissionEditRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "На рассмотрении"
        APPROVED = "approved", "Разрешено"
        REJECTED = "rejected", "Отклонено"

    submission = models.OneToOneField(
        ThematicAccountSubmission,
        on_delete=models.CASCADE,
        related_name="edit_request",
    )
    requester = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="submission_edit_requests",
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_submission_edit_requests",
    )

    class Meta:
        ordering = ("-updated_at", "-id")
        verbose_name = "Запрос на исправление документа"
        verbose_name_plural = "Запросы на исправление документов"

    def __str__(self):
        return f"{self.submission.document_title}: {self.get_status_display()}"


class MethodicalManualSubject(models.Model):
    title = models.CharField("Название предмета", max_length=255)
    order = models.PositiveIntegerField("Порядок", default=0)
    is_active = models.BooleanField("Активен", default=True)
    created_at = models.DateTimeField("Создан", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлен", auto_now=True)

    class Meta:
        ordering = ("order", "title")
        verbose_name = "Предмет усулдук колдонмолор"
        verbose_name_plural = "Предметы усулдук колдонмолор"

    def __str__(self):
        return self.title


class MethodicalManualDocument(models.Model):
    subject = models.ForeignKey(
        MethodicalManualSubject,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    title = models.CharField("Название", max_length=255)
    file = models.FileField(
        "Файл",
        upload_to="methodical_manuals/%Y/%m/",
        blank=True,
        null=True,
    )
    original_name = models.CharField("Имя файла", max_length=255, blank=True)
    content = models.TextField("Текст материала", blank=True)
    preview_html = models.TextField("Содержимое для просмотра", blank=True)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="methodical_manual_documents",
    )
    created_at = models.DateTimeField("Создан", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлен", auto_now=True)

    class Meta:
        ordering = ("-created_at", "-id")
        verbose_name = "Документ учебной программы"
        verbose_name_plural = "Документы учебных программ"

    def __str__(self):
        return self.title


class CombatTrainingNews(models.Model):
    title = models.CharField("Заголовок", max_length=255)
    body = models.TextField("Текст", blank=True)
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="combat_training_news",
    )
    created_at = models.DateTimeField("Опубликовано", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлено", auto_now=True)

    class Meta:
        ordering = ("-created_at", "-id")
        verbose_name = "Новость о боевой подготовке"
        verbose_name_plural = "Новости о боевой подготовке"

    def __str__(self):
        return self.title


class CombatTrainingNewsAttachment(models.Model):
    news = models.ForeignKey(
        CombatTrainingNews,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField("Файл", upload_to="combat_training_news/%Y/%m/")
    original_name = models.CharField("Имя файла", max_length=255)
    kind = models.CharField("Тип", max_length=20, default="file")
    size = models.PositiveBigIntegerField("Размер", default=0)
    created_at = models.DateTimeField("Загружен", auto_now_add=True)

    class Meta:
        ordering = ("id",)

    def __str__(self):
        return self.original_name


class CombatTrainingNewsLike(models.Model):
    news = models.ForeignKey(
        CombatTrainingNews,
        on_delete=models.CASCADE,
        related_name="likes",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="combat_training_news_likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("news", "user"),
                name="unique_combat_training_news_like",
            )
        ]


class CombatTrainingNewsRead(models.Model):
    news = models.ForeignKey(
        CombatTrainingNews,
        on_delete=models.CASCADE,
        related_name="reads",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="combat_training_news_reads",
    )
    read_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("news", "user"),
                name="unique_combat_training_news_read",
            )
        ]


class CombatTrainingPlan(models.Model):
    title = models.TextField("Название плана")
    layout = models.CharField("Вид таблицы", max_length=30, default="plan", db_index=True)
    data = models.JSONField("Данные таблицы", default=dict, blank=True)
    created_by = models.ForeignKey(
        User,
        verbose_name="Создал",
        on_delete=models.SET_NULL,
        related_name="combat_training_plans",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField("Создано", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлено", auto_now=True)

    class Meta:
        ordering = ("created_at", "id")
        verbose_name = "Плановое мероприятие боевой подготовки"
        verbose_name_plural = "Плановые мероприятия боевой подготовки"


class AdminChatMessage(models.Model):
    class AttachmentKind(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"
        AUDIO = "audio", "Audio"
        FILE = "file", "File"

    sender = models.ForeignKey(
        User,
        verbose_name="Отправитель",
        on_delete=models.CASCADE,
        related_name="chat_messages_sent",
    )
    recipient = models.ForeignKey(
        User,
        verbose_name="Получатель",
        on_delete=models.CASCADE,
        related_name="chat_messages_received",
    )
    body = models.TextField("Сообщение", blank=True)
    attachment = models.FileField("Вложение", upload_to="chat/attachments/", blank=True, null=True)
    attachment_kind = models.CharField(
        "Тип вложения",
        max_length=20,
        choices=AttachmentKind.choices,
        blank=True,
        default="",
    )
    attachment_name = models.CharField("Имя вложения", max_length=255, blank=True)
    created_at = models.DateTimeField("Создано", auto_now_add=True)
    is_read = models.BooleanField("Прочитано", default=False)
    deleted_by_sender = models.BooleanField("Удалено отправителем у себя", default=False)
    deleted_by_recipient = models.BooleanField("Удалено получателем у себя", default=False)
    deleted_for_everyone = models.BooleanField("Удалено у всех", default=False)

    class Meta:
        ordering = ("created_at", "id")
        verbose_name = "Сообщение чата с администратором"
        verbose_name_plural = "Сообщения чата с администратором"

    def __str__(self):
        return f"{self.sender_id} -> {self.recipient_id}: {self.body[:40]}"
