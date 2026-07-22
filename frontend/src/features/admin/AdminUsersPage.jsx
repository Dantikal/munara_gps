import React, { useEffect, useState } from "react";

import { api } from "../../api/client.js";
import { getApiErrorMessage } from "../../api/errors.js";
import {
  MILITARY_UNIT_OPTIONS,
  OUTPOST_MILITARY_UNIT_OPTIONS,
  OUTPOSTS_BY_MILITARY_UNIT,
  formatOutpostName,
} from "../../data/militaryUnits.js";

const roleLabels = {
  regional: "Аскер бөлүгү",
  outpost: "Застава",
};

const statusLabels = {
  active: "Активен",
  pending: "Ожидает",
  rejected: "Отклонен",
};

const createEmptyForm = (role = "outpost") => ({
  id: null,
  email: "",
  password: "",
  full_name: "",
  military_rank: "",
  position: "",
  unit_type: role === "regional" ? "regional_department" : "outpost",
  phone: "",
  region: "",
  outpost_name: "",
  role,
  status: "active",
  photo_face: null,
  photo_military_id: null,
});

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ru-RU");
};

const getInitials = (user) =>
  String(user?.full_name || user?.email || "П")
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const getUnitName = (user) => {
  if (user?.role === "outpost") return user.outpost_name || "Застава не указана";
  if (!user?.region) return "Номер части не указан";
  return /^[0-9]+$/.test(user.region) ? `${user.region} аскер бөлүгү` : user.region;
};

const toForm = (user) => ({
  id: user.id,
  email: user.email || "",
  password: "",
  full_name: user.full_name || "",
  military_rank: user.military_rank || "",
  position: user.position || "",
  unit_type: user.unit_type || (user.role === "regional" ? "regional_department" : "outpost"),
  phone: user.phone || "",
  region: user.region || "",
  outpost_name: user.role === "outpost" ? formatOutpostName(user.outpost_name) : "",
  role: user.role,
  status: user.status || "active",
  photo_face: null,
  photo_military_id: null,
});

const buildPayload = (form, editing) => {
  const payload = new FormData();
  const role = form.unit_type === "regional_department" ? "regional" : "outpost";
  const values = {
    email: form.email.trim(),
    full_name: form.full_name.trim(),
    military_rank: form.military_rank.trim(),
    position: form.position.trim(),
    unit_type: form.unit_type,
    phone: form.phone.trim(),
    region: form.region.trim(),
    outpost_name: role === "outpost" ? form.outpost_name.trim() : "",
    role,
    status: form.status,
  };

  Object.entries(values).forEach(([key, value]) => payload.append(key, value));
  if (!editing || form.password.trim()) payload.append("password", form.password);
  if (form.photo_face) payload.append("photo_face", form.photo_face);
  if (form.photo_military_id) payload.append("photo_military_id", form.photo_military_id);
  return { payload, role };
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [activeGroup, setActiveGroup] = useState("outpost");
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(() => createEmptyForm("outpost"));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const editing = Boolean(form.id);
  const groupUsers = users.filter((user) => user.role === activeGroup);
  const availableUnitNumbers = Array.from(new Set([
    ...MILITARY_UNIT_OPTIONS,
    ...groupUsers.map((user) => String(user.region || "").trim()).filter(Boolean),
  ]));
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase("ru");
  const filteredUsers = groupUsers.filter((user) => {
    if (statusFilter && user.status !== statusFilter) return false;
    if (unitFilter && String(user.region || "") !== unitFilter) return false;
    if (!normalizedSearch) return true;
    return [
      user.full_name,
      user.email,
      user.phone,
      user.military_rank,
      user.position,
      user.region,
      user.outpost_name,
    ].some((value) => String(value || "").toLocaleLowerCase("ru").includes(normalizedSearch));
  });

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/auth/admin/users/");
      setUsers(data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось загрузить пользователей."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateField = (event) => {
    const { name, value, files } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: files ? files[0] || null : value };
      if (name === "unit_type") {
        next.role = value === "regional_department" ? "regional" : "outpost";
        next.region = "";
        next.outpost_name = "";
      }
      if (name === "region" && current.unit_type === "outpost") {
        next.outpost_name = "";
      }
      return next;
    });
  };

  const closeForm = () => {
    setForm(createEmptyForm(activeGroup));
    setIsFormOpen(false);
    setError("");
  };

  const openCreateForm = () => {
    setSelectedUser(null);
    setForm(createEmptyForm(activeGroup));
    setMessage("");
    setError("");
    setIsFormOpen(true);
  };

  const editUser = (user) => {
    setSelectedUser(null);
    setActiveGroup(user.role);
    setForm(toForm(user));
    setMessage("");
    setError("");
    setIsFormOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const { payload, role } = buildPayload(form, editing);
      if (editing) {
        await api.patch(`/auth/admin/users/${form.id}/`, payload);
        setMessage("Пользователь обновлён.");
      } else {
        await api.post("/auth/admin/users/", payload);
        setMessage("Пользователь добавлен.");
      }
      setActiveGroup(role);
      setForm(createEmptyForm(role));
      setIsFormOpen(false);
      await loadUsers();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось сохранить пользователя."));
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Удалить пользователя ${user.full_name || user.email}?`)) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await api.delete(`/auth/admin/users/${user.id}/`);
      setSelectedUser(null);
      setMessage("Пользователь удалён.");
      await loadUsers();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось удалить пользователя."));
    } finally {
      setSaving(false);
    }
  };

  const selectGroup = (role) => {
    setActiveGroup(role);
    setSelectedUser(null);
    setForm(createEmptyForm(role));
    setIsFormOpen(false);
    setMessage("");
    setError("");
    setSearchQuery("");
    setStatusFilter("");
    setUnitFilter("");
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setUnitFilter("");
  };

  if (selectedUser) {
    const details = [
      ["ФИО", selectedUser.full_name],
      ["Воинское звание", selectedUser.military_rank],
      ["Должность", selectedUser.position],
      ["Подразделение", roleLabels[selectedUser.role]],
      ["Аскер бөлүгүнүн номери", selectedUser.region],
      ["Заставанын аталышы", selectedUser.outpost_name],
      ["Телефон", selectedUser.phone],
      ["Email", selectedUser.email],
      ["Статус", statusLabels[selectedUser.status] || selectedUser.status],
      ["Дата регистрации", formatDate(selectedUser.date_joined)],
    ].filter(([, value]) => value);
    const avatar = selectedUser.avatar || selectedUser.photo_face;

    return (
      <section className="module-panel admin-user-detail">
        <button className="module-back-button" onClick={() => setSelectedUser(null)} type="button">
          Артка
        </button>
        <div className="admin-user-detail__top">
          <div className="admin-user-avatar admin-user-avatar--large">
            {avatar ? <img alt={selectedUser.full_name} src={avatar} /> : <span>{getInitials(selectedUser)}</span>}
          </div>
          <div>
            <h1>{selectedUser.full_name || selectedUser.email}</h1>
            <p>{getUnitName(selectedUser)}</p>
            <div className="table-actions">
              <button onClick={() => editUser(selectedUser)} type="button">Изменить</button>
              <button className="danger" disabled={saving} onClick={() => deleteUser(selectedUser)} type="button">
                Удалить
              </button>
            </div>
          </div>
        </div>
        <dl className="profile-details admin-user-detail__fields">
          {details.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <section className="profile-documents">
          <h2>Файлы регистрации</h2>
          <div className="profile-documents__grid">
            <figure>
              {selectedUser.photo_military_id ? (
                <img alt="Фото военного билета" src={selectedUser.photo_military_id} />
              ) : <div className="profile-document-placeholder">Файл не загружен</div>}
              <figcaption>Фото военного билета</figcaption>
            </figure>
            <figure>
              {selectedUser.photo_face ? (
                <img alt="Фото лица" src={selectedUser.photo_face} />
              ) : <div className="profile-document-placeholder">Файл не загружен</div>}
              <figcaption>Фото лица</figcaption>
            </figure>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="module-panel admin-users-page">
      <header className="admin-users-page__header">
        <div><h1>Пользователи</h1><p>Заставы и аскер бөлүктөрү.</p></div>
        <button onClick={openCreateForm} type="button">Добавить</button>
      </header>

      <div className="admin-users-page__tabs" role="tablist" aria-label="Тип пользователя">
        <button aria-selected={activeGroup === "outpost"} className={activeGroup === "outpost" ? "active" : ""} onClick={() => selectGroup("outpost")} role="tab" type="button">Застава</button>
        <button aria-selected={activeGroup === "regional"} className={activeGroup === "regional" ? "active" : ""} onClick={() => selectGroup("regional")} role="tab" type="button">Аскер бөлүгү</button>
      </div>

      {isFormOpen && (
        <form className="admin-user-form admin-user-registration-form" encType="multipart/form-data" onSubmit={submit}>
          <h2>{editing ? "Изменить пользователя" : "Добавить пользователя"}</h2>
          <label>ФИО<input name="full_name" required value={form.full_name} onChange={updateField} /></label>
          <label>Воинское звание<input name="military_rank" required value={form.military_rank} onChange={updateField} /></label>
          <label>Должность<input name="position" required value={form.position} onChange={updateField} /></label>
          <label>
            Подразделение
            <select name="unit_type" required value={form.unit_type} onChange={updateField}>
              <option value="outpost">Застава</option>
              <option value="regional_department">Аскер бөлүгү</option>
            </select>
          </label>
          <label>
            Аскер бөлүгүнүн номери
            <select className={!form.region ? "form-select-placeholder" : undefined} name="region" required value={form.region} onChange={updateField}>
              <option disabled value="">Аскер бөлүгүнүн номерин тандаңыз</option>
              {(form.unit_type === "outpost" ? OUTPOST_MILITARY_UNIT_OPTIONS : MILITARY_UNIT_OPTIONS).map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </label>
          {form.unit_type === "outpost" && (
            <label>
              Заставанын аталышы
              <select
                className={!form.outpost_name ? "form-select-placeholder" : undefined}
                disabled={!form.region}
                name="outpost_name"
                required
                value={form.outpost_name}
                onChange={updateField}
              >
                <option disabled value="">
                  {form.region ? "Заставанын аталышын тандаңыз" : "Алгач аскер бөлүгүнүн номерин тандаңыз"}
                </option>
                {(OUTPOSTS_BY_MILITARY_UNIT[form.region] || []).map(([number, name]) => (
                  <option key={`${number}-${name}`} value={formatOutpostName(name)}>
                    {number}. {formatOutpostName(name)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>Телефон<input name="phone" pattern="^\+996\d{9}$" placeholder="+996XXXXXXXXX" required value={form.phone} onChange={updateField} /></label>
          <label>Email<input name="email" required type="email" value={form.email} onChange={updateField} /></label>
          <label>
            Пароль
            <input name="password" minLength={8} required={!editing} type="password" value={form.password} onChange={updateField} />
            {editing && <small>Оставьте пустым, чтобы не менять пароль.</small>}
          </label>
          <label>
            Фото военного билета
            <input accept="image/*" name="photo_military_id" required={!editing} type="file" onChange={updateField} />
          </label>
          <label>
            Фото лица
            <input accept="image/*" name="photo_face" required={!editing} type="file" onChange={updateField} />
          </label>
          {editing && (
            <label>Статус<select name="status" value={form.status} onChange={updateField}><option value="active">Активен</option><option value="pending">Ожидает</option><option value="rejected">Отклонен</option></select></label>
          )}
          <div className="admin-user-form__actions">
            <button disabled={saving} type="submit">{saving ? "Сохранение..." : editing ? "Сохранить" : "Добавить"}</button>
            <button disabled={saving} onClick={closeForm} type="button">Отмена</button>
          </div>
        </form>
      )}

      <div className="admin-user-search-filters">
        <label className="admin-user-search-filters__search">
          <span>Поиск</span>
          <input
            aria-label="Поиск пользователей"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="ФИО, email, телефон, звание, застава..."
            type="search"
            value={searchQuery}
          />
        </label>
        <label>
          <span>Статус</span>
          <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="">Все статусы</option>
            <option value="active">Активные</option>
            <option value="pending">Ожидающие</option>
            <option value="rejected">Отклонённые</option>
          </select>
        </label>
        <label>
          <span>Аскер бөлүгүнүн номери</span>
          <select onChange={(event) => setUnitFilter(event.target.value)} value={unitFilter}>
            <option value="">Все части</option>
            {availableUnitNumbers.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </label>
        {(searchQuery || statusFilter || unitFilter) && (
          <button onClick={resetFilters} type="button">Сбросить</button>
        )}
      </div>

      {message && <p className="dashboard-notice">{message}</p>}
      {error && <p className="dashboard-error">{error}</p>}
      {loading && <p className="dashboard-state">Загрузка пользователей...</p>}
      {!loading && !error && filteredUsers.length === 0 && (
        <p className="dashboard-state">
          {groupUsers.length === 0 ? "Пользователей пока нет." : "По заданным условиям пользователи не найдены."}
        </p>
      )}
      {!loading && !error && filteredUsers.length > 0 && (
        <p className="admin-user-search-result">Найдено: {filteredUsers.length}</p>
      )}
      {!loading && filteredUsers.length > 0 && (
        <div className="admin-user-card-list">
          {filteredUsers.map((user) => {
            const avatar = user.avatar || user.photo_face;
            return (
              <button className="admin-user-list-card" key={user.id} onClick={() => setSelectedUser(user)} type="button">
                <span className="admin-user-avatar">
                  {avatar ? <img alt="" src={avatar} /> : <span>{getInitials(user)}</span>}
                </span>
                <span className="admin-user-list-card__text">
                  <strong>{user.full_name || user.email}</strong>
                  <small>{getUnitName(user)}</small>
                </span>
                <span aria-hidden="true" className="admin-user-list-card__arrow">›</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
