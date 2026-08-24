import uuid
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AdminChatMessage
from .permissions import IsActiveUser, IsAdminRole, IsPrimaryAdmin
from .serializers import (
    ActiveTokenObtainSerializer,
    AdminChatMessageSerializer,
    AdminUserSerializer,
    ModerationSerializer,
    ProfileUpdateSerializer,
    QuickUserCreateSerializer,
    RegistrationSerializer,
    UserPublicSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegistrationSerializer
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": "Заявка отправлена администратору на рассмотрение.",
                "user": UserPublicSerializer(user, context=self.get_serializer_context()).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser]

    def post(self, request):
        serializer = ActiveTokenObtainSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data)


class PendingRequestsView(generics.ListAPIView):
    serializer_class = UserPublicSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        return (
            User.objects.filter(status=User.Status.PENDING)
            .exclude(role=User.Role.ADMIN)
            .order_by("-date_joined")
        )


class UserRequestDetailView(generics.RetrieveAPIView):
    serializer_class = UserPublicSerializer
    permission_classes = [IsAdminRole]
    queryset = User.objects.exclude(role=User.Role.ADMIN)


class AdminUsersView(generics.ListCreateAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return User.objects.all().order_by("-date_joined")


class AdminQuickUserCreateView(generics.CreateAPIView):
    serializer_class = QuickUserCreateSerializer
    permission_classes = [IsAdminRole]
    parser_classes = [JSONParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            AdminUserSerializer(user, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return User.objects.all()

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        if user.is_superuser and not request.user.is_superuser:
            return Response(
                {"detail": "Изменять главного администратора может только главный администратор."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.is_superuser and not request.user.is_superuser:
            return Response(
                {"detail": "Удалять главного администратора может только главный администратор."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if user.id == request.user.id:
            return Response(
                {"detail": "Нельзя удалить свою учетную запись."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.role == User.Role.ADMIN and not User.objects.filter(
            role=User.Role.ADMIN
        ).exclude(pk=user.pk).exists():
            return Response(
                {"detail": "Нельзя удалить последнего администратора."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ModerateRequestView(APIView):
    permission_classes = [IsPrimaryAdmin]

    def post(self, request, pk):
        user_to_review = generics.get_object_or_404(
            User.objects.exclude(role=User.Role.ADMIN), pk=pk
        )
        if user_to_review.status != User.Status.PENDING:
            return Response(
                {"detail": "Эта заявка уже обработана."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ModerationSerializer(
            data=request.data,
            context={"request": request, "user_to_review": user_to_review},
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        if result["status"] == "rejected":
            send_mail(
                "Заявка на доступ отклонена",
                user_to_review.rejection_reason,
                None,
                [user_to_review.email],
                fail_silently=True,
            )

        return Response(result)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserPublicSerializer
    permission_classes = [IsActiveUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user

    def patch(self, request, *args, **kwargs):
        serializer = ProfileUpdateSerializer(
            self.get_object(), data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserPublicSerializer(user, context={"request": request}).data)


class ScopedUsersView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsActiveUser]

    def get_queryset(self):
        user = self.request.user
        qs = User.objects.filter(status=User.Status.ACTIVE)

        if user.role == User.Role.ADMIN:
            return qs.order_by("region", "outpost_name", "full_name")
        if user.role == User.Role.REGIONAL:
            return qs.filter(region=user.region).order_by("outpost_name", "full_name")
        return qs.filter(
            Q(id=user.id) | Q(region=user.region, outpost_name=user.outpost_name)
        ).order_by("full_name")


class AdminChatMessageView(generics.ListCreateAPIView):
    serializer_class = AdminChatMessageSerializer
    permission_classes = [IsActiveUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        qs = AdminChatMessage.objects.select_related("sender", "recipient").order_by("created_at", "id")

        partner_id = self.request.query_params.get("user_id")
        scope = self.request.query_params.get("scope")
        if scope == "outpost_broadcast" and user.role in {User.Role.ADMIN, User.Role.OUTPOST}:
            if user.role == User.Role.ADMIN:
                broadcast_queryset = qs.filter(sender=user, is_broadcast=True)
            else:
                broadcast_queryset = qs.filter(recipient=user, is_broadcast=True)
            return broadcast_queryset.exclude(
                Q(sender=user, deleted_by_sender=True)
                | Q(recipient=user, deleted_by_recipient=True)
            )

        qs = qs.filter(Q(sender=user) | Q(recipient=user), is_broadcast=False)
        if partner_id:
            qs = qs.filter(
                Q(sender_id=partner_id, recipient=user)
                | Q(sender=user, recipient_id=partner_id)
            )

        return qs.exclude(
            Q(sender=user, deleted_by_sender=True)
            | Q(recipient=user, deleted_by_recipient=True)
        )

    def perform_create(self, serializer):
        serializer.save()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        user = request.user
        partner_id = request.query_params.get("user_id")
        scope = request.query_params.get("scope")
        if scope == "outpost_broadcast" and user.role == User.Role.OUTPOST:
            queryset.filter(recipient=user, is_read=False).update(is_read=True)
        if partner_id:
            AdminChatMessage.objects.filter(
                sender_id=partner_id,
                recipient=user,
                is_read=False,
            ).update(is_read=True)

        return Response(self.get_serializer(queryset, many=True).data)


class ChatPartnerListView(generics.ListAPIView):
    serializer_class = UserPublicSerializer
    permission_classes = [IsActiveUser]

    def get_queryset(self):
        user = self.request.user
        users = User.objects.filter(status=User.Status.ACTIVE).exclude(pk=user.pk)
        if user.role == User.Role.ADMIN:
            return users.filter(
                role__in={User.Role.REGIONAL, User.Role.OUTPOST}
            ).order_by("role", "region", "outpost_name", "full_name")
        if user.role == User.Role.REGIONAL:
            return users.filter(
                Q(role=User.Role.OUTPOST, region=user.region) | Q(role=User.Role.ADMIN)
            ).order_by("role", "outpost_name", "full_name")
        if user.role == User.Role.OUTPOST:
            initiating_admin_ids = AdminChatMessage.objects.filter(
                sender__role=User.Role.ADMIN,
                recipient=user,
                is_broadcast=False,
            ).values_list("sender_id", flat=True)
            return users.filter(
                Q(role=User.Role.REGIONAL, region=user.region)
                | Q(role=User.Role.ADMIN, id__in=initiating_admin_ids)
            ).distinct().order_by("role", "full_name")
        return users.none()


class ChatUnreadCountView(APIView):
    permission_classes = [IsActiveUser]

    def get(self, request):
        unread_count = AdminChatMessage.objects.filter(
            recipient=request.user,
            is_read=False,
        ).count()
        return Response({"unreadCount": unread_count})


class AdminChatMessageDeleteView(APIView):
    permission_classes = [IsActiveUser]

    def delete(self, request, pk):
        user = request.user
        message = generics.get_object_or_404(
            AdminChatMessage.objects.filter(Q(sender=user) | Q(recipient=user)),
            pk=pk,
        )
        if message.is_broadcast and user.role != User.Role.ADMIN:
            return Response(
                {"detail": "Жалпы топтун билдирүүсүн администратор гана өчүрө алат."},
                status=status.HTTP_403_FORBIDDEN,
            )
        mode = request.data.get("mode", "self")

        if mode == "everyone":
            if message.sender_id != user.id:
                return Response(
                    {"detail": "Удалить сообщение у всех может только отправитель."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            if message.is_broadcast:
                if user.role != User.Role.ADMIN:
                    return Response(
                        {"detail": "Жалпы топтун билдирүүсүн администратор гана өчүрө алат."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                if message.broadcast_id:
                    broadcast_messages = AdminChatMessage.objects.filter(
                        sender=user,
                        is_broadcast=True,
                        broadcast_id=message.broadcast_id,
                    )
                else:
                    time_margin = timedelta(seconds=2)
                    broadcast_messages = AdminChatMessage.objects.filter(
                        sender=user,
                        is_broadcast=True,
                        body=message.body,
                        attachment_name=message.attachment_name,
                        created_at__gte=message.created_at - time_margin,
                        created_at__lte=message.created_at + time_margin,
                    )
                attachments = [
                    item.attachment
                    for item in broadcast_messages
                    if item.attachment
                ]
                broadcast_messages.update(
                    body="",
                    attachment=None,
                    attachment_kind="",
                    attachment_name="",
                    deleted_for_everyone=True,
                )
                for attachment in attachments:
                    attachment.delete(save=False)
                message.refresh_from_db()
                return Response(
                    AdminChatMessageSerializer(message, context={"request": request}).data
                )

            if message.attachment:
                message.attachment.delete(save=False)
            message.body = ""
            message.attachment = None
            message.attachment_kind = ""
            message.attachment_name = ""
            message.deleted_for_everyone = True
            message.save(
                update_fields=(
                    "body",
                    "attachment",
                    "attachment_kind",
                    "attachment_name",
                    "deleted_for_everyone",
                )
            )
            return Response(
                AdminChatMessageSerializer(message, context={"request": request}).data
            )

        if message.sender_id == user.id:
            message.deleted_by_sender = True
            message.save(update_fields=("deleted_by_sender",))
        else:
            message.deleted_by_recipient = True
            message.save(update_fields=("deleted_by_recipient",))

        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminChatConversationDeleteView(APIView):
    permission_classes = [IsAdminRole]

    @transaction.atomic
    def delete(self, request, partner_pk):
        partner = generics.get_object_or_404(
            User.objects.filter(
                status=User.Status.ACTIVE,
                role__in={User.Role.REGIONAL, User.Role.OUTPOST},
            ),
            pk=partner_pk,
        )
        messages = AdminChatMessage.objects.filter(
            Q(sender=request.user, recipient=partner)
            | Q(sender=partner, recipient=request.user)
        ).filter(is_broadcast=False)
        attachments = [message.attachment for message in messages if message.attachment]
        messages.delete()
        for attachment in attachments:
            attachment.delete(save=False)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminChatOutpostBroadcastView(APIView):
    permission_classes = [IsAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @transaction.atomic
    def post(self, request):
        recipients = list(
            User.objects.filter(
                role=User.Role.OUTPOST,
                status=User.Status.ACTIVE,
            ).order_by("id")
        )
        if not recipients:
            return Response(
                {"detail": "Активдүү заставалар табылган жок."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        body = str(request.data.get("body") or "").strip()
        uploaded_file = request.FILES.get("attachment")
        if not body and not uploaded_file:
            return Response(
                {"body": ["Введите текст или добавьте вложение."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attachment_bytes = uploaded_file.read() if uploaded_file else None
        broadcast_id = uuid.uuid4()
        for recipient in recipients:
            payload = {"body": body, "recipientId": recipient.id}
            if uploaded_file:
                payload["attachment"] = ContentFile(
                    attachment_bytes,
                    name=uploaded_file.name,
                )
            serializer = AdminChatMessageSerializer(
                data=payload,
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            serializer.save(is_broadcast=True, broadcast_id=broadcast_id)

        return Response(
            {"recipientCount": len(recipients)},
            status=status.HTTP_201_CREATED,
        )
