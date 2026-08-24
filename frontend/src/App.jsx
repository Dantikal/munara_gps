import React from "react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import BorderServiceLogo from "./components/BorderServiceLogo.jsx";
import LoginPage from "./features/auth/LoginPage.jsx";
import RegistrationForm from "./components/RegistrationForm.jsx";
import ProfileEditForm from "./components/dashboard/modules/ProfileEditForm.jsx";
import { logout } from "./features/auth/authSlice.js";
import { resetDashboard } from "./features/dashboard/dashboardSlice.js";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import OutpostDashboard from "./pages/OutpostDashboard.jsx";
import RegionalDashboard from "./pages/RegionalDashboard.jsx";
import sideEagleUrl from "./assets/Gemini_Generated_Image_uce9y0uce9y0uce9-removebg-preview (1) (1).png";

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

    return <section className="panel">Сиздин ролуңуз үчүн башкаруу панели жөндөлгөн эмес.</section>;
  };

  const renderAuthPage = () => (
    <section className="auth-screen">
      <div aria-hidden="true" className="auth-gold-particles">
        {Array.from({ length: 42 }, (_, index) => (
          <span
            key={index}
            style={{
              "--particle-delay": `${-(index * 1.37) % 13}s`,
              "--particle-duration": `${6 + (index % 6) * 0.9}s`,
              "--particle-left": `${4 + ((index * 17) % 93)}%`,
              "--particle-size": `${5 + (index % 4)}px`,
            }}
          />
        ))}
      </div>
      <img alt="" aria-hidden="true" className="auth-side-eagle auth-side-eagle--left" src={sideEagleUrl} />
      <img alt="" aria-hidden="true" className="auth-side-eagle auth-side-eagle--right" src={sideEagleUrl} />
      <div className={`auth-card auth-card--${page}`} key={page}>
        <header className="auth-brand">
          <BorderServiceLogo large />
          <h1>КҮЖҮРМӨН АСКЕР 1.0</h1>
          <p>Күжүрмөн даярдоо санарип платформасы</p>
        </header>
        <nav className="auth-tabs">
          <button
            className={page === "login" ? "is-active" : ""}
            onClick={() => setPage("login")}
          >
            Кирүү
          </button>
          <button
            className={page === "register" ? "is-active" : ""}
            onClick={() => setPage("register")}
          >
            Каттоо
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
            <strong>КҮЖҮРМӨН АСКЕР 1.0</strong>
            <span>Күжүрмөн даярдоо санарип платформасы</span>
          </div>
        </div>
        <div className="topbar-seal">
          <BorderServiceLogo large />
        </div>
        <nav>
          {!user && <button onClick={() => setPage("register")}>Каттоо</button>}
          {!user && <button onClick={() => setPage("login")}>Кирүү</button>}
          {user && <button onClick={signOut}>Чыгуу</button>}
        </nav>
      </header>

      {user && user.profile_completed === false ? (
        <div className="profile-completion-modal" role="dialog" aria-modal="true" aria-labelledby="profile-completion-title">
          <section className="profile-completion-modal__panel">
            <header>
              <h1 id="profile-completion-title">Каттоо маалыматын толтуруңуз</h1>
              <p>Системада иштөөнү улантуу үчүн калган талааларды толтуруп, сактаңыз.</p>
            </header>
            <ProfileEditForm requiredCompletion user={user} />
          </section>
        </div>
      ) : null}

      {page === "register" && <RegistrationForm />}
      {page === "login" && <LoginPage onLoggedIn={() => setPage("dashboard")} />}
      {page === "dashboard" && renderDashboard()}
    </main>
  );
}
