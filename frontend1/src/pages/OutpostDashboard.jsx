import { isTrainingUnit, TRAINING_UNIT_MODULES } from "../data/unitTypes.js";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Sidebar from "../components/dashboard/Sidebar.jsx";
import DashboardPrintButton from "../components/dashboard/DashboardPrintButton.jsx";
import DashboardModuleView from "../components/dashboard/modules/DashboardModuleView.jsx";
import { fetchDashboard } from "../features/dashboard/dashboardSlice.js";
import OutpostRatingPage from "../features/regional/OutpostRatingPage.jsx";

export default function OutpostDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { data, loading, error, role } = useSelector((state) => state.dashboard);
  const [activeView, setActiveView] = useState("home");

  useEffect(() => {
    if (user?.role === "outpost" && role !== "outpost") {
      dispatch(fetchDashboard("outpost"));
    }
  }, [dispatch, role, user?.role]);

  if (user?.role !== "outpost") {
    return <section className="dashboard-state error">Заставанын жеке кабинетине кирүүгө уруксат жок.</section>;
  }

  if (loading && !data) {
    return <section className="dashboard-state">Жүктөлүүдө...</section>;
  }

  if (error && !data) {
    return <section className="dashboard-state error">{error}</section>;
  }

  if (!data) {
    return null;
  }

  const visibleView = isTrainingUnit(user?.unit_type) &&
    ![...TRAINING_UNIT_MODULES, "profile"].includes(activeView) ? "home" : activeView;

  const refreshDashboard = () => dispatch(fetchDashboard("outpost"));

  return (
    <div className="dashboard-layout">
      <Sidebar
        activeItem={visibleView}
        modules={data.modules}
        onNavigate={setActiveView}
        role="outpost"
        user={user}
      />

      <section className="dashboard-content">
        <DashboardPrintButton />
        {visibleView === "outpostRating" ? (
          <OutpostRatingPage user={user} />
        ) : (
          <DashboardModuleView
            activeModule={visibleView}
            dashboardData={data}
            modules={data.modules}
            onNavigate={setActiveView}
            onRefresh={refreshDashboard}
            user={user}
          />
        )}
      </section>
    </div>
  );
}
