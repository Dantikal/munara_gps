import React from "react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import BorderServiceLogo from "./components/BorderServiceLogo.jsx";
import LoginPage from "./features/auth/LoginPage.jsx";
import RegistrationForm from "./components/RegistrationForm.jsx";
import { logout } from "./features/auth/authSlice.js";
import { resetDashboard } from "./features/dashboard/dashboardSlice.js";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import OutpostDashboard from "./pages/OutpostDashboard.jsx";
import RegionalDashboard from "./pages/RegionalDashboard.jsx";

export default function App() {
  const { user } = useSelector((state) => state.auth);
  const [page, setPage] = useState(user ? "dashboard" : "register");
  const dispatch = useDispatch();

  useEffect(() => {
    if (user && (page === "login" || page === "register")) {
      setPage("dashboard");
    }

    if (!user && page === "dashboard") {
      setPage("login");
    }
  }, [page, user]);

  const signOut = () => {
    dispatch(logout());
    dispatch(resetDashboard());
    setPage("login");
  };

  const renderDashboard = () => {
    if (!user) {
      return <LoginPage onLoggedIn={() => setPage("dashboard")} />;
    }

    if (user.role === "admin") {
      return <AdminDashboard />;
    }

    if (user.role === "regional") {
      return <RegionalDashboard />;
    }

    if (user.role === "outpost") {
      return <OutpostDashboard />;
    }

    return <section className="panel">Для вашей роли dashboard не настроен.</section>;
  };

  const renderAuthPage = () => (
    <section className="auth-screen">
      <div className={`auth-card auth-card--${page}`}>
        <header className="auth-brand">
          <BorderServiceLogo large />
          <h1>КУТ БИЛИМ</h1>
          <p>Күжүрмөн даярдоо санарип платформасы</p>
        </header>
        <nav className="auth-tabs">
          <button
            className={page === "login" ? "is-active" : ""}
            onClick={() => setPage("login")}
          >
            Вход
          </button>
          <button
            className={page === "register" ? "is-active" : ""}
            onClick={() => setPage("register")}
          >
            Регистрация
          </button>
        </nav>
        {page === "login" && <LoginPage onLoggedIn={() => setPage("dashboard")} />}
        {page === "register" && <RegistrationForm />}
      </div>
    </section>
  );

  if (!user && (page === "register" || page === "login")) {
    return <main className="app-shell auth-shell">{renderAuthPage()}</main>;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div>
            <strong>КУТ БИЛИМ</strong>
            <span>Күжүрмөн даярдоо санарип платформасы</span>
          </div>
        </div>
        <div className="topbar-seal">
          <BorderServiceLogo large />
        </div>
        <nav>
          {!user && <button onClick={() => setPage("register")}>Регистрация</button>}
          {!user && <button onClick={() => setPage("login")}>Вход</button>}
          {user && <button onClick={signOut}>Выйти</button>}
        </nav>
      </header>

      {page === "register" && <RegistrationForm />}
      {page === "login" && <LoginPage onLoggedIn={() => setPage("dashboard")} />}
      {page === "dashboard" && renderDashboard()}
    </main>
  );
}
