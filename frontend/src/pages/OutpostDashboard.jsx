import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  BarMetricChart,
  PieMetricChart,
} from "../components/dashboard/Charts.jsx";
import ChartCard from "../components/dashboard/ChartCard.jsx";
import Sidebar from "../components/dashboard/Sidebar.jsx";
import StatCard from "../components/dashboard/StatCard.jsx";
import DashboardModuleView from "../components/dashboard/modules/DashboardModuleView.jsx";
import { fetchDashboard } from "../features/dashboard/dashboardSlice.js";

export default function OutpostDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { data, loading, error, role } = useSelector((state) => state.dashboard);
  const [activeView, setActiveView] = useState("overview");
  const [actionMode, setActionMode] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (user?.role === "outpost" && role !== "outpost") {
      dispatch(fetchDashboard("outpost"));
    }
  }, [dispatch, role, user?.role]);

  if (user?.role !== "outpost") {
    return <section className="dashboard-state error">Нет доступа к dashboard заставы.</section>;
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

  const handleQuickAction = (actionId) => {
    setNotice("");

    if (actionId === "library") {
      setActiveView("library");
      return;
    }

    setActionMode(actionId);
  };
  const refreshDashboard = () => dispatch(fetchDashboard("outpost"));

  return (
    <div className="dashboard-layout">
      <Sidebar
        activeItem={activeView}
        modules={data.modules}
        role="outpost"
        user={user}
        onNavigate={setActiveView}
      />

      <section className="dashboard-content">
        {activeView !== "overview" ? (
          <DashboardModuleView
            activeModule={activeView}
            modules={data.modules}
            user={user}
            onRefresh={refreshDashboard}
          />
        ) : (
          <>
            <header className="dashboard-header">
              <div>
                <p>Dashboard заставы</p>
                <h1>Застава "{data.outpost}"</h1>
              </div>
              <div className="quick-actions">
                {data.quickActions.map((action) => (
                  <button key={action.id} onClick={() => handleQuickAction(action.id)}>
                    {action.label}
                  </button>
                ))}
              </div>
            </header>

            {actionMode && (
              <form
                className="action-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setNotice(
                    actionMode === "report"
                      ? "Отчет подготовлен к отправке в управление."
                      : "Запись добавлена в журнал как черновик."
                  );
                  setActionMode(null);
                }}
              >
                <label>
                  Заголовок
                  <input required />
                </label>
                <label>
                  Описание
                  <textarea required />
                </label>
                <button type="submit">
                  {actionMode === "report" ? "Создать отчет" : "Добавить запись"}
                </button>
              </form>
            )}

            {notice && <p className="dashboard-notice">{notice}</p>}
            {error && <p className="dashboard-error">{error}</p>}

            <div className="stat-grid">
              {data.stats.map((stat) => (
                <StatCard key={stat.id} label={stat.label} tone={stat.tone} value={stat.value} />
              ))}
            </div>

            <div className="widget-grid">
              <article className="dashboard-widget">
                <h2>{data.widgets.todayDuty.title}</h2>
                <strong>{data.widgets.todayDuty.person}</strong>
                <span>{data.widgets.todayDuty.time}</span>
                <span>{data.widgets.todayDuty.shift}</span>
              </article>
              <article className="dashboard-widget">
                <h2>Ближайшие задачи</h2>
                <ul>
                  {data.widgets.tasks.map((task) => (
                    <li key={task}>{task}</li>
                  ))}
                </ul>
              </article>
              <article className="dashboard-widget">
                <h2>Непрочитанные приказы</h2>
                <ul>
                  {data.widgets.orders.map((order) => (
                    <li key={order.title}>
                      <strong>{order.title}</strong>
                      <span>{order.from}</span>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="dashboard-widget">
                <h2>Уюштуруу</h2>
                <ul>
                  {data.widgets.incidents.map((entry) => (
                    <li key={`${entry.date}-${entry.event}`}>
                      <strong>{entry.date}</strong>
                      <span>{entry.event}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>

            <div className="chart-grid">
              <ChartCard title="Личный состав по званиям">
                <PieMetricChart data={data.charts.rankDistribution} />
              </ChartCard>
              <ChartCard title="Активность по дням недели">
                <BarMetricChart
                  barKey="events"
                  barName="События"
                  data={data.charts.weeklyActivity}
                  xKey="day"
                />
              </ChartCard>
              <article className="data-card">
                <header>
                  <h2>Пландоо</h2>
                </header>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>День</th>
                        <th>Время</th>
                        <th>ФИО</th>
                        <th>Должность</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.duties.map((item) => (
                        <tr key={`${item.day}-${item.name}`}>
                          <td>{item.day}</td>
                          <td>{item.time}</td>
                          <td>{item.name}</td>
                          <td>{item.position}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
              <article className="data-card">
                <header>
                  <h2>Последние 5 записей в журнале</h2>
                </header>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Дата</th>
                        <th>Событие</th>
                        <th>Ответственный</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.journal.map((item) => (
                        <tr key={`${item.date}-${item.event}`}>
                          <td>{item.date}</td>
                          <td>{item.event}</td>
                          <td>{item.owner}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
