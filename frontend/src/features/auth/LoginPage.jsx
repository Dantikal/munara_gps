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
      <h1>Вход</h1>
      <form className="form-grid single-column" onSubmit={submit}>
        <label>
          Email
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
          Пароль
          <input
            autoComplete="current-password"
            name="password"
            required
            type="password"
            value={credentials.password}
            onChange={updateField}
          />
        </label>
        <button disabled={loading} type="submit">
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
