import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Sidebar from "../components/dashboard/Sidebar.jsx";
import DashboardModuleView from "../components/dashboard/modules/DashboardModuleView.jsx";
import CombatTrainingPlan from "../components/dashboard/modules/CombatTrainingPlan.jsx";
import AdminRequestsPage from "../features/admin/AdminRequestsPage.jsx";
import AdminUsersPage from "../features/admin/AdminUsersPage.jsx";
import SubmissionEditRequestsPage from "../features/admin/SubmissionEditRequestsPage.jsx";
import { fetchDashboard } from "../features/dashboard/dashboardSlice.js";

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { data, loading, error, role } = useSelector((state) => state.dashboard);
  const [activeView, setActiveView] = useState("requests");

  useEffect(() => {
    if (user?.role === "admin" && role !== "admin") {
      dispatch(fetchDashboard("admin"));
    }
  }, [dispatch, role, user?.role]);

  if (user?.role !== "admin") {
    return <section className="dashboard-state error">Нет доступа к dashboard администратора.</section>;
  }

  if (loading && !data) {
    return <section className="dashboard-state">Загрузка dashboard...</section>;
  }

  if (error && !data) {
    return <section className="dashboard-state error">{error}</section>;
  }

  if (!data) {
    return null;
  }

  const refreshDashboard = () => dispatch(fetchDashboard("admin"));
  const pendingCount = data.stats.find((item) => item.id === "pending")?.value || 0;

  return (
    <div className="dashboard-layout">
      <Sidebar
        activeItem={activeView}
        modules={data.modules}
        pendingCount={pendingCount}
        role="admin"
        user={user}
        onNavigate={setActiveView}
        onOpenRequests={() => setActiveView("requests")}
      />

      <section className="dashboard-content">
        {activeView === "requests" ? (
          <AdminRequestsPage />
        ) : activeView === "submissionEditRequests" ? (
          <SubmissionEditRequestsPage />
        ) : activeView === "users" ? (
          <AdminUsersPage />
        ) : activeView === "drafts" ? (
          <CombatTrainingPlan layout="draft" title="Черновик" user={user} />
        ) : (
          <DashboardModuleView
            activeModule={activeView}
            modules={data.modules}
            user={user}
            onRefresh={refreshDashboard}
          />
        )}
      </section>
    </div>
  );
}
