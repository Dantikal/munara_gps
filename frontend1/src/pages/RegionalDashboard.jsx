import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Sidebar from "../components/dashboard/Sidebar.jsx";
import DashboardPrintButton from "../components/dashboard/DashboardPrintButton.jsx";
import DashboardModuleView from "../components/dashboard/modules/DashboardModuleView.jsx";
import { fetchDashboard } from "../features/dashboard/dashboardSlice.js";
import RegionalUsersPage from "../features/regional/RegionalUsersPage.jsx";
import OutpostRatingPage from "../features/regional/OutpostRatingPage.jsx";

export default function RegionalDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { data, loading, error, role } = useSelector((state) => state.dashboard);
  const [activeView, setActiveView] = useState("home");

  useEffect(() => {
    if (user?.role === "regional" && (!data || role !== "regional")) {
      dispatch(fetchDashboard("regional"));
    }
  }, [data, dispatch, role, user?.role]);

  if (user?.role !== "regional") {
    return <section className="dashboard-state error">Облустук башкаруу панелине кирүүгө уруксат жок.</section>;
  }

  if (loading && !data) {
    return <section className="dashboard-state">Маалымат жүктөлүүдө...</section>;
  }

  if (error && !data) {
    return <section className="dashboard-state error">{error}</section>;
  }

  if (!data) {
    return null;
  }

  const refreshDashboard = () => dispatch(fetchDashboard("regional"));

  return (
    <div className="dashboard-layout">
      <Sidebar
        activeItem={activeView}
        modules={data.modules}
        role="regional"
        user={user}
        onNavigate={setActiveView}
      />

      <section className="dashboard-content">
        <DashboardPrintButton />
        {error && <p className="dashboard-error">{error}</p>}
        {activeView === "regionalUsers" ? (
          <RegionalUsersPage user={user} />
        ) : activeView === "outpostRating" ? (
          <OutpostRatingPage user={user} />
        ) : (
          <DashboardModuleView
            activeModule={activeView}
            dashboardData={data}
            modules={data.modules}
            onNavigate={setActiveView}
            user={user}
            onRefresh={refreshDashboard}
          />
        )}
      </section>
    </div>
  );
}
