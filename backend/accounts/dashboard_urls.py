from django.urls import path

from .dashboard_views import (
    AdminDashboardView,
    CombatTrainingJournalDetailView,
    CombatTrainingJournalListCreateView,
    LessonSchedulePeriodListCreateView,
    MethodicalManualSubjectDetailView,
    MethodicalManualSubjectListCreateView,
    OutpostDashboardView,
    RegionalDashboardView,
)

urlpatterns = [
    path("admin/", AdminDashboardView.as_view(), name="dashboard-admin"),
    path("regional/", RegionalDashboardView.as_view(), name="dashboard-regional"),
    path("outpost/", OutpostDashboardView.as_view(), name="dashboard-outpost"),
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
        "combat-training-journals/",
        CombatTrainingJournalListCreateView.as_view(),
        name="combat-training-journal-list",
    ),
    path(
        "combat-training-journals/<int:pk>/",
        CombatTrainingJournalDetailView.as_view(),
        name="combat-training-journal-detail",
    ),
    path(
        "lesson-schedule-periods/",
        LessonSchedulePeriodListCreateView.as_view(),
        name="lesson-schedule-period-list",
    ),
]
