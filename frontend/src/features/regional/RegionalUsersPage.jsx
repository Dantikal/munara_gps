import React, { useEffect, useMemo, useState } from "react";

import { getScopedUsers } from "../../api/dashboard.js";
import { getApiErrorMessage } from "../../api/errors.js";

const formatPresence = (user) => {
  if (user?.isOnline) return "Онлайн";
  if (!user?.lastSeen) return "Азырынча кире элек";
  const date = new Date(user.lastSeen);
  if (Number.isNaN(date.getTime())) return "Оффлайн";
  return `Был(а) в ${date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const getInitials = (user) =>
  String(user?.full_name || user?.email || "К")
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const getUserType = (user) => (
  user.role === "outpost" ? "Застава" : "Аскер бөлүгү"
);

export default function RegionalUsersPage({ user: currentUser }) {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const items = await getScopedUsers();
      setUsers((Array.isArray(items) ? items : []).filter(
        (item) =>
          String(item.id) !== String(currentUser?.id) &&
          String(item.region || "") === String(currentUser?.region || "")
      ));
      setError("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Колдонуучуларды жүктөө мүмкүн болгон жок."));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    const intervalId = window.setInterval(() => loadUsers(true), 30000);
    const refreshOnFocus = () => loadUsers(true);
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [currentUser?.id, currentUser?.region]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru");
    if (!normalizedQuery) return users;
    return users.filter((item) => [
      item.full_name,
      item.email,
      item.phone,
      item.outpost_name,
      item.military_rank,
      item.position,
    ].some((value) => String(value || "").toLocaleLowerCase("ru").includes(normalizedQuery)));
  }, [query, users]);

  return (
    <section className="module-panel admin-users-page">
      <header className="admin-users-page__header">
        <div>
          <h1>Колдонуучулар</h1>
          <p>Аскер бөлүгү {currentUser?.region || "—"} · Колдонуучулар: {users.length}</p>
        </div>
      </header>

      <div className="admin-user-search-filters regional-users-page__search">
        <label className="admin-user-search-filters__search">
          <span>Издөө</span>
          <input
            aria-label="Колдонуучуларды издөө"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Аты-жөнү, застава, email..."
            type="search"
            value={query}
          />
        </label>
      </div>

      {error ? <p className="dashboard-error">{error}</p> : null}
      {loading ? <p className="dashboard-state">Колдонуучулар жүктөлүүдө...</p> : null}
      {!loading && !error && filteredUsers.length === 0 ? (
        <p className="dashboard-state">Колдонуучулар табылган жок.</p>
      ) : null}
      {!loading && filteredUsers.length > 0 ? (
        <div className="admin-user-card-list">
          {filteredUsers.map((item) => {
            const avatar = item.photo_face || item.avatar;
            return (
              <article className="admin-user-list-card" key={item.id}>
                <span className="admin-user-avatar">
                  {avatar ? <img alt="" src={avatar} /> : <span>{getInitials(item)}</span>}
                </span>
                <span className="admin-user-list-card__text">
                  <strong>{item.full_name || item.email}</strong>
                  <small>{getUserType(item)} · {item.outpost_name || item.region}</small>
                  <small>{item.email}</small>
                  <small className={item.isOnline ? "user-presence is-online" : "user-presence"}>
                    {formatPresence(item)}
                  </small>
                </span>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
