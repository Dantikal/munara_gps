from django.urls import path

from dashboard.ratings import OutpostRatingView, RegionalUnitRatingView
from dashboard.views import AdminDashboardView, OutpostDashboardView, RegionalDashboardView

urlpatterns = [
    path("admin/", AdminDashboardView.as_view(), name="dashboard-admin"),
    path("admin/regional-unit-ratings/", RegionalUnitRatingView.as_view(), name="regional-unit-ratings"),
    path("regional/", RegionalDashboardView.as_view(), name="dashboard-regional"),
    path("regional/outpost-ratings/", OutpostRatingView.as_view(), name="outpost-ratings"),
    path("outpost/", OutpostDashboardView.as_view(), name="dashboard-outpost"),
]
