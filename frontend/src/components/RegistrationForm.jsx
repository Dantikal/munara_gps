import React from "react";
import { useState } from "react";

import { api } from "../api/client.js";

const initialForm = {
  full_name: "",
  military_rank: "",
  position: "",
  unit_type: "",
  phone: "+996",
  email: "",
  password: "",
  region: "",
  photo_face: null,
  photo_military_id: null,
};

export default function RegistrationForm() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateField = (event) => {
    const { name, value, files } = event.target;
    setForm((current) => ({
      ...current,
      [name]: files ? files[0] : value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== null && value !== "") {
        payload.append(key, value);
      }
    });

    try {
      const { data } = await api.post("/auth/register/", payload);
      setMessage(data.message);
      setForm(initialForm);
      event.currentTarget.reset();
    } catch (err) {
      setError(JSON.stringify(err.response?.data || "Ошибка регистрации"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h1>Регистрация доступа</h1>
      <form className="form-grid" onSubmit={submit}>
        <label>
          ФИО
          <input name="full_name" required onChange={updateField} />
        </label>
        <label>
          Воинское звание
          <input name="military_rank" required onChange={updateField} />
        </label>
        <label>
          Должность
          <input name="position" required onChange={updateField} />
        </label>
        <label>
          Подразделение
          <input
            name="unit_type"
            required
            value={form.unit_type}
            onChange={updateField}
          />
        </label>
        <label>
          Аскер бөлүк
          <input name="region" required onChange={updateField} />
        </label>
        <label>
          Телефон
          <input
            name="phone"
            required
            pattern="^\+996\d{9}$"
            value={form.phone}
            onChange={updateField}
          />
        </label>
        <label>
          Email
          <input name="email" type="email" required onChange={updateField} />
        </label>
        <label>
          Пароль
          <input
            name="password"
            type="password"
            minLength={8}
            required
            onChange={updateField}
          />
        </label>
        <label>
          Фото военного билета
          <input
            name="photo_military_id"
            type="file"
            accept="image/*"
            required
            onChange={updateField}
          />
        </label>
        <label>
          Фото лица
          <input
            name="photo_face"
            type="file"
            accept="image/*"
            required
            onChange={updateField}
          />
        </label>
        <button disabled={loading} type="submit">
          {loading ? "Отправка..." : "Отправить заявку"}
        </button>
      </form>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
