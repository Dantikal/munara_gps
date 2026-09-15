from rest_framework import serializers

from news.models import CombatTrainingNews, CombatTrainingNewsAttachment


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
    authorId = serializers.IntegerField(source="author_id", read_only=True)
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
            "authorId",
            "authorName",
            "createdAt",
            "updatedAt",
            "likeCount",
            "isLiked",
        ]

    def get_authorName(self, news):
        if not news.author:
            return "Администратор"
        if news.author.role == news.author.Role.ADMIN:
            return "Администратор"
        if news.author.role == news.author.Role.REGIONAL:
            unit_number = str(news.author.region or "").strip()
            return f"Аскер бөлүгү {unit_number}".strip()
        return news.author.full_name or news.author.email

    def get_likeCount(self, news):
        return news.likes.count()

    def get_isLiked(self, news):
        request = self.context.get("request")
        return bool(
            request
            and request.user.is_authenticated
            and news.likes.filter(user=request.user).exists()
        )
