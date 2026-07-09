import React, { useState } from "react";
import { useDispatch } from "react-redux";

import { api } from "../../../api/client.js";
import { getApiErrorMessage } from "../../../api/errors.js";
import { updateUser } from "../../../features/auth/authSlice.js";

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

const getInitials = (user) => {
  const source = user?.full_name || user?.email || "Пользователь";
  return source
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

export default function Profile({ user }) {
  const dispatch = useDispatch();
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const avatarSrc = user?.avatar || user?.photo_face;

  const registrationRows = [
    ["ФИО", user?.full_name],
    ["Воинское звание", user?.military_rank],
    ["Должность", user?.position],
    ["Подразделение", unitLabels[user?.unit_type] || user?.unit_type],
    ["Аскер бөлүк", user?.region],
    ["Застава", user?.outpost_name],
    ["Телефон", user?.phone],
    ["Email", user?.email],
    ["Роль", roleLabels[user?.role] || user?.role],
    ["Статус", statusLabels[user?.status] || user?.status],
    ["Дата регистрации", user?.date_joined],
  ].filter(([, value]) => value);

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const payload = new FormData();
    payload.append("avatar", file);
    setUploading(true);
    setMessage("");
    setError("");

    try {
      const { data } = await api.patch("/auth/me/", payload);
      dispatch(updateUser(data));
      setMessage("Аватарка обновлена.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Не удалось обновить аватарку."));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <section className="module-panel profile-panel">
      <header>
        <h1>Мой профиль</h1>
        <p>Информация текущего пользователя системы.</p>
      </header>
      <div className="profile-layout">
        <div className="profile-avatar profile-avatar--large">
          {avatarSrc ? (
            <img alt={user.full_name || user.email} src={avatarSrc} />
          ) : (
            <span>{getInitials(user)}</span>
          )}
        </div>
        <div className="profile-main">
          <label className="avatar-upload">
            <input accept="image/*" type="file" onChange={uploadAvatar} />
            <span>{uploading ? "Загрузка..." : "Поставить аватарку"}</span>
          </label>
          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}
          <h2 className="profile-section-title">Поля регистрации</h2>
          <dl className="profile-details">
            {registrationRows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <section className="profile-documents">
        <h2>Файлы регистрации</h2>
        <div className="profile-documents__grid">
          <figure>
            {user?.photo_military_id ? (
              <img alt="Фото военного билета" src={user.photo_military_id} />
            ) : (
              <div className="profile-document-placeholder">Файл не загружен</div>
            )}
            <figcaption>Фото военного билета</figcaption>
          </figure>
          <figure>
            {user?.photo_face ? (
              <img alt="Фото лица при регистрации" src={user.photo_face} />
            ) : (
              <div className="profile-document-placeholder">Файл не загружен</div>
            )}
            <figcaption>Фото лица</figcaption>
          </figure>
        </div>
      </section>
    </section>
  );
}
