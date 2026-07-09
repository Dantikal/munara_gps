from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.status == user.Status.ACTIVE
            and (user.role == user.Role.ADMIN or user.is_superuser)
        )


class IsActiveUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.status == user.Status.ACTIVE
        )
