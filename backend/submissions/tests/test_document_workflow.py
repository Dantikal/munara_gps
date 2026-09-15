from unittest.mock import patch

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase

from accounts.models import User
from submissions.models import CombatTrainingJournalRevision, ThematicAccountSubmission


class DocumentWorkflowTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.password = "workflow-test-password"
        cls.outpost = User.objects.create_user(
            username="workflow-outpost", email="workflow-outpost@example.com",
            password=cls.password, role=User.Role.OUTPOST, status=User.Status.ACTIVE,
            region="2021", outpost_name="Жаштык чек ара заставасы",
        )
        cls.regional = User.objects.create_user(
            username="workflow-regional", email="workflow-regional@example.com",
            password=cls.password, role=User.Role.REGIONAL, status=User.Status.ACTIVE,
            region="2021",
        )
        cls.other_regional = User.objects.create_user(
            username="workflow-other", email="workflow-other@example.com",
            password=cls.password, role=User.Role.REGIONAL, status=User.Status.ACTIVE,
            region="2022",
        )
        cls.admin = User.objects.create_superuser(
            username="workflow-admin", email="workflow-admin@example.com", password=cls.password,
        )

    def login(self, user):
        client = APIClient()
        response = client.post(reverse("login"), {
            "email": user.email, "password": self.password,
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        return client

    def test_jwt_login_send_receive_forward_approve_and_correct(self):
        outpost = self.login(self.outpost)
        regional = self.login(self.regional)
        admin = self.login(self.admin)
        other = self.login(self.other_regional)
        for client, route in [
            (outpost, "dashboard-outpost"),
            (regional, "dashboard-regional"),
            (admin, "dashboard-admin"),
        ]:
            response = client.get(reverse(route))
            self.assertEqual(response.status_code, 200, response.data)
            self.assertIn("modules", response.data)

        url = reverse("thematic-account-submission-list")
        table = {"title": "Жүгүртмө", "columns": [{"key": "topic", "label": "Тема"}],
                 "rows": [{"topic": "Чек ара даярдыгы"}]}
        sent = outpost.post(url, {
            "documentTitle": "Текшерүү документи", "sectionId": "lesson-schedule",
            "periodId": "workflow-week", "table": table,
        }, format="json")
        self.assertEqual(sent.status_code, 201, sent.data)
        source_id = sent.data["id"]
        self.assertEqual(sent.data["table"], table)
        self.assertEqual(other.get(url).data, [])
        received = regional.get(url)
        self.assertEqual(received.status_code, 200)
        self.assertEqual(received.data[0]["id"], source_id)
        self.assertEqual(received.data[0]["table"], table)

        forwarded = regional.post(reverse("thematic-account-submission-forward", kwargs={"pk": source_id}), {
            "documentTitle": "Аскер бөлүгүнүн документи",
        }, format="json")
        self.assertEqual(forwarded.status_code, 201, forwarded.data)
        self.assertNotEqual(forwarded.data["id"], source_id)
        self.assertEqual(forwarded.data["table"], table)
        admin_received = admin.get(url)
        self.assertEqual(admin_received.status_code, 200)
        self.assertIn(forwarded.data["id"], [item["id"] for item in admin_received.data])

        edit = outpost.post(reverse("submission-edit-request-create", kwargs={"pk": source_id}), {}, format="json")
        self.assertEqual(edit.status_code, 201, edit.data)
        approved = admin.patch(reverse("submission-edit-request-decision", kwargs={"pk": edit.data["id"]}), {
            "status": "approved",
        }, format="json")
        self.assertEqual(approved.status_code, 200, approved.data)
        corrected_table = {**table, "rows": [{"topic": "Жаңыртылган тема"}]}
        corrected = outpost.patch(reverse("thematic-account-submission-detail", kwargs={"pk": source_id}), {
            "documentTitle": "Оңдолгон документ", "table": corrected_table,
        }, format="json")
        self.assertEqual(corrected.status_code, 200, corrected.data)
        self.assertTrue(corrected.data["isCorrected"])
        received = next(item for item in regional.get(url).data if item["id"] == source_id)
        self.assertEqual(received["table"], corrected_table)
        # A forwarded document is a snapshot; correcting the source cannot change it.
        self.assertEqual(ThematicAccountSubmission.objects.get(pk=forwarded.data["id"]).table_data, table)

    def test_failed_journal_send_rolls_back_document_and_revision(self):
        client = self.login(self.outpost)
        with patch.object(CombatTrainingJournalRevision.objects, "create", side_effect=RuntimeError("Simulated save failure")):
            with self.assertRaises(RuntimeError):
                client.post(reverse("thematic-account-submission-list"), {
                    "documentTitle": "Журнал", "sectionId": "combat-training-personnel-journal",
                    "periodId": "workflow-journal", "table": {"rows": []},
                }, format="json")
        self.assertFalse(ThematicAccountSubmission.objects.exists())
        self.assertFalse(CombatTrainingJournalRevision.objects.exists())

    def test_failed_journal_forward_keeps_source_without_partial_copy(self):
        source = ThematicAccountSubmission.objects.create(
            sender=self.outpost, unit_number="2021", outpost_name=self.outpost.outpost_name,
            document_title="Журнал", section_slug="combat-training-personnel-journal",
            table_data={"rows": [{"topic": "Original"}]},
        )
        revision = CombatTrainingJournalRevision.objects.create(
            submission=source, document_title=source.document_title, table_data=source.table_data,
        )
        client = self.login(self.regional)
        with patch.object(CombatTrainingJournalRevision.objects, "bulk_create", side_effect=RuntimeError("Simulated save failure")):
            with self.assertRaises(RuntimeError):
                client.post(reverse("thematic-account-submission-forward", kwargs={"pk": source.pk}), {
                    "documentTitle": "Forwarded journal",
                }, format="json")
        self.assertEqual(list(ThematicAccountSubmission.objects.values_list("pk", flat=True)), [source.pk])
        self.assertEqual(list(CombatTrainingJournalRevision.objects.values_list("pk", flat=True)), [revision.pk])
        source.refresh_from_db()
        self.assertEqual(source.table_data, {"rows": [{"topic": "Original"}]})

    def test_document_list_does_not_query_edit_requests_for_each_document(self):
        client = APIClient()
        client.force_authenticate(self.regional)
        ThematicAccountSubmission.objects.create(
            sender=self.outpost, unit_number="2021", document_title="Document 1",
            section_slug="lesson-schedule", table_data={"rows": []},
        )
        with CaptureQueriesContext(connection) as single_queries:
            response = client.get(reverse("thematic-account-submission-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        ThematicAccountSubmission.objects.bulk_create([
            ThematicAccountSubmission(
                sender=self.outpost, unit_number="2021", document_title=f"Document {number}",
                section_slug="lesson-schedule", table_data={"rows": []},
            ) for number in range(2, 26)
        ])
        with CaptureQueriesContext(connection) as many_queries:
            response = client.get(reverse("thematic-account-submission-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 25)
        self.assertEqual(len(many_queries), len(single_queries))
