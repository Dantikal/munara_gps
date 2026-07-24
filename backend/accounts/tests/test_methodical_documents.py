import io
import shutil
import tempfile
import zipfile

from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APITestCase

from accounts.models import MethodicalManualSubject, User


def make_docx(text):
    document_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body><w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:body>
    </w:document>"""
    payload = io.BytesIO()
    with zipfile.ZipFile(payload, "w") as archive:
        archive.writestr("word/document.xml", document_xml)
    payload.seek(0)
    payload.name = "program.docx"
    return payload


class MethodicalManualDocumentApiTests(APITestCase):
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
            username="admin@example.com",
            email="admin@example.com",
            password="test-password",
            role=User.Role.ADMIN,
            status=User.Status.ACTIVE,
        )
        self.user = User.objects.create_user(
            username="user@example.com",
            email="user@example.com",
            password="test-password",
            role=User.Role.OUTPOST,
            status=User.Status.ACTIVE,
        )
        self.subject = MethodicalManualSubject.objects.create(
            title="Күжүрмөн даярдоонун окуу программалары"
        )
        self.url = reverse(
            "methodical-document-list",
            kwargs={"subject_pk": self.subject.pk},
        )

    def test_admin_uploads_docx_and_active_user_views_preview(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.url,
            {"title": "Окуу программасы", "file": make_docx("Документтин мазмуну")},
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["title"], "Окуу программасы")
        self.assertIn("Документтин мазмуну", response.data["previewHtml"])
        self.assertNotIn("file", response.data)

        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertIn("Документтин мазмуну", response.data[0]["previewHtml"])

    def test_non_admin_cannot_upload_document(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            self.url,
            {"title": "Окуу программасы", "file": make_docx("Мазмун")},
            format="multipart",
        )
        self.assertEqual(response.status_code, 403)

    def test_admin_creates_text_material(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.url,
            {"title": "Текстовая памятка", "content": "Первая строка\nВторая строка"},
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["kind"], "text")
        self.assertEqual(response.data["content"], "Первая строка\nВторая строка")
        self.assertEqual(response.data["fileUrl"], "")

    def test_admin_uploads_supported_media_and_documents(self):
        self.client.force_authenticate(self.admin)
        materials = [
            ("manual.pdf", b"%PDF-1.4 test", "application/pdf", "pdf"),
            ("photo.jpg", b"test-image", "image/jpeg", "image"),
            ("lesson.mp4", b"test-video", "video/mp4", "video"),
            ("slides.pptx", b"test-slides", "application/octet-stream", "document"),
            ("presentation.ppt", b"test-presentation", "application/vnd.ms-powerpoint", "document"),
            ("presentation.odp", b"test-presentation", "application/vnd.oasis.opendocument.presentation", "document"),
        ]

        for filename, payload, content_type, expected_kind in materials:
            with self.subTest(filename=filename):
                response = self.client.post(
                    self.url,
                    {
                        "title": filename,
                        "file": SimpleUploadedFile(filename, payload, content_type=content_type),
                    },
                    format="multipart",
                )
                self.assertEqual(response.status_code, 201)
                self.assertEqual(response.data["kind"], expected_kind)
                self.assertTrue(response.data["fileUrl"])

    def test_material_requires_text_or_file(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.url,
            {"title": "Пустой материал"},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)

    def test_subjects_are_separated_by_collection(self):
        self.client.force_authenticate(self.admin)
        course_subject = MethodicalManualSubject.objects.create(
            title="Биринчи курс",
            collection=MethodicalManualSubject.Collection.YOUNG_SOLDIER_PROGRAM,
        )

        response = self.client.get(
            reverse("methodical-subject-list"),
            {"collection": MethodicalManualSubject.Collection.YOUNG_SOLDIER_PROGRAM},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [course_subject.id])
        self.assertEqual(
            response.data[0]["collection"],
            MethodicalManualSubject.Collection.YOUNG_SOLDIER_PROGRAM,
        )

    def test_admin_creates_subject_in_young_soldier_collection(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            reverse("methodical-subject-list"),
            {
                "title": "Окуу материалдары",
                "collection": MethodicalManualSubject.Collection.YOUNG_SOLDIER_PROGRAM,
                "order": 1,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.data["collection"],
            MethodicalManualSubject.Collection.YOUNG_SOLDIER_PROGRAM,
        )
