import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Sidebar from "../components/dashboard/Sidebar.jsx";
import DashboardModuleView from "../components/dashboard/modules/DashboardModuleView.jsx";
import { fetchDashboard } from "../features/dashboard/dashboardSlice.js";

export default function RegionalDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { data, loading, error, role } = useSelector((state) => state.dashboard);
  const [activeView, setActiveView] = useState("library");

  useEffect(() => {
    if (user?.role === "regional" && (!data || role !== "regional")) {
      dispatch(fetchDashboard("regional"));
    }
  }, [data, dispatch, role, user?.role]);

  if (user?.role !== "regional") {
    return <section className="dashboard-state error">Нет доступа к панели областного управления.</section>;
  }

  if (loading && !data) {
    return <section className="dashboard-state">Загрузка данных...</section>;
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
        {error && <p className="dashboard-error">{error}</p>}
        <DashboardModuleView
          activeModule={activeView}
          modules={data.modules}
          user={user}
          onRefresh={refreshDashboard}
        />
      </section>
    </div>
  );
}
