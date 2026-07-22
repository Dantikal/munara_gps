from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .docx_preview import DocxPreviewError, extract_docx_preview
from .models import (
    AdminChatMessage,
    CombatTrainingNews,
    CombatTrainingNewsAttachment,
    CombatTrainingJournal,
    MethodicalManualDocument,
    MethodicalManualSubject,
)
from .outposts import OUTPOSTS_BY_MILITARY_UNIT, normalize_outpost_selection

User = get_user_model()


phone_validator = RegexValidator(
    regex=r"^\+996\d{9}$",
    message="Телефон должен быть в формате +996XXXXXXXXX.",
)


class UserPublicSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(read_only=True)
    photo_face = serializers.ImageField(read_only=True)
    photo_military_id = serializers.ImageField(read_only=True)
    unreadChatCount = serializers.SerializerMethodField()

    def get_unreadChatCount(self, obj):
        request = self.context.get("request")
        request_user = getattr(request, "user", None) if request else None
        if not request_user or not request_user.is_authenticated:
            return 0
        return AdminChatMessage.objects.filter(
            sender=obj,
            recipient=request_user,
            is_read=False,
        ).count()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
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
            "avatar",
            "photo_face",
            "photo_military_id",
            "rejection_reason",
            "reviewed_at",
            "unreadChatCount",
            "date_joined",
        ]
        read_only_fields = fields


class AdminUserSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(read_only=True)
    photo_face = serializers.ImageField(required=False)
    photo_military_id = serializers.ImageField(required=False)
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, min_length=8
    )
    phone = serializers.CharField(
        required=False, allow_blank=True, validators=[phone_validator]
    )
    unit_type = serializers.CharField(required=False, allow_blank=True, max_length=160)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "full_name",
            "military_rank",
            "position",
            "unit_type",
            "phone",
            "region",
            "outpost_name",
            "role",
            "status",
            "avatar",
            "photo_face",
            "photo_military_id",
            "date_joined",
        ]
        read_only_fields = ["id", "username", "date_joined"]

    def validate_email(self, value):
        email = value.lower().strip()
        qs = User.objects.filter(email__iexact=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Пользователь с таким email уже есть.")
        return email

    def validate(self, attrs):
        for field in ("full_name", "military_rank", "position", "unit_type", "region", "outpost_name"):
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = attrs[field].strip()

        if (
            self.instance
            and self.instance.role == User.Role.ADMIN
            and attrs.get("role", self.instance.role) != User.Role.ADMIN
            and not User.objects.filter(role=User.Role.ADMIN).exclude(pk=self.instance.pk).exists()
        ):
            raise serializers.ValidationError(
                {"role": "Нельзя снять роль администратора у последнего администратора."}
            )

        password = attrs.get("password")
        if self.instance is None and not password:
            raise serializers.ValidationError(
                {"password": "Укажите пароль для нового пользователя."}
            )
        if self.instance is None and not attrs.get("photo_face"):
            raise serializers.ValidationError(
                {"photo_face": "Загрузите фото лица."}
            )
        if self.instance is None and not attrs.get("photo_military_id"):
            raise serializers.ValidationError(
                {"photo_military_id": "Загрузите фото военного билета."}
            )
        unit_type = attrs.get("unit_type", getattr(self.instance, "unit_type", ""))
        region = attrs.get("region", getattr(self.instance, "region", ""))
        outpost_name = attrs.get("outpost_name", getattr(self.instance, "outpost_name", ""))
        if unit_type == User.UnitType.OUTPOST:
            normalized_outpost_name = normalize_outpost_selection(region, outpost_name)
            if normalized_outpost_name:
                attrs["outpost_name"] = normalized_outpost_name
            elif self.instance is None:
                raise serializers.ValidationError(
                    {"outpost_name": "Тандалган застава бул аскер бөлүгүнө кирбейт."}
                )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        email = validated_data["email"]
        user = User(username=email, **validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", "")
        for field, value in validated_data.items():
            setattr(instance, field, value)

        if "email" in validated_data:
            instance.username = validated_data["email"]
        if password:
            instance.set_password(password)

        instance.save()
        return instance


class MethodicalManualSubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = MethodicalManualSubject
        fields = ["id", "title", "order", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_title(self, value):
        title = value.strip()
        if not title:
            raise serializers.ValidationError("Укажите название предмета.")
        return title


class MethodicalManualDocumentSerializer(serializers.ModelSerializer):
    originalName = serializers.CharField(source="original_name", read_only=True)
    previewHtml = serializers.CharField(source="preview_html", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    fileUrl = serializers.SerializerMethodField()
    kind = serializers.SerializerMethodField()

    IMAGE_EXTENSIONS = {".bmp", ".gif", ".jpeg", ".jpg", ".png", ".webp"}
    VIDEO_EXTENSIONS = {".avi", ".mkv", ".mov", ".mp4", ".m4v", ".webm"}
    AUDIO_EXTENSIONS = {".aac", ".flac", ".m4a", ".mp3", ".ogg", ".wav"}
    DOCUMENT_EXTENSIONS = {
        ".csv", ".doc", ".docx", ".odp", ".ods", ".odt", ".ppt", ".pptx",
        ".rtf", ".txt", ".xls", ".xlsx",
    }
    ARCHIVE_EXTENSIONS = {".7z", ".rar", ".zip"}
    ALLOWED_EXTENSIONS = (
        IMAGE_EXTENSIONS
        | VIDEO_EXTENSIONS
        | AUDIO_EXTENSIONS
        | DOCUMENT_EXTENSIONS
        | ARCHIVE_EXTENSIONS
        | {".pdf"}
    )
    MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024

    class Meta:
        model = MethodicalManualDocument
        fields = [
            "id",
            "subject",
            "title",
            "file",
            "fileUrl",
            "originalName",
            "previewHtml",
            "content",
            "kind",
            "createdAt",
        ]
        read_only_fields = ["id", "subject"]
        extra_kwargs = {
            "file": {"write_only": True, "required": False, "allow_null": True},
            "content": {"required": False, "allow_blank": True},
        }

    def validate_title(self, value):
        title = value.strip()
        if not title:
            raise serializers.ValidationError("Укажите название документа.")
        return title

    def validate_file(self, value):
        extension = Path(value.name).suffix.lower()
        if extension not in self.ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                "Этот формат не поддерживается. Загрузите документ, PDF, изображение, аудио, видео или архив."
            )
        if value.size > self.MAX_FILE_SIZE:
            raise serializers.ValidationError("Размер файла не должен превышать 5 ГБ.")
        value.preview_html = ""
        if extension == ".docx":
            try:
                value.preview_html = extract_docx_preview(value)
            except DocxPreviewError as error:
                raise serializers.ValidationError(str(error)) from error
        return value

    def validate(self, attrs):
        content = str(attrs.get("content") or "").strip()
        uploaded_file = attrs.get("file")
        if not content and not uploaded_file:
            raise serializers.ValidationError(
                "Введите текст материала или выберите файл."
            )
        attrs["content"] = content
        return attrs

    def get_fileUrl(self, document):
        if not document.file:
            return ""
        request = self.context.get("request")
        return request.build_absolute_uri(document.file.url) if request else document.file.url

    def get_kind(self, document):
        if not document.file:
            return "text"
        extension = Path(document.original_name or document.file.name).suffix.lower()
        if extension == ".docx":
            return "docx"
        if extension == ".pdf":
            return "pdf"
        if extension in self.IMAGE_EXTENSIONS:
            return "image"
        if extension in self.VIDEO_EXTENSIONS:
            return "video"
        if extension in self.AUDIO_EXTENSIONS:
            return "audio"
        if extension in self.ARCHIVE_EXTENSIONS:
            return "archive"
        return "document"

    def create(self, validated_data):
        uploaded_file = validated_data.get("file")
        if uploaded_file:
            validated_data["original_name"] = uploaded_file.name
            validated_data["preview_html"] = getattr(uploaded_file, "preview_html", "")
        else:
            validated_data["original_name"] = ""
            validated_data["preview_html"] = ""
        return super().create(validated_data)


class CombatTrainingNewsAttachmentSerializer(serializers.ModelSerializer):
    fileUrl = serializers.SerializerMethodField()
    originalName = serializers.CharField(source="original_name")

    class Meta:
        model = CombatTrainingNewsAttachment
        fields = ["id", "fileUrl", "originalName", "kind", "size"]

    def get_fileUrl(self, attachment):
        if not attachment.file:
            return ""
        request = self.context.get("request")
        return request.build_absolute_uri(attachment.file.url) if request else attachment.file.url


class CombatTrainingNewsSerializer(serializers.ModelSerializer):
    attachments = CombatTrainingNewsAttachmentSerializer(many=True, read_only=True)
    authorName = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at")
    updatedAt = serializers.DateTimeField(source="updated_at")
    likeCount = serializers.SerializerMethodField()
    isLiked = serializers.SerializerMethodField()

    class Meta:
        model = CombatTrainingNews
        fields = [
            "id",
            "title",
            "body",
            "attachments",
            "authorName",
            "createdAt",
            "updatedAt",
            "likeCount",
            "isLiked",
        ]

    def get_authorName(self, news):
        if not news.author:
            return "Администратор"
        return news.author.full_name or news.author.email or "Администратор"

    def get_likeCount(self, news):
        return news.likes.count()

    def get_isLiked(self, news):
        request = self.context.get("request")
        return bool(
            request
            and request.user.is_authenticated
            and news.likes.filter(user=request.user).exists()
        )


class CombatTrainingJournalSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", required=False)
    unitName = serializers.CharField(source="unit_name", required=False, allow_blank=True)
    ownerId = serializers.IntegerField(source="owner_id", read_only=True)

    class Meta:
        model = CombatTrainingJournal
        fields = [
            "id",
            "ownerId",
            "storage_id",
            "title",
            "year",
            "unitName",
            "scope",
            "createdAt",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]
        extra_kwargs = {"storage_id": {"validators": []}}

    def validate_title(self, value):
        title = value.strip()
        if not title:
            raise serializers.ValidationError("\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0436\u0443\u0440\u043d\u0430\u043b\u0430.")
        return title

    def validate_storage_id(self, value):
        storage_id = value.strip()
        if not storage_id:
            raise serializers.ValidationError("storage_id is required.")
        return storage_id


class AdminChatMessageSerializer(serializers.ModelSerializer):
    sender = UserPublicSerializer(read_only=True)
    recipient = UserPublicSerializer(read_only=True)
    senderId = serializers.IntegerField(write_only=True, required=False)
    recipientId = serializers.IntegerField(write_only=True, required=False)
    attachment = serializers.FileField(required=False, allow_null=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    isRead = serializers.BooleanField(source="is_read", read_only=True)
    isDeletedForEveryone = serializers.BooleanField(
        source="deleted_for_everyone", read_only=True
    )

    class Meta:
        model = AdminChatMessage
        fields = [
            "id",
            "sender",
            "recipient",
            "senderId",
            "recipientId",
            "body",
            "attachment",
            "attachment_kind",
            "attachment_name",
            "createdAt",
            "isRead",
            "isDeletedForEveryone",
        ]
        read_only_fields = [
            "id",
            "sender",
            "recipient",
            "attachment_kind",
            "attachment_name",
            "isRead",
            "isDeletedForEveryone",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.deleted_for_everyone:
            data["body"] = ""
            data["attachment"] = None
            data["attachment_kind"] = ""
            data["attachment_name"] = ""
        return data

    def validate(self, attrs):
        request_user = self.context["request"].user
        body = (attrs.get("body") or "").strip()
        attachment = attrs.get("attachment")
        if not body and not attachment:
            raise serializers.ValidationError({"body": "Введите текст или добавьте вложение."})

        recipient_id = attrs.get("recipientId")
        if request_user.role in {User.Role.ADMIN, User.Role.REGIONAL} and not recipient_id:
            raise serializers.ValidationError({"recipientId": "Укажите получателя."})
        if recipient_id:
            recipient = User.objects.filter(pk=recipient_id, status=User.Status.ACTIVE).first()
            if not recipient:
                raise serializers.ValidationError({"recipientId": "Пользователь не найден."})
            if recipient.pk == request_user.pk:
                raise serializers.ValidationError({"recipientId": "Нельзя отправить сообщение самому себе."})

            is_allowed = request_user.role == User.Role.ADMIN
            if request_user.role == User.Role.OUTPOST:
                is_allowed = recipient.role == User.Role.ADMIN or (
                    recipient.role == User.Role.REGIONAL
                    and recipient.region == request_user.region
                )
            elif request_user.role == User.Role.REGIONAL:
                is_allowed = recipient.role == User.Role.ADMIN or (
                    recipient.role == User.Role.OUTPOST
                    and recipient.region == request_user.region
                )
            if not is_allowed:
                raise serializers.ValidationError({"recipientId": "Бул алуучуга билдирүү жөнөтүүгө болбойт."})

        attrs["body"] = body
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        sender = request.user
        recipient_id = validated_data.pop("recipientId", None)
        validated_data.pop("senderId", None)
        attachment = validated_data.get("attachment")

        if recipient_id:
            recipient = User.objects.filter(pk=recipient_id).first()
        else:
            recipient = User.objects.filter(role=User.Role.ADMIN).order_by("id").first()
        if not recipient:
            raise serializers.ValidationError({"recipientId": "Администратор не найден."})

        if attachment and not validated_data.get("attachment_name"):
            validated_data["attachment_name"] = attachment.name
        if attachment and not validated_data.get("attachment_kind"):
            name = attachment.name.lower()
            content_type = getattr(attachment, "content_type", "") or ""
            if content_type.startswith("image/") or name.endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")):
                validated_data["attachment_kind"] = AdminChatMessage.AttachmentKind.IMAGE
            elif content_type.startswith("audio/") or name.endswith((".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac")):
                validated_data["attachment_kind"] = AdminChatMessage.AttachmentKind.AUDIO
            elif content_type.startswith("video/") or name.endswith((".mp4", ".mov", ".avi", ".mkv", ".webm")):
                validated_data["attachment_kind"] = AdminChatMessage.AttachmentKind.VIDEO
            else:
                validated_data["attachment_kind"] = AdminChatMessage.AttachmentKind.FILE

        return AdminChatMessage.objects.create(sender=sender, recipient=recipient, **validated_data)


class AdminChatUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name", "email", "role", "avatar", "photo_face"]
        read_only_fields = fields


class ProfileUpdateSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(required=False)

    class Meta:
        model = User
        fields = ["avatar"]


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    phone = serializers.CharField(max_length=20)
    full_name = serializers.CharField(required=True)
    military_rank = serializers.CharField(required=True)
    position = serializers.CharField(required=True)
    unit_type = serializers.ChoiceField(choices=User.UnitType.choices, required=True)
    region = serializers.CharField(required=False, allow_blank=True)
    outpost_name = serializers.CharField(required=False, allow_blank=True)
    photo_face = serializers.ImageField(required=True)
    photo_military_id = serializers.ImageField(required=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "password",
            "full_name",
            "military_rank",
            "position",
            "unit_type",
            "phone",
            "region",
            "outpost_name",
            "photo_face",
            "photo_military_id",
        ]
        read_only_fields = ["id"]

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Пользователь с таким email уже есть.")
        return email

    def validate(self, attrs):
        unit_type = attrs["unit_type"]
        attrs["region"] = attrs.get("region", "").strip()
        attrs["outpost_name"] = attrs.get("outpost_name", "").strip()

        if unit_type in (User.UnitType.REGIONAL, User.UnitType.OUTPOST) and not attrs["region"]:
            raise serializers.ValidationError(
                {"region": "Аскер бөлүгүнүн номерин тандаңыз."}
            )
        if unit_type == User.UnitType.OUTPOST and not attrs["outpost_name"]:
            raise serializers.ValidationError(
                {"outpost_name": "Заставанын аталышын тандаңыз."}
            )
        if unit_type == User.UnitType.OUTPOST:
            available_outposts = OUTPOSTS_BY_MILITARY_UNIT.get(attrs["region"])
            if not available_outposts:
                raise serializers.ValidationError(
                    {"region": "Бул аскер бөлүгү үчүн заставалардын тизмеси табылган жок."}
                )
            normalized_outpost_name = normalize_outpost_selection(
                attrs["region"], attrs["outpost_name"]
            )
            if not normalized_outpost_name:
                raise serializers.ValidationError(
                    {"outpost_name": "Тандалган застава бул аскер бөлүгүнө кирбейт."}
                )
            attrs["outpost_name"] = normalized_outpost_name
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        email = validated_data["email"]
        role = (
            User.Role.OUTPOST
            if validated_data["unit_type"] == User.UnitType.OUTPOST
            else User.Role.REGIONAL
        )
        user = User(
            username=email,
            role=role,
            status=User.Status.PENDING,
            **validated_data,
        )
        user.set_password(password)
        user.save()
        return user


class ActiveTokenObtainSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs["email"].lower().strip()
        password = attrs["password"]

        user = User.objects.filter(email__iexact=email).first()
        if not user or not user.check_password(password):
            raise serializers.ValidationError("Неверный email или пароль.")
        if user.status != User.Status.ACTIVE:
            raise serializers.ValidationError("Доступ разрешен только после одобрения.")

        refresh = RefreshToken.for_user(user)
        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserPublicSerializer(user, context=self.context).data,
        }


class ModerationSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=("approve", "reject"))
    rejection_reason = serializers.CharField(
        required=False, allow_blank=True, max_length=2000
    )

    def validate(self, attrs):
        if attrs["decision"] == "reject" and not attrs.get("rejection_reason"):
            raise serializers.ValidationError(
                {"rejection_reason": "Укажите причину отклонения."}
            )
        return attrs

    def save(self, **kwargs):
        user = self.context["user_to_review"]
        admin = self.context["request"].user
        decision = self.validated_data["decision"]

        user.reviewed_by = admin
        user.reviewed_at = timezone.now()

        if decision == "approve":
            user.status = User.Status.ACTIVE
            user.rejection_reason = ""
            user.save(update_fields=["status", "rejection_reason", "reviewed_by", "reviewed_at", "is_active"])
            refresh = RefreshToken.for_user(user)
            return {
                "status": "approved",
                "user": UserPublicSerializer(user, context=self.context).data,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                },
            }

        user.status = User.Status.REJECTED
        user.rejection_reason = self.validated_data["rejection_reason"]
        user.save(update_fields=["status", "rejection_reason", "reviewed_by", "reviewed_at", "is_active"])
        return {
            "status": "rejected",
            "user": UserPublicSerializer(user, context=self.context).data,
        }
