import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Sidebar from "../components/dashboard/Sidebar.jsx";
import DashboardModuleView from "../components/dashboard/modules/DashboardModuleView.jsx";
import AdminRequestsPage from "../features/admin/AdminRequestsPage.jsx";
import AdminUsersPage from "../features/admin/AdminUsersPage.jsx";
import RegionalUnitRatingPage from "../features/admin/RegionalUnitRatingPage.jsx";
import SubmissionEditRequestsPage from "../features/admin/SubmissionEditRequestsPage.jsx";
import { fetchDashboard } from "../features/dashboard/dashboardSlice.js";

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { data, loading, error, role } = useSelector((state) => state.dashboard);
  const [activeView, setActiveView] = useState("home");
  const [chatPartnerId, setChatPartnerId] = useState(null);

  useEffect(() => {
    if (user?.role === "admin" && role !== "admin") {
      dispatch(fetchDashboard("admin"));
    }
  }, [dispatch, role, user?.role]);

  if (user?.role !== "admin") {
    return <section className="dashboard-state error">Администратордун башкаруу панелине кирүүгө уруксат жок.</section>;
  }

  if (loading && !data) {
    return <section className="dashboard-state">Башкаруу панели жүктөлүүдө...</section>;
  }

  if (error && !data) {
    return <section className="dashboard-state error">{error}</section>;
  }

  if (!data) {
    return null;
  }

  const refreshDashboard = () => dispatch(fetchDashboard("admin"));
  const pendingCount = data.stats.find((item) => item.id === "pending")?.value || 0;
  const navigate = (view) => {
    setChatPartnerId(null);
    setActiveView(view);
  };
  const openUserChat = (selectedUser) => {
    setChatPartnerId(selectedUser.id);
    setActiveView("contactAdmin");
  };

  return (
    <div className="dashboard-layout">
      <Sidebar
        activeItem={activeView}
        modules={data.modules}
        pendingCount={pendingCount}
        role="admin"
        user={user}
        onNavigate={navigate}
        onOpenRequests={() => setActiveView("requests")}
      />

      <section className="dashboard-content">
        {activeView === "requests" ? (
          <AdminRequestsPage user={user} />
        ) : activeView === "submissionEditRequests" ? (
          <SubmissionEditRequestsPage user={user} />
        ) : activeView === "users" ? (
          <AdminUsersPage onMessageUser={openUserChat} user={user} />
        ) : activeView === "regionalUnitRating" ? (
          <RegionalUnitRatingPage />
        ) : (
          <DashboardModuleView
            activeModule={activeView}
            dashboardData={data}
            initialChatPartnerId={chatPartnerId}
            modules={data.modules}
            onNavigate={navigate}
            user={user}
            onRefresh={refreshDashboard}
          />
        )}
      </section>
    </div>
  );
}
