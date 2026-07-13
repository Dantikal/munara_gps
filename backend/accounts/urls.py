from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AdminUserDetailView,
    AdminUsersView,
    AdminChatMessageView,
    LoginView,
    MeView,
    ModerateRequestView,
    PendingRequestsView,
    RegisterView,
    ScopedUsersView,
    UserRequestDetailView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("users/", ScopedUsersView.as_view(), name="scoped-users"),
    path("admin/users/", AdminUsersView.as_view(), name="admin-users"),
    path("admin/users/<int:pk>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("admin/requests/", PendingRequestsView.as_view(), name="pending-requests"),
    path("admin/requests/<int:pk>/", UserRequestDetailView.as_view(), name="request-detail"),
    path("admin/requests/<int:pk>/moderate/", ModerateRequestView.as_view(), name="moderate-request"),
    path("chat/messages/", AdminChatMessageView.as_view(), name="admin-chat-messages"),
]
