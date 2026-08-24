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
  admin: "Администратор",
  regional: "Аскер бөлүгү",
  outpost: "Застава",
};

const unitLabels = {
  regional_department: "Аскер бөлүгү",
  outpost: "Застава",
  detachment: "Отряд",
  group: "Топ",
  company: "Рота",
  platoon: "Взвод",
  institution: "Мекеме",
};

const namedSubunitLabels = {
  detachment: "Отрядтын аталышы",
  group: "Топтун аталышы",
  company: "Ротанын аталышы",
  platoon: "Взводдун аталышы",
};

const statusLabels = {
  active: "Активдүү",
  pending: "Күтүүдө",
  rejected: "Четке кагылган",
};

const createEmptyForm = (role = "outpost") => ({
  id: null,
  email: "",
  password: "",
  full_name: "",
  military_rank: "",
  position: "",
  unit_type: role === "admin" ? "" : role === "regional" ? "regional_department" : "outpost",
  phone: "",
  region: "",
  outpost_name: "",
  role,
  status: "active",
  photo_face: null,
});

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("ky-KG");
};

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
  String(user?.full_name || user?.email || "П")
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const getUnitName = (user) => {
  if (user?.role === "admin") {
    return user.is_superuser ? "Главный администратор" : "Администратор";
  }
  if (user?.role === "outpost") {
    return user.outpost_name || unitLabels[user.unit_type] || "Застава көрсөтүлгөн эмес";
  }
  if (!user?.region) return "Аскер бөлүгүнүн номери көрсөтүлгөн эмес";
  return /^[0-9]+$/.test(user.region) ? `${user.region} аскер бөлүгү` : user.region;
};

const toForm = (user) => ({
  id: user.id,
  email: user.email || "",
  password: "",
  full_name: user.full_name || "",
  military_rank: user.military_rank || "",
  position: user.position || "",
  unit_type: user.role === "admin"
    ? ""
    : user.unit_type || (user.role === "regional" ? "regional_department" : "outpost"),
  phone: user.phone || "",
  region: user.region || "",
  outpost_name:
    user.unit_type === "outpost"
      ? formatOutpostName(user.outpost_name)
      : user.role === "outpost"
        ? user.outpost_name || ""
        : "",
  role: user.role,
  status: user.status || "active",
  photo_face: null,
});

const buildPayload = (form, editing) => {
  const payload = new FormData();
  const role = form.role === "admin"
    ? "admin"
    : ["regional_department", "institution"].includes(form.unit_type)
      ? "regional"
      : "outpost";
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
  return { payload, role };
};

export default function AdminUsersPage({ onMessageUser, user: currentUser }) {
  const [users, setUsers] = useState([]);
  const [activeGroup, setActiveGroup] = useState("outpost");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRegionalUnit, setSelectedRegionalUnit] = useState(null);
  const [form, setForm] = useState(() => createEmptyForm("outpost"));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isQuickFormOpen, setIsQuickFormOpen] = useState(false);
  const [quickForm, setQuickForm] = useState({ region: "", outpost_name: "", email: "", password: "" });
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

  const loadUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/auth/admin/users/");
      setUsers(data);
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
  }, []);

  const updateField = (event) => {
    const { name, value, files } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: files ? files[0] || null : value };
      if (name === "unit_type") {
        next.role = ["regional_department", "institution"].includes(value)
          ? "regional"
          : "outpost";
        next.region = "";
        next.outpost_name = "";
      }
      if (
        name === "region" &&
        ["outpost", ...Object.keys(namedSubunitLabels)].includes(current.unit_type)
      ) {
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
    setIsQuickFormOpen(false);
  };

  const submitQuickUser = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await api.post("/auth/admin/users/quick/", quickForm);
      setQuickForm({ region: "", outpost_name: "", email: "", password: "" });
      setIsQuickFormOpen(false);
      setActiveGroup("outpost");
      setMessage("Колдонуучу тез кошулду. Ал биринчи киргенде калган маалыматтарын толтурат.");
      await loadUsers();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Колдонуучуну тез кошуу мүмкүн болгон жок."));
    } finally {
      setSaving(false);
    }
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
        setMessage("Колдонуучу жаңыртылды.");
      } else {
        await api.post("/auth/admin/users/", payload);
        setMessage("Колдонуучу кошулду.");
      }
      setActiveGroup(role);
      setForm(createEmptyForm(role));
      setIsFormOpen(false);
      await loadUsers();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Колдонуучуну сактоо мүмкүн болгон жок."));
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`${user.full_name || user.email} колдонуучусу өчүрүлсүнбү?`)) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await api.delete(`/auth/admin/users/${user.id}/`);
      setSelectedUser(null);
      setMessage("Колдонуучу өчүрүлдү.");
      await loadUsers();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Колдонуучуну өчүрүү мүмкүн болгон жок."));
    } finally {
      setSaving(false);
    }
  };

  const selectGroup = (role) => {
    setActiveGroup(role);
    setSelectedUser(null);
    setSelectedRegionalUnit(null);
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
      ["Аты-жөнү", selectedUser.full_name],
      ["Аскердик наамы", selectedUser.military_rank],
      ["Кызматы", selectedUser.position],
      ["Бөлүкчө", unitLabels[selectedUser.unit_type] || roleLabels[selectedUser.role]],
      ["Аскер бөлүгүнүн номери", selectedUser.region],
      [
        namedSubunitLabels[selectedUser.unit_type] || "Заставанын аталышы",
        selectedUser.outpost_name,
      ],
      ["Телефон", selectedUser.phone],
      ["Email", selectedUser.email],
      ["Статусу", statusLabels[selectedUser.status] || selectedUser.status],
      ["Активдүүлүгү", formatPresence(selectedUser)],
      ["Каттоо датасы", formatDate(selectedUser.date_joined)],
    ].filter(([, value]) => value);
    const avatar = selectedUser.photo_face || selectedUser.avatar;

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
            {(!selectedUser.is_superuser || currentUser?.is_superuser) && <div className="table-actions">
              {selectedUser.role === "outpost" ? (
                <button onClick={() => onMessageUser?.(selectedUser)} type="button">
                  Написать
                </button>
              ) : null}
              <button onClick={() => editUser(selectedUser)} type="button">Өзгөртүү</button>
              <button className="danger" disabled={saving} onClick={() => deleteUser(selectedUser)} type="button">
                Өчүрүү
              </button>
            </div>}
          </div>
        </div>
        <dl className="profile-details admin-user-detail__fields">
          {details.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <section className="profile-documents">
          <h2>Каттоо файлдары</h2>
          <div className="profile-documents__grid">
            <figure>
              {selectedUser.photo_face ? (
                <img alt="Колдонуучунун сүрөтү" src={selectedUser.photo_face} />
              ) : <div className="profile-document-placeholder">Файл жүктөлгөн жок</div>}
              <figcaption>Колдонуучунун сүрөтү</figcaption>
            </figure>
          </div>
        </section>
      </section>
    );
  }

  if (selectedRegionalUnit) {
    const unitUsers = users
      .filter(
        (user) =>
          ["regional", "outpost"].includes(user.role) &&
          String(user.region || "") === String(selectedRegionalUnit.region)
      )
      .sort((left, right) => {
        if (left.role !== right.role) return left.role === "regional" ? -1 : 1;
        return String(left.outpost_name || left.full_name || left.email).localeCompare(
          String(right.outpost_name || right.full_name || right.email),
          "ru"
        );
      });
    const regionalAccount = unitUsers.find(
      (user) => user.id === selectedRegionalUnit.accountId
    );

    return (
      <section className="module-panel admin-users-page">
        <button
          className="module-back-button"
          onClick={() => setSelectedRegionalUnit(null)}
          type="button"
        >
          Артка
        </button>
        <header className="admin-users-page__header">
          <div>
            <h1>{selectedRegionalUnit.region} аскер бөлүгү</h1>
            <p>
              {regionalAccount?.email || selectedRegionalUnit.email} · Колдонуучулар:{" "}
              {unitUsers.length}
            </p>
          </div>
        </header>
        {message && <p className="dashboard-notice">{message}</p>}
        {error && <p className="dashboard-error">{error}</p>}
        {unitUsers.length > 0 ? (
          <div className="module-period-list">
            {unitUsers.map((unitUser) => {
              const avatar = unitUser.photo_face || unitUser.avatar;
              return (
                <div className="module-period-row" key={unitUser.id}>
                  <button
                    className="admin-user-list-card"
                    onClick={() => setSelectedUser(unitUser)}
                    type="button"
                  >
                    <span className="admin-user-avatar">
                      {avatar ? (
                        <img alt="" src={avatar} />
                      ) : (
                        <span>{getInitials(unitUser)}</span>
                      )}
                    </span>
                    <span className="admin-user-list-card__text">
                      <strong>{unitUser.full_name || unitUser.email}</strong>
                      <small>
                        {roleLabels[unitUser.role]} · {unitUser.email}
                      </small>
                      {unitUser.role === "outpost" ? (
                        <small>{formatOutpostName(unitUser.outpost_name)}</small>
                      ) : null}
                      <small className={unitUser.isOnline ? "user-presence is-online" : "user-presence"}>
                        {formatPresence(unitUser)}
                      </small>
                    </span>
                    <span aria-hidden="true" className="admin-user-list-card__arrow">
                      ›
                    </span>
                  </button>
                  <div className="module-period-actions">
                    <button
                      className="danger"
                      disabled={saving}
                      onClick={() => deleteUser(unitUser)}
                      type="button"
                    >
                      Өчүрүү
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="dashboard-state">
            {selectedRegionalUnit.region} номериндеги колдонуучулар табылган жок.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="module-panel admin-users-page">
      <header className="admin-users-page__header">
        <div><h1>Колдонуучулар</h1><p>Администраторлор, заставалар жана аскер бөлүктөрү.</p></div>
        <div className="admin-users-page__header-actions">
          <button onClick={() => {
            setIsQuickFormOpen((current) => !current);
            setIsFormOpen(false);
            setError("");
          }} type="button">Тез кошуу</button>
          <button onClick={openCreateForm} type="button">Кошуу</button>
        </div>
      </header>

      {isQuickFormOpen && (
        <form className="admin-quick-user-form" onSubmit={submitQuickUser}>
          <h2>Колдонуучуну тез кошуу</h2>
          <label>
            Аскер бөлүгүнүн номери
            <select
              required
              value={quickForm.region}
              onChange={(event) => setQuickForm((current) => ({ ...current, region: event.target.value, outpost_name: "" }))}
            >
              <option disabled value="">Тандаңыз</option>
              {OUTPOST_MILITARY_UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </label>
          <label>
            Заставанын аталышы
            <select
              disabled={!quickForm.region}
              required
              value={quickForm.outpost_name}
              onChange={(event) => setQuickForm((current) => ({ ...current, outpost_name: event.target.value }))}
            >
              <option disabled value="">Тандаңыз</option>
              {(OUTPOSTS_BY_MILITARY_UNIT[quickForm.region] || []).map(([number, name]) => (
                <option key={`${number}-${name}`} value={formatOutpostName(name)}>{number}. {formatOutpostName(name)}</option>
              ))}
            </select>
          </label>
          <label>Email<input required type="email" value={quickForm.email} onChange={(event) => setQuickForm((current) => ({ ...current, email: event.target.value }))} /></label>
          <label>Сырсөз<input minLength={8} required type="password" value={quickForm.password} onChange={(event) => setQuickForm((current) => ({ ...current, password: event.target.value }))} /></label>
          <div className="admin-user-form__actions">
            <button disabled={saving} type="submit">{saving ? "Кошулууда..." : "Тез кошуу"}</button>
            <button disabled={saving} onClick={() => setIsQuickFormOpen(false)} type="button">Жокко чыгаруу</button>
          </div>
        </form>
      )}

      <div className="admin-users-page__tabs" role="tablist" aria-label="Колдонуучунун түрү">
        <button aria-selected={activeGroup === "outpost"} className={activeGroup === "outpost" ? "active" : ""} onClick={() => selectGroup("outpost")} role="tab" type="button">Застава</button>
        <button aria-selected={activeGroup === "regional"} className={activeGroup === "regional" ? "active" : ""} onClick={() => selectGroup("regional")} role="tab" type="button">Аскер бөлүгү</button>
        <button aria-selected={activeGroup === "admin"} className={activeGroup === "admin" ? "active" : ""} onClick={() => selectGroup("admin")} role="tab" type="button">Администратор</button>
      </div>

      {isFormOpen && (
        <form className="admin-user-form admin-user-registration-form" encType="multipart/form-data" onSubmit={submit}>
          <h2>{editing ? "Колдонуучуну өзгөртүү" : "Колдонуучуну кошуу"}</h2>
          <label>Аты-жөнү<input name="full_name" required value={form.full_name} onChange={updateField} /></label>
          <label>Аскердик наамы<input name="military_rank" required value={form.military_rank} onChange={updateField} /></label>
          <label>Кызматы<input name="position" required value={form.position} onChange={updateField} /></label>
          {form.role !== "admin" && <label>
            Бөлүкчө
            <select name="unit_type" required value={form.unit_type} onChange={updateField}>
              <option value="outpost">Застава</option>
              <option value="regional_department">Аскер бөлүгү</option>
              <option value="detachment">Отряд</option>
              <option value="group">Топ</option>
              <option value="company">Рота</option>
              <option value="platoon">Взвод</option>
              <option value="institution">Мекеме</option>
            </select>
          </label>}
          {form.role !== "admin" && <label>
            Аскер бөлүгүнүн номери
            <select className={!form.region ? "form-select-placeholder" : undefined} name="region" required value={form.region} onChange={updateField}>
              <option disabled value="">Аскер бөлүгүнүн номерин тандаңыз</option>
              {(form.unit_type === "outpost" ? OUTPOST_MILITARY_UNIT_OPTIONS : MILITARY_UNIT_OPTIONS).map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </label>}
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
          {namedSubunitLabels[form.unit_type] && form.region && (
            <label>
              {namedSubunitLabels[form.unit_type]}
              <input
                name="outpost_name"
                required
                value={form.outpost_name}
                onChange={updateField}
              />
            </label>
          )}
          <label>Телефон<input name="phone" pattern="^\+996\d{9}$" placeholder="+996XXXXXXXXX" required value={form.phone} onChange={updateField} /></label>
          <label>Email<input name="email" required type="email" value={form.email} onChange={updateField} /></label>
          <label>
            Сырсөз
            <input name="password" minLength={8} required={!editing} type="password" value={form.password} onChange={updateField} />
            {editing && <small>Сырсөздү өзгөртпөө үчүн бош калтырыңыз.</small>}
          </label>
          <label>
            Колдонуучунун сүрөтү
            <input accept="image/*" name="photo_face" required={!editing} type="file" onChange={updateField} />
          </label>
          {editing && (
            <label>Статусу<select name="status" value={form.status} onChange={updateField}><option value="active">Активдүү</option><option value="pending">Күтүүдө</option><option value="rejected">Четке кагылган</option></select></label>
          )}
          <div className="admin-user-form__actions">
            <button disabled={saving} type="submit">{saving ? "Сакталууда..." : editing ? "Сактоо" : "Кошуу"}</button>
            <button disabled={saving} onClick={closeForm} type="button">Жокко чыгаруу</button>
          </div>
        </form>
      )}

      <div className="admin-user-search-filters">
        <label className="admin-user-search-filters__search">
          <span>Издөө</span>
          <input
            aria-label="Колдонуучуларды издөө"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Аты-жөнү, электрондук почта, телефон, наам, застава..."
            type="search"
            value={searchQuery}
          />
        </label>
        <label>
          <span>Статусу</span>
          <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="">Бардык статустар</option>
            <option value="active">Активдүү</option>
            <option value="pending">Күтүүдө</option>
            <option value="rejected">Четке кагылган</option>
          </select>
        </label>
        {activeGroup !== "admin" && <label>
          <span>Аскер бөлүгүнүн номери</span>
          <select onChange={(event) => setUnitFilter(event.target.value)} value={unitFilter}>
            <option value="">Бардык аскер бөлүктөр</option>
            {availableUnitNumbers.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </label>}
        {(searchQuery || statusFilter || unitFilter) && (
          <button onClick={resetFilters} type="button">Тазалоо</button>
        )}
      </div>

      {message && <p className="dashboard-notice">{message}</p>}
      {error && <p className="dashboard-error">{error}</p>}
      {loading && <p className="dashboard-state">Колдонуучулар жүктөлүүдө...</p>}
      {!loading && !error && filteredUsers.length === 0 && (
        <p className="dashboard-state">
          {groupUsers.length === 0 ? "Колдонуучулар азырынча жок." : "Берилген шарттар боюнча колдонуучулар табылган жок."}
        </p>
      )}
      {!loading && !error && filteredUsers.length > 0 && (
        <p className="admin-user-search-result">Табылды: {filteredUsers.length}</p>
      )}
      {!loading && filteredUsers.length > 0 && (
        <div className="admin-user-card-list">
          {filteredUsers.map((user) => {
            const avatar = user.photo_face || user.avatar;
            return (
              <button
                className="admin-user-list-card"
                key={user.id}
                onClick={() =>
                  activeGroup === "regional"
                    ? setSelectedRegionalUnit({
                        accountId: user.id,
                        email: user.email,
                        region: user.region,
                      })
                    : setSelectedUser(user)
                }
                type="button"
              >
                <span className="admin-user-avatar">
                  {avatar ? <img alt="" src={avatar} /> : <span>{getInitials(user)}</span>}
                </span>
                <span className="admin-user-list-card__text">
                  <strong>{user.full_name || user.email}</strong>
                  <small>{getUnitName(user)}</small>
                  <small className={user.isOnline ? "user-presence is-online" : "user-presence"}>
                    {formatPresence(user)}
                  </small>
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
