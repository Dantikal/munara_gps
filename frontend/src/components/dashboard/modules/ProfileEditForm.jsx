import React, { useState } from "react";
import { useDispatch } from "react-redux";

import { api } from "../../../api/client.js";
import { getApiErrorMessage } from "../../../api/errors.js";
import {
  MILITARY_UNIT_OPTIONS,
  OUTPOST_MILITARY_UNIT_OPTIONS,
  OUTPOSTS_BY_MILITARY_UNIT,
  formatOutpostName,
} from "../../../data/militaryUnits.js";
import { updateUser } from "../../../features/auth/authSlice.js";

const namedSubunitLabels = {
  detachment: "Отрядтын аталышы",
  group: "Топтун аталышы",
  company: "Ротанын аталышы",
  platoon: "Взводдун аталышы",
};

export default function ProfileEditForm({ user, requiredCompletion = false, onCancel, onSaved }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    email: user?.email || "",
    password: "",
    full_name: user?.full_name || "",
    military_rank: user?.military_rank || "",
    position: user?.position || "",
    unit_type: user?.unit_type || "outpost",
    phone: user?.phone || "",
    region: user?.region || "",
    outpost_name: user?.outpost_name || "",
    photo_face: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateField = (event) => {
    const { name, value, files } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: files ? files[0] || null : value };
      // Don't reset region and outpost_name when changing unit_type or region
      // This allows users to freely edit these fields
      return next;
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (user?.role === "admin" && ["unit_type", "region", "outpost_name"].includes(key)) return;
        if (key === "photo_face") {
          if (value) payload.append(key, value);
        } else if (key !== "password" || value) {
          payload.append(key, String(value ?? "").trim());
        }
      });
      if (requiredCompletion) payload.append("complete_profile", "true");

      // Log what's being sent for debugging
      console.log("Submitting profile update:", Object.fromEntries(payload));

      const { data } = await api.patch("/auth/me/", payload);
      dispatch(updateUser(data));
      onSaved?.(data);
    } catch (requestError) {
      console.error("Profile update error:", requestError);
      setError(getApiErrorMessage(requestError, "Профилди сактоо мүмкүн болгон жок."));
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = user?.role === "admin";
  const unitOptions = form.unit_type === "outpost" ? OUTPOST_MILITARY_UNIT_OPTIONS : MILITARY_UNIT_OPTIONS;

  return (
    <form className="profile-edit-form" encType="multipart/form-data" onSubmit={submit}>
      {error ? <p className="dashboard-error">{error}</p> : null}
      <label>Аты-жөнү<input name="full_name" onChange={updateField} required value={form.full_name} /></label>
      <label>Аскердик наамы<input name="military_rank" onChange={updateField} required={requiredCompletion} value={form.military_rank} /></label>
      <label>Кызматы<input name="position" onChange={updateField} required={requiredCompletion} value={form.position} /></label>
      {!isAdmin ? <label>
        Бөлүкчө
        <select name="unit_type" onChange={updateField} required={requiredCompletion && !user?.unit_type} value={form.unit_type}>
          <option value="outpost">Застава</option>
          <option value="regional_department">Аскер бөлүгү</option>
          <option value="detachment">Отряд</option>
          <option value="group">Топ</option>
          <option value="company">Рота</option>
          <option value="platoon">Взвод</option>
          <option value="institution">Мекеме</option>
        </select>
      </label> : null}
      {!isAdmin ? <label>
        Аскер бөлүгүнүн номери
        <select name="region" onChange={updateField} required={requiredCompletion && !user?.region} value={form.region}>
          <option disabled value="">Тандаңыз</option>
          {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
        </select>
      </label> : null}
      {form.unit_type === "outpost" && !isAdmin ? <label>
        Заставанын аталышы
        <select disabled={!form.region} name="outpost_name" onChange={updateField} required={requiredCompletion && !user?.outpost_name} value={form.outpost_name}>
          <option disabled value="">Тандаңыз</option>
          {(OUTPOSTS_BY_MILITARY_UNIT[form.region] || []).map(([number, name]) => (
            <option key={`${number}-${name}`} value={name}>{number}. {formatOutpostName(name)}</option>
          ))}
        </select>
      </label> : null}
      {namedSubunitLabels[form.unit_type] && !isAdmin ? <label>
        {namedSubunitLabels[form.unit_type]}
        <input name="outpost_name" onChange={updateField} required={requiredCompletion && !user?.outpost_name} value={form.outpost_name} />
      </label> : null}
      <label>Телефон<input name="phone" onChange={updateField} pattern="^\+996\d{9}$" placeholder="+996XXXXXXXXX" required={requiredCompletion} value={form.phone} /></label>
      <label>Email<input name="email" onChange={updateField} required type="email" value={form.email} /></label>
      <label>
        Жаңы сырсөз
        <input autoComplete="new-password" minLength={8} name="password" onChange={updateField} type="password" value={form.password} />
        <small>Өзгөртпөсөңүз бош калтырыңыз.</small>
      </label>
      <label>
        Колдонуучунун сүрөтү
        <input accept="image/*" name="photo_face" onChange={updateField} required={requiredCompletion && !user?.photo_face} type="file" />
      </label>
      <div className="admin-user-form__actions">
        <button disabled={saving} type="submit">{saving ? "Сакталууда..." : "Сактоо"}</button>
        {onCancel ? <button disabled={saving} onClick={onCancel} type="button">Жокко чыгаруу</button> : null}
      </div>
    </form>
  );
}
