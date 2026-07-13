from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AdminChatMessage
from .permissions import IsActiveUser, IsAdminRole
from .serializers import (
    ActiveTokenObtainSerializer,
    AdminChatMessageSerializer,
    AdminUserSerializer,
    ModerationSerializer,
    ProfileUpdateSerializer,
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

    def get_queryset(self):
        return User.objects.all().order_by("-date_joined")


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        return User.objects.all()

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
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
    permission_classes = [IsAdminRole]

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
    serializer_class = UserPublicSerializer
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

        if user.role == User.Role.ADMIN:
            partner_id = self.request.query_params.get("user_id")
            if partner_id:
                qs = qs.filter(Q(sender_id=partner_id, recipient=user) | Q(sender=user, recipient_id=partner_id))
            else:
                qs = qs.filter(Q(sender__role=User.Role.ADMIN) | Q(recipient__role=User.Role.ADMIN))
        else:
            qs = qs.filter(Q(sender=user, recipient__role=User.Role.ADMIN) | Q(sender__role=User.Role.ADMIN, recipient=user))

        return qs.exclude(
            Q(sender=user, deleted_by_sender=True)
            | Q(recipient=user, deleted_by_recipient=True)
        )

    def perform_create(self, serializer):
        serializer.save()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        response = Response(self.get_serializer(queryset, many=True).data)

        user = request.user
        if user.role == User.Role.ADMIN:
            partner_id = request.query_params.get("user_id")
            if partner_id:
                AdminChatMessage.objects.filter(
                    sender_id=partner_id,
                    recipient=user,
                    is_read=False,
                ).update(is_read=True)
        else:
            AdminChatMessage.objects.filter(
                sender__role=User.Role.ADMIN,
                recipient=user,
                is_read=False,
            ).update(is_read=True)

        return response


class AdminChatMessageDeleteView(APIView):
    permission_classes = [IsActiveUser]

    def delete(self, request, pk):
        user = request.user
        message = generics.get_object_or_404(
            AdminChatMessage.objects.filter(Q(sender=user) | Q(recipient=user)),
            pk=pk,
        )
        mode = request.data.get("mode", "self")

        if mode == "everyone":
            if message.sender_id != user.id:
                return Response(
                    {"detail": "Удалить сообщение у всех может только отправитель."},
                    status=status.HTTP_403_FORBIDDEN,
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
