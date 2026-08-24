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
};

const namedSubunitLabels = {
  detachment: "Отрядтын аталышы",
  group: "Топтун аталышы",
  company: "Ротанын аталышы",
  platoon: "Взводдун аталышы",
};

export default function RegistrationForm() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const namedSubunitLabel = namedSubunitLabels[form.unit_type];
  const isNamedSubunit = Boolean(namedSubunitLabel);

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

      if (
        name === "region" &&
        ["outpost", ...Object.keys(namedSubunitLabels)].includes(current.unit_type)
      ) {
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
      setShowPassword(false);
      formElement.reset();
    } catch (err) {
      setError(JSON.stringify(err.response?.data || "Каттоо катасы"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <h1>Кирүү мүмкүнчүлүгүнө каттоо</h1>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Аты-жөнү
          <input name="full_name" required onChange={updateField} />
        </label>
        <label>
          Аскердик наамы
          <input name="military_rank" required onChange={updateField} />
        </label>
        <label>
          Кызматы
          <input name="position" required onChange={updateField} />
        </label>
        <label>
          Бөлүкчө
          <select
            name="unit_type"
            required
            value={form.unit_type}
            onChange={updateField}
          >
            <option value="">Бөлүкчөнү тандаңыз</option>
            <option value="outpost">Застава</option>
            <option value="regional_department">Аскер бөлүгү</option>
            <option value="detachment">Отряд</option>
            <option value="group">Топ</option>
            <option value="company">Рота</option>
            <option value="platoon">Взвод</option>
            <option value="institution">Мекеме</option>
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
        {["regional_department", "institution"].includes(form.unit_type) && (
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
        {isNamedSubunit && (
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
                {MILITARY_UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {/^[0-9]+$/.test(unit) ? `${unit} аскер бөлүгү` : unit}
                  </option>
                ))}
              </select>
            </label>
            {form.region && (
              <label>
                {namedSubunitLabel}
                <input
                  name="outpost_name"
                  required
                  value={form.outpost_name}
                  onChange={updateField}
                />
              </label>
            )}
          </>
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
          Электрондук почтасы
          <input name="email" type="email" required onChange={updateField} />
        </label>
        <label>
          Сырсөз
          <span className="password-input">
            <input
              autoComplete="new-password"
              name="password"
              type={showPassword ? "text" : "password"}
              minLength={8}
              required
              value={form.password}
              onChange={updateField}
            />
            <button
              aria-label={showPassword ? "Сырсөздү жашыруу" : "Сырсөздү көрсөтүү"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? "Жашыруу" : "Көрсөтүү"}
            </button>
          </span>
        </label>
        <label>
          Колдонуучунун сүрөтү
          <input
            name="photo_face"
            type="file"
            accept="image/*"
            required
            onChange={updateField}
          />
        </label>
        <button disabled={loading} type="submit">
          {loading ? "Жөнөтүлүүдө..." : "Өтүнмө жөнөтүү"}
        </button>
      </form>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
