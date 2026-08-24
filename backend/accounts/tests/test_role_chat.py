from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import AdminChatMessage, User


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
            {self.regional.id},
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

        response = self.client.post(
            self.messages_url,
            {"recipientId": self.admin.id, "body": "Администраторго билдирүү"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["recipient"]["id"], self.admin.id)

    def test_outpost_cannot_message_admin_directly(self):
        self.client.force_authenticate(self.outpost)
        response = self.client.post(
            self.messages_url,
            {"recipientId": self.admin.id, "body": "Түз билдирүү"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_admin_can_choose_military_units_and_outposts(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get(self.partners_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {item["id"] for item in response.data},
            {self.regional.id, self.other_regional.id, self.outpost.id},
        )

        response = self.client.post(
            self.messages_url,
            {"recipientId": self.outpost.id, "body": "Түз билдирүү"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)

        self.client.force_authenticate(self.outpost)
        partners = self.client.get(self.partners_url)
        self.assertEqual(
            {item["id"] for item in partners.data},
            {self.regional.id, self.admin.id},
        )
        messages = self.client.get(f"{self.messages_url}?user_id={self.admin.id}")
        self.assertEqual(len(messages.data), 1)
        self.assertEqual(messages.data[0]["body"], "Түз билдирүү")

        reply = self.client.post(
            self.messages_url,
            {"recipientId": self.admin.id, "body": "Заставанын жообу"},
            format="json",
        )
        self.assertEqual(reply.status_code, 201)
        self.assertEqual(reply.data["recipient"]["id"], self.admin.id)

    def test_admin_can_delete_outpost_conversation_for_both_sides(self):
        self.client.force_authenticate(self.admin)
        self.client.post(
            self.messages_url,
            {"recipientId": self.outpost.id, "body": "Өчүрүлүүчү билдирүү"},
            format="json",
        )
        delete_url = reverse(
            "admin-chat-conversation-delete",
            kwargs={"partner_pk": self.outpost.id},
        )

        self.assertEqual(self.client.delete(delete_url).status_code, 204)
        self.assertFalse(AdminChatMessage.objects.exists())

        self.client.force_authenticate(self.outpost)
        self.assertEqual(
            self.client.get(f"{self.messages_url}?user_id={self.admin.id}").data,
            [],
        )
        self.assertNotIn(
            self.admin.id,
            {item["id"] for item in self.client.get(self.partners_url).data},
        )

    def test_admin_broadcast_is_delivered_to_every_active_outpost(self):
        second_outpost = User.objects.create_user(
            username="chat-outpost-2022@example.com",
            email="chat-outpost-2022@example.com",
            password="test-password",
            role=User.Role.OUTPOST,
            status=User.Status.ACTIVE,
            region="2022",
            outpost_name="Достук",
        )
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            reverse("admin-chat-outpost-broadcast"),
            {"body": "Бардык заставалар үчүн билдирүү"},
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["recipientCount"], 2)
        self.assertEqual(
            set(AdminChatMessage.objects.values_list("recipient_id", flat=True)),
            {self.outpost.id, second_outpost.id},
        )
        self.assertFalse(
            AdminChatMessage.objects.filter(recipient=self.regional).exists()
        )
        admin_group_messages = self.client.get(
            f"{self.messages_url}?scope=outpost_broadcast"
        )
        self.assertEqual(len(admin_group_messages.data), 2)
        self.assertEqual(
            len({item["broadcastId"] for item in admin_group_messages.data}),
            1,
        )

        self.client.force_authenticate(second_outpost)
        self.assertIn(
            self.other_regional.id,
            {item["id"] for item in self.client.get(self.partners_url).data},
        )
        self.assertNotIn(
            self.admin.id,
            {item["id"] for item in self.client.get(self.partners_url).data},
        )
        group_messages = self.client.get(
            f"{self.messages_url}?scope=outpost_broadcast"
        )
        self.assertEqual(len(group_messages.data), 1)
        self.assertTrue(group_messages.data[0]["isBroadcast"])
        reply = self.client.post(
            self.messages_url,
            {"recipientId": self.admin.id, "body": "Билдирүүнү алдым"},
            format="json",
        )
        self.assertEqual(reply.status_code, 400)

        self.client.force_authenticate(self.admin)
        delete_message_url = reverse(
            "admin-chat-message-delete",
            kwargs={"pk": admin_group_messages.data[0]["id"]},
        )
        deleted = self.client.delete(
            delete_message_url,
            {"mode": "everyone"},
            format="json",
        )
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(
            AdminChatMessage.objects.filter(
                is_broadcast=True,
                deleted_for_everyone=True,
                body="",
            ).count(),
            2,
        )

    def test_other_unit_cannot_message_foreign_outpost(self):
        self.client.force_authenticate(self.other_regional)
        response = self.client.post(
            self.messages_url,
            {"recipientId": self.outpost.id, "body": "Тыюу салынган"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
