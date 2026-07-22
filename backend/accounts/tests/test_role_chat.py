from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import User


class RoleChatApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="chat-admin@example.com",
            email="chat-admin@example.com",
            password="test-password",
            role=User.Role.ADMIN,
            status=User.Status.ACTIVE,
        )
        self.regional = User.objects.create_user(
            username="chat-unit-2021@example.com",
            email="chat-unit-2021@example.com",
            password="test-password",
            role=User.Role.REGIONAL,
            status=User.Status.ACTIVE,
            region="2021",
        )
        self.outpost = User.objects.create_user(
            username="chat-outpost-2021@example.com",
            email="chat-outpost-2021@example.com",
            password="test-password",
            role=User.Role.OUTPOST,
            status=User.Status.ACTIVE,
            region="2021",
            outpost_name="Жаштык",
        )
        self.other_regional = User.objects.create_user(
            username="chat-unit-2022@example.com",
            email="chat-unit-2022@example.com",
            password="test-password",
            role=User.Role.REGIONAL,
            status=User.Status.ACTIVE,
            region="2022",
        )
        self.messages_url = reverse("admin-chat-messages")
        self.partners_url = reverse("chat-partners")

    def test_outpost_can_choose_matching_regional_and_regional_can_reply(self):
        self.client.force_authenticate(self.outpost)
        response = self.client.get(self.partners_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {item["id"] for item in response.data},
            {self.admin.id, self.regional.id},
        )

        response = self.client.post(
            self.messages_url,
            {"recipientId": self.regional.id, "body": "Саламатсызбы"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["recipient"]["id"], self.regional.id)

        self.client.force_authenticate(self.regional)
        dashboard = self.client.get(reverse("dashboard-regional"))
        self.assertEqual(dashboard.data["modules"]["chatUnreadCount"], 1)

        response = self.client.get(f"{self.messages_url}?user_id={self.outpost.id}")
        self.assertEqual(len(response.data), 1)
        self.assertTrue(response.data[0]["isRead"])

        response = self.client.post(
            self.messages_url,
            {"recipientId": self.outpost.id, "body": "Жообу"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["recipient"]["id"], self.outpost.id)

    def test_other_unit_cannot_message_foreign_outpost(self):
        self.client.force_authenticate(self.other_regional)
        response = self.client.post(
            self.messages_url,
            {"recipientId": self.outpost.id, "body": "Тыюу салынган"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
