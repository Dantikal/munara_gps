from datetime import timedelta

from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication


class ActivityJWTAuthentication(JWTAuthentication):
    """Record recent API activity without writing on every single request."""

    update_interval = timedelta(seconds=30)

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None

        user, validated_token = result
        now = timezone.now()
        if not user.last_login or now - user.last_login >= self.update_interval:
            type(user).objects.filter(pk=user.pk).update(last_login=now)
            user.last_login = now
        return user, validated_token
