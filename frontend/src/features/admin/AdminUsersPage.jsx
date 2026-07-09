import React, { useEffect, useState } from "react";

import { api } from "../../api/client.js";
import { getApiErrorMessage } from "../../api/errors.js";

const roleLabels = {
  admin: "Администратор",
  regional: "Областное управление",
  outpost: "Застава",
};

const statusLabels = {
  active: "Активен",
  pending: "Ожидает",
  rejected: "Отклонен",
};

const unitLabels = {
  regional_department: "Войсковая часть №",
  outpost: "Застава",
};

const emptyForm = {
  id: null,
  email: "",
  password: "",
  full_name: "",
  military_rank: "",
  position: "",
  unit_type: "",
  phone: "+996",
  region: "",
  outpost_name: "",
  role: "regional",
  status: "active",
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("ru-RU");
};

const toForm = (user) => ({
  id: user.id,
  email: user.email || "",
  password: "",
  full_name: user.full_name || "",
  military_rank: user.military_rank || "",
  position: user.position || "",
  unit_type: unitLabels[user.unit_type] || user.unit_type || "",
  phone: user.phone || "+996",
  region: user.region || "",
  outpost_name: user.outpost_name || "",
  role: user.role || "regional",
  status: user.status || "active",
});

const buildPayload = (form, editing) => {
  const payload = {
    email: form.email.trim(),
    full_name: form.full_name.trim(),
    military_rank: form.military_rank.trim(),
    position: form.position.trim(),
    unit_type: form.unit_type.trim(),
    phone: form.phone.trim(),
    region: form.region.trim(),
    outpost_name: form.outpost_name.trim(),
    role: form.role,
    status: form.status,
  };

  if (!editing || form.password.trim()) {
    payload.password = form.password;
  }

  return payload;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const editing = Boolean(form.id);

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/auth/admin/users/");
      setUsers(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось загрузить пользователей."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setMessage("");
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = buildPayload(form, editing);
      if (editing) {
        await api.patch(`/auth/admin/users/${form.id}/`, payload);
        setMessage("Пользователь обновлен.");
      } else {
        await api.post("/auth/admin/users/", payload);
        setMessage("Пользователь добавлен.");
      }
      setForm(emptyForm);
      await loadUsers();
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось сохранить пользователя."));
    } finally {
      setSaving(false);
    }
  };

  const editUser = (user) => {
    setForm(toForm(user));
    setMessage("");
    setError("");
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Удалить пользователя ${user.full_name || user.email}?`)) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await api.delete(`/auth/admin/users/${user.id}/`);
      if (form.id === user.id) {
        setForm(emptyForm);
      }
      setMessage("Пользователь удален.");
      await loadUsers();
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось удалить пользователя."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="module-panel">
      <header>
        <h1>Пользователи</h1>
        <p>Создание, изменение и удаление пользователей системы.</p>
      </header>

      <form className="admin-user-form" onSubmit={submit}>
        <label>
          ФИО
          <input name="full_name" required value={form.full_name} onChange={updateField} />
        </label>
        <label>
          Email
          <input name="email" required type="email" value={form.email} onChange={updateField} />
        </label>
        <label>
          Пароль
          <input
            name="password"
            minLength={8}
            required={!editing}
            type="password"
            value={form.password}
            onChange={updateField}
          />
        </label>
        <label>
          Телефон
          <input
            name="phone"
            pattern={"^\\+996\\d{9}$"}
            value={form.phone}
            onChange={updateField}
          />
        </label>
        <label>
          Звание
          <input name="military_rank" value={form.military_rank} onChange={updateField} />
        </label>
        <label>
          Должность
          <input name="position" value={form.position} onChange={updateField} />
        </label>
        <label>
          Подразделение
          <input name="unit_type" value={form.unit_type} onChange={updateField} />
        </label>
        <label>
          Аскер бөлүк
          <input name="region" value={form.region} onChange={updateField} />
        </label>
        <label>
          Застава
          <input name="outpost_name" value={form.outpost_name} onChange={updateField} />
        </label>
        <label>
          Роль
          <select name="role" value={form.role} onChange={updateField}>
            <option value="admin">Администратор</option>
            <option value="regional">Областное управление</option>
            <option value="outpost">Застава</option>
          </select>
        </label>
        <label>
          Статус
          <select name="status" value={form.status} onChange={updateField}>
            <option value="active">Активен</option>
            <option value="pending">Ожидает</option>
            <option value="rejected">Отклонен</option>
          </select>
        </label>
        <div className="admin-user-form__actions">
          <button disabled={saving} type="submit">
            {saving ? "Сохранение..." : editing ? "Сохранить" : "Добавить"}
          </button>
          {editing && (
            <button disabled={saving} onClick={resetForm} type="button">
              Отмена
            </button>
          )}
        </div>
      </form>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
      {loading && <p>Загрузка пользователей...</p>}
      {!loading && !error && users.length === 0 && <p>Пользователей нет.</p>}

      {!loading && users.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Email</th>
                <th>Телефон</th>
                <th>Звание</th>
                <th>Должность</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Подразделение</th>
                <th>Аскер бөлүк</th>
                <th>Дата регистрации</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.full_name || "-"}</td>
                  <td>{user.email || "-"}</td>
                  <td>{user.phone || "-"}</td>
                  <td>{user.military_rank || "-"}</td>
                  <td>{user.position || "-"}</td>
                  <td>{roleLabels[user.role] || user.role || "-"}</td>
                  <td>{statusLabels[user.status] || user.status || "-"}</td>
                  <td>{unitLabels[user.unit_type] || user.unit_type || "-"}</td>
                  <td>{user.region || "-"}</td>
                  <td>{formatDate(user.date_joined)}</td>
                  <td>
                    <div className="table-actions">
                      <button disabled={saving} onClick={() => editUser(user)} type="button">
                        Изменить
                      </button>
                      <button
                        className="danger"
                        disabled={saving}
                        onClick={() => deleteUser(user)}
                        type="button"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
