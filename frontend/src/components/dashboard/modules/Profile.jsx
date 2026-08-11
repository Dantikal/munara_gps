import React, { useState } from "react";
import { useDispatch } from "react-redux";

import { api } from "../../../api/client.js";
import { getApiErrorMessage } from "../../../api/errors.js";
import { updateUser } from "../../../features/auth/authSlice.js";

const roleLabels = {
  admin: "Администратор",
  regional: "Аскер бөлүгү",
  outpost: "Застава",
};

const statusLabels = {
  active: "Активдүү",
  pending: "Күтүүдө",
  rejected: "Четке кагылган",
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

const getDisplayedRole = (user) =>
  unitLabels[user?.unit_type] || roleLabels[user?.role] || user?.role;

const getInitials = (user) => {
  const source = user?.full_name || user?.email || "Колдонуучу";
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
  const avatarSrc = user?.photo_face || user?.avatar;

  const registrationRows = [
    ["Аты-жөнү", user?.full_name],
    ["Аскердик наамы", user?.military_rank],
    ["Кызматы", user?.position],
    ["Бөлүкчө", unitLabels[user?.unit_type] || user?.unit_type],
    ["Аскер бөлүк", user?.region],
    [
      namedSubunitLabels[user?.unit_type] || "Застава",
      user?.outpost_name,
    ],
    ["Телефон номери", user?.phone],
    ["Электрондук почтасы", user?.email],
    ["Ролу", getDisplayedRole(user)],
    ["Статусу", statusLabels[user?.status] || user?.status],
    ["Каттоо датасы", user?.date_joined],
  ].filter(([, value]) => value);

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const payload = new FormData();
    payload.append("photo_face", file);
    setUploading(true);
    setMessage("");
    setError("");

    try {
      const { data } = await api.patch("/auth/me/", payload);
      dispatch(updateUser(data));
      setMessage("Сүрөт жаңыртылды.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Сүрөттү жаңыртуу мүмкүн болгон жок."));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <section className="module-panel profile-panel">
      <header>
        <h1>Жеке кабинетим</h1>
        <p>Системанын учурдагы колдонуучусунун маалыматы.</p>
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
            <span>{uploading ? "Жүктөлүүдө..." : "Сүрөт коюу"}</span>
          </label>
          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}
          <h2 className="profile-section-title">Каттоо талаасы</h2>
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
        <h2>Каттоо файлдары</h2>
        <div className="profile-documents__grid">
          <figure>
            {user?.photo_face ? (
              <img alt="Каттоодогу колдонуучунун сүрөтү" src={user.photo_face} />
            ) : (
              <div className="profile-document-placeholder">Файл жүктөлгөн жок</div>
            )}
            <figcaption>Колдонуучунун сүрөтү</figcaption>
          </figure>
        </div>
      </section>
    </section>
  );
}
