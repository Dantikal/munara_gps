import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Sidebar from "../components/dashboard/Sidebar.jsx";
import DashboardModuleView from "../components/dashboard/modules/DashboardModuleView.jsx";
import { fetchDashboard } from "../features/dashboard/dashboardSlice.js";

export default function OutpostDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { data, loading, error, role } = useSelector((state) => state.dashboard);
  const [activeView, setActiveView] = useState("library");

  useEffect(() => {
    if (user?.role === "outpost" && role !== "outpost") {
      dispatch(fetchDashboard("outpost"));
    }
  }, [dispatch, role, user?.role]);

  if (user?.role !== "outpost") {
    return <section className="dashboard-state error">Нет доступа к личному кабинету заставы.</section>;
  }

  if (loading && !data) {
    return <section className="dashboard-state">Загрузка...</section>;
  }

  if (error && !data) {
    return <section className="dashboard-state error">{error}</section>;
  }

  if (!data) {
    return null;
  }

  const refreshDashboard = () => dispatch(fetchDashboard("outpost"));

  return (
    <div className="dashboard-layout">
      <Sidebar
        activeItem={activeView}
        modules={data.modules}
        onNavigate={setActiveView}
        role="outpost"
        user={user}
      />

      <section className="dashboard-content">
        <DashboardModuleView
          activeModule={activeView}
          modules={data.modules}
          onRefresh={refreshDashboard}
          user={user}
        />
      </section>
    </div>
  );
}
