import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import CombatTrainingNews, User


class CombatTrainingNewsApiTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.media_root = tempfile.mkdtemp()
        cls.settings_override = override_settings(MEDIA_ROOT=cls.media_root)
        cls.settings_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls.settings_override.disable()
        shutil.rmtree(cls.media_root, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.admin = User.objects.create_user(
            username="news-admin@example.com",
            email="news-admin@example.com",
            password="test-password",
            role=User.Role.ADMIN,
            status=User.Status.ACTIVE,
        )
        self.user = User.objects.create_user(
            username="news-user@example.com",
            email="news-user@example.com",
            password="test-password",
            role=User.Role.OUTPOST,
            status=User.Status.ACTIVE,
        )
        self.list_url = reverse("combat-training-news-list")

    def create_news(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.list_url,
            {
                "title": "Жаңы маалымат",
                "body": "Күжүрмөн даярдоо боюнча маалымат",
                "files": SimpleUploadedFile("report.txt", b"report body", content_type="text/plain"),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        return response.data

    def test_admin_publishes_and_user_reads_and_likes_news(self):
        created_news = self.create_news()
        self.assertEqual(len(created_news["attachments"]), 1)

        self.client.force_authenticate(self.user)
        unread_response = self.client.get(reverse("combat-training-news-unread-count"))
        self.assertEqual(unread_response.status_code, 200)
        self.assertEqual(unread_response.data["unreadCount"], 1)

        list_response = self.client.get(self.list_url)
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.data["results"][0]["likeCount"], 0)

        like_url = reverse("combat-training-news-like", kwargs={"pk": created_news["id"]})
        like_response = self.client.post(like_url)
        self.assertEqual(like_response.data, {"isLiked": True, "likeCount": 1})

        unlike_response = self.client.post(like_url)
        self.assertEqual(unlike_response.data, {"isLiked": False, "likeCount": 0})

        read_response = self.client.post(reverse("combat-training-news-read-all"))
        self.assertEqual(read_response.data["unreadCount"], 0)
        unread_response = self.client.get(reverse("combat-training-news-unread-count"))
        self.assertEqual(unread_response.data["unreadCount"], 0)

    def test_only_admin_can_create_edit_and_delete_news(self):
        self.client.force_authenticate(self.user)
        forbidden_response = self.client.post(
            self.list_url,
            {"title": "Нельзя", "body": "Текст"},
        )
        self.assertEqual(forbidden_response.status_code, 403)

        created_news = self.create_news()
        detail_url = reverse("combat-training-news-detail", kwargs={"pk": created_news["id"]})
        update_response = self.client.patch(
            detail_url,
            {"title": "Изменённая публикация", "body": "Новый текст"},
            format="multipart",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.data["title"], "Изменённая публикация")

        delete_response = self.client.delete(detail_url)
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(CombatTrainingNews.objects.exists())
