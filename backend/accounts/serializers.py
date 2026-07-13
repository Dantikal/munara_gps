from django.contrib.auth import get_user_model
from django.core.validators import RegexValidator
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AdminChatMessage, CombatTrainingJournal, MethodicalManualSubject

User = get_user_model()


phone_validator = RegexValidator(
    regex=r"^\+996\d{9}$",
    message="Телефон должен быть в формате +996XXXXXXXXX.",
)


class UserPublicSerializer(serializers.ModelSerializer):
    avatar = serializers.ImageField(read_only=True)
    photo_face = serializers.ImageField(read_only=True)
    photo_military_id = serializers.ImageField(read_only=True)

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
            "date_joined",
        ]
        read_only_fields = fields


class AdminUserSerializer(serializers.ModelSerializer):
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


class CombatTrainingJournalSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", required=False)
    unitName = serializers.CharField(source="unit_name", required=False, allow_blank=True)

    class Meta:
        model = CombatTrainingJournal
        fields = [
            "id",
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

        if request_user.role == User.Role.ADMIN:
            recipient_id = attrs.get("recipientId")
            if not recipient_id:
                raise serializers.ValidationError({"recipientId": "Укажите получателя."})
            recipient = User.objects.filter(pk=recipient_id).first()
            if not recipient:
                raise serializers.ValidationError({"recipientId": "Пользователь не найден."})
            if recipient.pk == request_user.pk:
                raise serializers.ValidationError({"recipientId": "Нельзя отправить сообщение самому себе."})

        attrs["body"] = body
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        sender = request.user
        recipient_id = validated_data.pop("recipientId", None)
        validated_data.pop("senderId", None)
        attachment = validated_data.get("attachment")

        if sender.role == User.Role.ADMIN:
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
    phone = serializers.CharField(validators=[phone_validator])
    full_name = serializers.CharField(required=True)
    military_rank = serializers.CharField(required=True)
    position = serializers.CharField(required=True)
    unit_type = serializers.CharField(required=True, allow_blank=False, max_length=160)
    region = serializers.CharField(required=True)
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
        attrs["unit_type"] = attrs["unit_type"].strip()
        if not attrs["unit_type"]:
            raise serializers.ValidationError(
                {"unit_type": "Укажите подразделение."}
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        email = validated_data["email"]
        role = (
            User.Role.OUTPOST
            if validated_data["unit_type"] == User.UnitType.OUTPOST
            or validated_data.get("outpost_name")
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
