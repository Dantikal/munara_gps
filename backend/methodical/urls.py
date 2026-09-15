from django.urls import path

from methodical.views import (
    MethodicalManualDocumentDetailView,
    MethodicalManualDocumentListCreateView,
    MethodicalManualSubjectDetailView,
    MethodicalManualSubjectListCreateView,
)

urlpatterns = [
    path(
        "methodical-subjects/",
        MethodicalManualSubjectListCreateView.as_view(),
        name="methodical-subject-list",
    ),
    path(
        "methodical-subjects/<int:pk>/",
        MethodicalManualSubjectDetailView.as_view(),
        name="methodical-subject-detail",
    ),
    path(
        "methodical-subjects/<int:subject_pk>/documents/",
        MethodicalManualDocumentListCreateView.as_view(),
        name="methodical-document-list",
    ),
    path(
        "methodical-subjects/<int:subject_pk>/documents/<int:pk>/",
        MethodicalManualDocumentDetailView.as_view(),
        name="methodical-document-detail",
    ),
]
