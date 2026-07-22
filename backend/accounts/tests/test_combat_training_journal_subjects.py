from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import CombatTrainingJournalSubject, User


class CombatTrainingJournalSubjectApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="journal-subject-admin@example.com",
            email="journal-subject-admin@example.com",
            password="test-password",
            role=User.Role.ADMIN,
            status=User.Status.ACTIVE,
        )
        self.outpost = User.objects.create_user(
            username="journal-subject-outpost@example.com",
            email="journal-subject-outpost@example.com",
            password="test-password",
            role=User.Role.OUTPOST,
            status=User.Status.ACTIVE,
        )
        self.url = reverse("combat-training-journal-subject-list")

    def test_active_user_can_list_default_subjects(self):
        self.client.force_authenticate(self.outpost)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 30)
        self.assertEqual(response.data[0]["title"], "Автобронетанктык даярдык")
        self.assertEqual(response.data[-1]["title"], "Дене тарбия даярдыгы")

    def test_only_admin_can_add_subject(self):
        self.client.force_authenticate(self.outpost)
        forbidden = self.client.post(self.url, {"title": "Жаңы даярдык"}, format="json")
        self.assertEqual(forbidden.status_code, 403)

        self.client.force_authenticate(self.admin)
        created = self.client.post(self.url, {"title": "Жаңы даярдык", "order": 31}, format="json")
        self.assertEqual(created.status_code, 201)
        self.assertTrue(CombatTrainingJournalSubject.objects.filter(title="Жаңы даярдык").exists())
