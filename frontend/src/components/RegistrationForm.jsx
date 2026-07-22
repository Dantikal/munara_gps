import React from "react";
import { useState } from "react";

import { api } from "../api/client.js";
import {
  MILITARY_UNIT_OPTIONS,
  OUTPOST_MILITARY_UNIT_OPTIONS,
  OUTPOSTS_BY_MILITARY_UNIT,
  formatOutpostName,
} from "../data/militaryUnits.js";

const initialForm = {
  full_name: "",
  military_rank: "",
  position: "",
  unit_type: "",
  phone: "",
  email: "",
  password: "",
  region: "",
  outpost_name: "",
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
    setForm((current) => {
      const nextForm = {
        ...current,
        [name]: files ? files[0] : value,
      };

      if (name === "unit_type") {
        nextForm.region = "";
        nextForm.outpost_name = "";
      }

      if (name === "region" && current.unit_type === "outpost") {
        nextForm.outpost_name = "";
      }

      return nextForm;
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
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
      formElement.reset();
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
          <select
            name="unit_type"
            required
            value={form.unit_type}
            onChange={updateField}
          >
            <option value="">Выберите подразделение</option>
            <option value="outpost">Застава</option>
            <option value="regional_department">Аскер бөлүгү</option>
          </select>
        </label>
        {form.unit_type === "outpost" && (
          <>
            <label>
              Аскер бөлүгүнүн номери
              <select
                className={!form.region ? "form-select-placeholder" : undefined}
                name="region"
                required
                value={form.region}
                onChange={updateField}
              >
                <option disabled value="">Аскер бөлүгүнүн номерин тандаңыз</option>
                {OUTPOST_MILITARY_UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Заставанын аталышы
              <select
                className={!form.outpost_name ? "form-select-placeholder" : undefined}
                name="outpost_name"
                required
                value={form.outpost_name}
                onChange={updateField}
                disabled={!form.region}
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
          </>
        )}
        {form.unit_type === "regional_department" && (
          <label>
            Аскер бөлүгүнүн номери
            <select
              className={!form.region ? "form-select-placeholder" : undefined}
              name="region"
              required
              value={form.region}
              onChange={updateField}
            >
              <option disabled value="">Аскер бөлүгүн тандаңыз</option>
              {MILITARY_UNIT_OPTIONS.map((unit) => (
                <option key={unit} value={unit}>
                  {/^[0-9]+$/.test(unit) ? `${unit} аскер бөлүгү` : unit}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Телефон
          <input
            name="phone"
            required
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
