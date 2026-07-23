from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import CombatTrainingJournalRevision, User


class ThematicAccountSubmissionApiTests(APITestCase):
    def setUp(self):
        self.outpost = User.objects.create_user(
            username="outpost-2021@example.com",
            email="outpost-2021@example.com",
            password="test-password",
            role=User.Role.OUTPOST,
            status=User.Status.ACTIVE,
            unit_type=User.UnitType.OUTPOST,
            region="2021",
            outpost_name="Жаштык чек ара заставасы",
        )
        self.regional = User.objects.create_user(
            username="unit-2021@example.com",
            email="unit-2021@example.com",
            password="test-password",
            role=User.Role.REGIONAL,
            status=User.Status.ACTIVE,
            unit_type=User.UnitType.REGIONAL,
            region="2021",
        )
        self.other_regional = User.objects.create_user(
            username="unit-2022@example.com",
            email="unit-2022@example.com",
            password="test-password",
            role=User.Role.REGIONAL,
            status=User.Status.ACTIVE,
            unit_type=User.UnitType.REGIONAL,
            region="2022",
        )
        self.url = reverse("thematic-account-submission-list")

    def test_regional_user_sees_registered_outposts_from_own_unit(self):
        User.objects.create_user(
            username="outpost-2022@example.com",
            email="outpost-2022@example.com",
            password="test-password",
            role=User.Role.OUTPOST,
            status=User.Status.ACTIVE,
            unit_type=User.UnitType.OUTPOST,
            region="2022",
            outpost_name="Other unit outpost",
        )
        self.client.force_authenticate(self.regional)

        response = self.client.get(reverse("combat-training-journal-outpost-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["unitNumber"], "2021")
        self.assertEqual(response.data[0]["name"], self.outpost.outpost_name)

    def test_outpost_submission_is_visible_only_to_matching_unit(self):
        self.client.force_authenticate(self.outpost)
        response = self.client.post(
            self.url,
            {
                "documentTitle": "Июль айынын тематикалык эсеби",
                "sectionId": "thematic-account",
                "periodId": "period-1",
                "table": {"title": "Сабактардын тематикалык эсеби", "columns": [], "rows": []},
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["unitNumber"], "2021")

        self.client.force_authenticate(self.regional)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["documentTitle"], "Июль айынын тематикалык эсеби")

        self.client.force_authenticate(self.other_regional)
        response = self.client.get(self.url)
        self.assertEqual(response.data, [])

    def test_matching_regional_unit_can_forward_outpost_document_to_admin(self):
        self.client.force_authenticate(self.outpost)
        response = self.client.post(
            self.url,
            {
                "documentTitle": "Outpost document",
                "sectionId": "lesson-schedule",
                "periodId": "lesson-schedule-week-1",
                "table": {"title": "Schedule", "columns": [], "rows": []},
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        source_id = response.data["id"]

        self.client.force_authenticate(self.regional)
        response = self.client.post(
            reverse("thematic-account-submission-forward", kwargs={"pk": source_id}),
            {"documentTitle": "Regional outgoing document"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["senderRole"], User.Role.REGIONAL)
        self.assertEqual(response.data["documentTitle"], "Regional outgoing document")
        self.assertEqual(response.data["sectionId"], "lesson-schedule")
        self.assertEqual(response.data["table"]["title"], "Schedule")

        admin = User.objects.create_user(
            username="admin@example.com",
            email="admin@example.com",
            password="test-password",
            role=User.Role.ADMIN,
            status=User.Status.ACTIVE,
        )
        self.client.force_authenticate(admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        forwarded = [item for item in response.data if item["senderRole"] == User.Role.REGIONAL]
        self.assertEqual(len(forwarded), 1)
        self.assertEqual(forwarded[0]["documentTitle"], "Regional outgoing document")
        self.assertEqual(forwarded[0]["unitNumber"], "2021")

        response = self.client.get(reverse("dashboard-admin"))
        self.assertEqual(response.status_code, 200)
        expected_unit_numbers = [
            "2021", "2022", "2023", "2024", "2025", "2026", "2027", "2028",
            "2029", "2030", "2031", "2032", "2055", "2056", "2057", "2051",
            "2053", "2063", "2064", "2065", "КЖжАККДБ", "ЧАП",
        ]
        self.assertEqual(response.data["modules"]["library"]["unitNumbers"], expected_unit_numbers)
        self.assertEqual(
            response.data["modules"]["combatTrainingJournal"]["unitNumbers"],
            expected_unit_numbers,
        )
        self.assertEqual(
            response.data["modules"]["combatTrainingResults"]["unitNumbers"],
            expected_unit_numbers,
        )
        self.assertEqual(
            response.data["modules"]["analytics"]["unitNumbers"],
            expected_unit_numbers,
        )

    def test_outpost_can_submit_lesson_schedule(self):
        self.client.force_authenticate(self.outpost)
        response = self.client.post(
            self.url,
            {
                "documentTitle": "Июль айынын сабактар жүгүртмөсү",
                "sectionId": "lesson-schedule",
                "periodId": "lesson-schedule-week-1",
                "table": {"title": "Сабактардын жүгүртмөсү", "columns": [], "rows": []},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["sectionId"], "lesson-schedule")

    def test_outpost_can_submit_command_training_table(self):
        self.client.force_authenticate(self.outpost)
        response = self.client.post(
            self.url,
            {
                "documentTitle": "Командирдик даярдоонун тематикалык эсеби",
                "sectionId": "command-thematic-account",
                "periodId": "period-1",
                "table": {"title": "Сабактардын тематикалык эсеби", "columns": [], "rows": []},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["sectionId"], "command-thematic-account")

        self.client.force_authenticate(self.regional)
        response = self.client.get(self.url)
        self.assertEqual(response.data[0]["documentTitle"], "Командирдик даярдоонун тематикалык эсеби")

    def test_regional_unit_can_submit_own_command_training_table_to_admin(self):
        self.client.force_authenticate(self.regional)
        response = self.client.post(
            self.url,
            {
                "documentTitle": "Regional command training document",
                "sectionId": "command-thematic-account",
                "periodId": "period-1",
                "table": {"title": "Command training", "columns": [], "rows": []},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["senderRole"], User.Role.REGIONAL)
        self.assertEqual(response.data["sectionId"], "command-thematic-account")

        admin = User.objects.create_user(
            username="command-admin@example.com",
            email="command-admin@example.com",
            password="test-password",
            role=User.Role.ADMIN,
            status=User.Status.ACTIVE,
        )
        self.client.force_authenticate(admin)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["documentTitle"], "Regional command training document")
        self.assertEqual(response.data[0]["senderRole"], User.Role.REGIONAL)

    def test_outpost_can_submit_typical_week(self):
        self.client.force_authenticate(self.outpost)
        response = self.client.post(
            self.url,
            {
                "documentTitle": "Бөлүкчөнүн типовая неделясы",
                "sectionId": "typical-week",
                "periodId": "custom-week",
                "table": {"title": "Типовая неделя", "columns": [], "rows": []},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["sectionId"], "typical-week")

    def test_outpost_can_submit_personnel_combat_training_journal(self):
        self.client.force_authenticate(self.outpost)
        response = self.client.post(
            self.url,
            {
                "documentTitle": "Июль айынын күжүрмөн даярдоо журналы",
                "sectionId": "combat-training-personnel-journal",
                "periodId": "journal-2026",
                "table": {"title": "Күжүрмөн даярдоону каттоо журналы", "columns": [], "rows": []},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["sectionId"], "combat-training-personnel-journal")
        submission_id = response.data["id"]

        response = self.client.post(
            self.url,
            {
                "documentTitle": "Июль айынын күжүрмөн даярдоо журналы",
                "sectionId": "combat-training-personnel-journal",
                "periodId": "journal-2026",
                "table": {
                    "title": "Күжүрмөн даярдоону каттоо журналы",
                    "columns": [],
                    "rows": [{"number": 1, "hours": "2"}],
                },
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("updatedAt", response.data)
        self.assertEqual(CombatTrainingJournalRevision.objects.count(), 2)
        self.assertEqual(len(response.data["revisions"]), 2)
        self.assertEqual(response.data["revisions"][0]["table"]["rows"][0]["hours"], "2")
        self.assertEqual(response.data["revisions"][1]["table"]["rows"], [])

        revision_id = response.data["revisions"][0]["id"]
        self.client.force_authenticate(self.regional)
        read_response = self.client.patch(
            reverse("combat-training-journal-revision-detail", args=[revision_id]),
            {"isRead": True},
            format="json",
        )
        self.assertEqual(read_response.status_code, 200)
        self.assertTrue(read_response.data["isRead"])

        list_response = self.client.get(self.url)
        self.assertTrue(list_response.data[0]["revisions"][0]["isRead"])

        delete_response = self.client.delete(
            reverse("combat-training-journal-revision-detail", args=[revision_id])
        )
        self.assertEqual(delete_response.status_code, 204)
        self.assertEqual(CombatTrainingJournalRevision.objects.count(), 2)

        regional_list_response = self.client.get(self.url)
        self.assertEqual(len(regional_list_response.data[0]["revisions"]), 1)

        self.client.force_authenticate(self.outpost)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(len(response.data[0]["revisions"]), 2)
        self.assertEqual(response.data[0]["documentTitle"], "Июль айынын күжүрмөн даярдоо журналы")
        self.assertEqual(response.data[0]["table"]["rows"][0]["hours"], "2")

        self.client.force_authenticate(self.regional)
        forward_response = self.client.post(
            reverse("thematic-account-submission-forward", kwargs={"pk": submission_id}),
            {"documentTitle": "Аскер бөлүгүнөн жөнөтүлгөн журнал"},
            format="json",
        )
        self.assertEqual(forward_response.status_code, 201)
        self.assertEqual(len(forward_response.data["revisions"]), 2)

    def test_regional_unit_can_submit_command_training_journal_to_admin(self):
        self.client.force_authenticate(self.regional)
        response = self.client.post(
            self.url,
            {
                "documentTitle": "Command training journal",
                "sectionId": "combat-training-command-journal",
                "periodId": "command-journal-2026",
                "table": {
                    "title": "Command training registration journal",
                    "columns": [],
                    "rows": [{"number": 1, "hours": "4"}],
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["senderRole"], User.Role.REGIONAL)
        self.assertEqual(response.data["sectionId"], "combat-training-command-journal")

        admin = User.objects.create_user(
            username="journal-admin@example.com",
            email="journal-admin@example.com",
            password="test-password",
            role=User.Role.ADMIN,
            status=User.Status.ACTIVE,
        )
        self.client.force_authenticate(admin)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["documentTitle"], "Command training journal")
        self.assertEqual(response.data[0]["table"]["rows"][0]["hours"], "4")

    def test_observation_subjects_are_grouped_in_one_result_document(self):
        self.client.force_authenticate(self.outpost)
        for subject_id, subject_title in (("observation-tpv", "ТПВ"), ("observation-ogp", "ОГП")):
            response = self.client.post(
                self.url,
                {
                    "documentTitle": "Март айынын көзөмөл сабактары",
                    "sectionId": "combat-training-results-observation",
                    "periodId": "",
                    "table": {
                        "subjectId": subject_id,
                        "subjectTitle": subject_title,
                        "periodId": f"{subject_id}-march",
                        "periodTitle": "март",
                        "table": {"title": subject_title, "columns": [], "rows": []},
                    },
                },
                format="json",
            )
            self.assertIn(response.status_code, (200, 201))

        self.client.force_authenticate(self.regional)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            set(response.data[0]["table"]["subjects"]),
            {"observation-tpv", "observation-ogp"},
        )

        submission_id = response.data[0]["id"]
        self.client.force_authenticate(self.outpost)
        detail_url = reverse(
            "thematic-account-submission-detail",
            kwargs={"pk": submission_id},
        )
        response = self.client.delete(f"{detail_url}?subjectId=observation-tpv")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(response.data["table"]["subjects"]),
            {"observation-ogp"},
        )

    def test_regional_observation_subjects_are_grouped_for_admin(self):
        self.client.force_authenticate(self.regional)
        for subject_id in ("observation-tpv", "observation-ogp"):
            response = self.client.post(
                self.url,
                {
                    "documentTitle": "Regional observation results",
                    "sectionId": "combat-training-results-observation",
                    "periodId": "",
                    "table": {
                        "subjectId": subject_id,
                        "subjectTitle": subject_id,
                        "periodId": f"{subject_id}-period",
                        "periodTitle": "period",
                        "table": {"title": subject_id, "columns": [], "rows": []},
                    },
                },
                format="json",
            )
            self.assertIn(response.status_code, (200, 201))

        admin = User.objects.create_user(
            username="observation-admin@example.com",
            email="observation-admin@example.com",
            password="test-password",
            role=User.Role.ADMIN,
            status=User.Status.ACTIVE,
        )
        self.client.force_authenticate(admin)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["documentTitle"], "Regional observation results")
        self.assertEqual(response.data[0]["senderRole"], User.Role.REGIONAL)
        self.assertEqual(
            set(response.data[0]["table"]["subjects"]),
            {"observation-tpv", "observation-ogp"},
        )

    def test_outpost_can_submit_inspection_result_to_matching_unit(self):
        self.client.force_authenticate(self.outpost)
        response = self.client.post(
            self.url,
            {
                "documentTitle": "Окуу жылынын жыйынтыгы",
                "sectionId": "combat-training-results-inspection",
                "periodId": "",
                "table": {
                    "subsectionId": "inspection-summary-1",
                    "subsectionTitle": "Сводная ведомость за учебный год",
                    "periodId": "inspection-summary-1-period-1",
                    "periodTitle": "1-ай",
                    "table": {"title": "Сводная ведомость", "columns": [], "rows": []},
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["sectionId"], "combat-training-results-inspection")

        self.client.force_authenticate(self.regional)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["table"]["subsectionId"], "inspection-summary-1")

        self.client.force_authenticate(self.other_regional)
        self.assertEqual(self.client.get(self.url).data, [])

    def test_outpost_can_submit_combat_training_analysis(self):
        self.client.force_authenticate(self.outpost)
        response = self.client.post(
            self.url,
            {
                "documentTitle": "Июль айынын талдоосу",
                "sectionId": "combat-training-analysis",
                "periodId": "monthly-analysis",
                "table": {
                    "sectionId": "monthly-analysis",
                    "sectionTitle": "Айдын талдоосу",
                    "document": {"title": "Июль", "body": "Талдоонун тексти"},
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.client.force_authenticate(self.regional)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["table"]["document"]["body"], "Талдоонун тексти")

    def test_regional_unit_can_submit_own_combat_training_analysis(self):
        self.client.force_authenticate(self.regional)
        response = self.client.post(
            self.url,
            {
                "documentTitle": "Аскер бөлүктүн жылдык талдоосу",
                "sectionId": "combat-training-analysis-regional",
                "periodId": "year-analysis",
                "table": {
                    "sectionId": "year-analysis",
                    "sectionTitle": "Окуу жылынын талдоосу",
                    "document": {"title": "Жылдык талдоо", "body": "Жыйынтык"},
                },
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["sectionId"], "combat-training-analysis-regional")

        admin = User.objects.create_user(
            username="analysis-admin@example.com",
            email="analysis-admin@example.com",
            password="test-password",
            role=User.Role.ADMIN,
            status=User.Status.ACTIVE,
        )
        self.client.force_authenticate(admin)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["senderRole"], User.Role.REGIONAL)
        self.assertEqual(response.data[0]["table"]["sectionId"], "year-analysis")
        self.assertEqual(response.data[0]["table"]["document"]["body"], "Жыйынтык")

    def test_matching_regional_unit_can_delete_personnel_training_submissions(self):
        for section_id in ("thematic-account", "lesson-schedule"):
            self.client.force_authenticate(self.outpost)
            response = self.client.post(
                self.url,
                {
                    "documentTitle": f"Өчүрүлүүчү документ: {section_id}",
                    "sectionId": section_id,
                    "periodId": "period-1",
                    "table": {"title": "Таблица", "columns": [], "rows": []},
                },
                format="json",
            )
            detail_url = reverse(
                "thematic-account-submission-detail",
                kwargs={"pk": response.data["id"]},
            )

            self.client.force_authenticate(self.other_regional)
            self.assertEqual(self.client.delete(detail_url).status_code, 403)

            self.client.force_authenticate(self.regional)
            self.assertEqual(self.client.delete(detail_url).status_code, 204)

        self.assertEqual(self.client.get(self.url).data, [])

    def test_sender_outpost_can_still_delete_own_submission(self):
        self.client.force_authenticate(self.outpost)
        response = self.client.post(
            self.url,
            {
                "documentTitle": "Өчүрүлүүчү документ",
                "sectionId": "command-thematic-account",
                "periodId": "period-1",
                "table": {"title": "Сабактардын тематикалык эсеби", "columns": [], "rows": []},
            },
            format="json",
        )
        detail_url = reverse(
            "thematic-account-submission-detail",
            kwargs={"pk": response.data["id"]},
        )

        self.assertEqual(self.client.delete(detail_url).status_code, 204)

    def test_sender_can_request_edit_permission_and_admin_can_approve(self):
        self.client.force_authenticate(self.outpost)
        response = self.client.post(
            self.url,
            {
                "documentTitle": "Document awaiting correction",
                "sectionId": "thematic-account",
                "periodId": "period-1",
                "table": {"title": "Table", "columns": [], "rows": []},
            },
            format="json",
        )
        submission_id = response.data["id"]
        response = self.client.post(
            reverse("submission-edit-request-create", kwargs={"pk": submission_id}),
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "pending")

        admin = User.objects.create_user(
            username="edit-request-admin@example.com",
            email="edit-request-admin@example.com",
            password="test-password",
            role=User.Role.ADMIN,
            status=User.Status.ACTIVE,
        )
        self.client.force_authenticate(admin)
        response = self.client.patch(
            reverse("submission-edit-request-decision", kwargs={"pk": response.data["id"]}),
            {"status": "approved"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "approved")
        self.assertTrue(response.data["submission"]["canEdit"])

        self.client.force_authenticate(self.outpost)
        response = self.client.get(self.url)
        self.assertEqual(response.data[0]["editRequestStatus"], "approved")
        self.assertTrue(response.data[0]["canEdit"])
