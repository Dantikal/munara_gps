from django.urls import path

from submissions.views import (
    CombatTrainingJournalRevisionDetailView,
    SubmissionEditRequestCreateView,
    SubmissionEditRequestDecisionView,
    SubmissionEditRequestListView,
    ThematicAccountSubmissionDetailView,
    ThematicAccountSubmissionForwardView,
    ThematicAccountSubmissionHideView,
    ThematicAccountSubmissionListCreateView,
)

urlpatterns = [
    path(
        "thematic-account-submissions/",
        ThematicAccountSubmissionListCreateView.as_view(),
        name="thematic-account-submission-list",
    ),
    path(
        "thematic-account-submissions/<int:pk>/",
        ThematicAccountSubmissionDetailView.as_view(),
        name="thematic-account-submission-detail",
    ),
    path(
        "combat-training-journal-revisions/<int:pk>/",
        CombatTrainingJournalRevisionDetailView.as_view(),
        name="combat-training-journal-revision-detail",
    ),
    path(
        "thematic-account-submissions/<int:pk>/forward/",
        ThematicAccountSubmissionForwardView.as_view(),
        name="thematic-account-submission-forward",
    ),
    path(
        "thematic-account-submissions/<int:pk>/hide/",
        ThematicAccountSubmissionHideView.as_view(),
        name="thematic-account-submission-hide",
    ),
    path("thematic-account-submissions/<int:pk>/edit-request/", SubmissionEditRequestCreateView.as_view(), name="submission-edit-request-create"),
    path("submission-edit-requests/", SubmissionEditRequestListView.as_view(), name="submission-edit-request-list"),
    path("submission-edit-requests/<int:pk>/", SubmissionEditRequestDecisionView.as_view(), name="submission-edit-request-decision"),
]
