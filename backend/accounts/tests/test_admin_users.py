import base64
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import SubmissionEditRequest, ThematicAccountSubmission, User


PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


class AdminUsersApiTests(APITestCase):
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
            username="users-admin@example.com",
            email="users-admin@example.com",
            password="test-password",
            role=User.Role.ADMIN,
            status=User.Status.ACTIVE,
        )
        self.client.force_authenticate(self.admin)

    def test_admin_creates_user_with_registration_fields_and_face_photo(self):
        response = self.client.post(
            reverse("admin-users"),
            {
                "email": "new-outpost@example.com",
                "password": "test-password",
                "full_name": "Новый пользователь",
                "military_rank": "капитан",
                "position": "начальник",
                "unit_type": User.UnitType.OUTPOST,
                "phone": "+996123456789",
                "region": "2021",
                "outpost_name": "Ак-Чечек чек ара заставасы",
                "role": User.Role.OUTPOST,
                "status": User.Status.ACTIVE,
                "photo_face": SimpleUploadedFile("face.png", PNG_BYTES, content_type="image/png"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["outpost_name"], "Ак-Чечек чек ара заставасы")
        self.assertTrue(response.data["photo_face"])
        self.assertNotIn("photo_military_id", response.data)

    def test_registration_stores_full_outpost_name(self):
        response = self.client.post(
            reverse("register"),
            {
                "email": "registered-outpost@example.com",
                "password": "test-password",
                "full_name": "Новый пользователь",
                "military_rank": "капитан",
                "position": "начальник",
                "unit_type": User.UnitType.OUTPOST,
                "phone": "+996123456789",
                "region": "2032",
                "outpost_name": "Достук",
                "photo_face": SimpleUploadedFile("face.png", PNG_BYTES, content_type="image/png"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(
            response.data["user"]["outpost_name"],
            "Достук чек ара заставасы",
        )

    def test_registration_accepts_named_subunits(self):
        for unit_type, unit_name in (
            (User.UnitType.DETACHMENT, "Баткен отряды"),
            (User.UnitType.GROUP, "Ыкчам топ"),
            (User.UnitType.COMPANY, "Биринчи рота"),
            (User.UnitType.PLATOON, "Экинчи взвод"),
        ):
            with self.subTest(unit_type=unit_type):
                response = self.client.post(
                    reverse("register"),
                    {
                        "email": f"{unit_type}@example.com",
                        "password": "test-password",
                        "full_name": "Жаңы колдонуучу",
                        "military_rank": "капитан",
                        "position": "башчы",
                        "unit_type": unit_type,
                        "phone": "+996123456789",
                        "region": "2032",
                        "outpost_name": unit_name,
                        "photo_face": SimpleUploadedFile(
                            "face.png", PNG_BYTES, content_type="image/png"
                        ),
                    },
                    format="multipart",
                )

                self.assertEqual(response.status_code, 201, response.data)
                self.assertEqual(response.data["user"]["unit_type"], unit_type)
                self.assertEqual(response.data["user"]["region"], "2032")
                self.assertEqual(response.data["user"]["outpost_name"], unit_name)
                self.assertEqual(response.data["user"]["role"], User.Role.OUTPOST)

    def test_registration_accepts_institution_with_only_military_unit_number(self):
        response = self.client.post(
            reverse("register"),
            {
                "email": "institution@example.com",
                "password": "test-password",
                "full_name": "Мекеме колдонуучусу",
                "military_rank": "капитан",
                "position": "башчы",
                "unit_type": User.UnitType.INSTITUTION,
                "phone": "+996123456789",
                "region": "2032",
                "photo_face": SimpleUploadedFile(
                    "face.png", PNG_BYTES, content_type="image/png"
                ),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["user"]["unit_type"], User.UnitType.INSTITUTION)
        self.assertEqual(response.data["user"]["region"], "2032")
        self.assertEqual(response.data["user"]["outpost_name"], "")
        self.assertEqual(response.data["user"]["role"], User.Role.REGIONAL)

    def test_admin_deletes_user_with_related_submission_records(self):
        user = User.objects.create_user(
            username="deleted-user@example.com",
            email="deleted-user@example.com",
            password="test-password",
            role=User.Role.OUTPOST,
            status=User.Status.ACTIVE,
            region="2032",
            outpost_name="Достук",
        )
        submission = ThematicAccountSubmission.objects.create(
            sender=user,
            unit_number=user.region,
            outpost_name=user.outpost_name,
            document_title="Тематический отчёт",
            table_data={},
        )
        edit_request = SubmissionEditRequest.objects.create(
            submission=submission,
            requester=user,
        )

        response = self.client.delete(reverse("admin-user-detail", args=[user.id]))

        self.assertEqual(response.status_code, 204)
        self.assertFalse(User.objects.filter(pk=user.id).exists())
        self.assertFalse(ThematicAccountSubmission.objects.filter(pk=submission.id).exists())
        self.assertFalse(SubmissionEditRequest.objects.filter(pk=edit_request.id).exists())
