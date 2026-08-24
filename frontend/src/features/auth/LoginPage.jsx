import React from "react";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { login } from "./authSlice.js";

export default function LoginPage({ onLoggedIn }) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.auth);
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setCredentials((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const action = await dispatch(login(credentials));

    if (login.fulfilled.match(action)) {
      onLoggedIn?.();
    }
  };

  return (
    <section className="panel narrow">
      <h1>Кирүү</h1>
      <form className="form-grid single-column" onSubmit={submit}>
        <label>
          Электрондук почта
          <input
            autoComplete="email"
            name="email"
            required
            type="email"
            value={credentials.email}
            onChange={updateField}
          />
        </label>
        <label>
          Сырсөз
          <span className="password-input">
            <input
              autoComplete="current-password"
              name="password"
              required
              type={showPassword ? "text" : "password"}
              value={credentials.password}
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
        <button disabled={loading} type="submit">
          {loading ? "Кирүүдө..." : "Кирүү"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
