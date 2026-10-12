import React, { useEffect, useState } from "react";

import { api } from "../api/client.js";
import { getApiErrorMessage } from "../api/errors.js";
import { MILITARY_UNIT_OPTIONS } from "../data/militaryUnits.js";

export default function TrainingUnitFields({ form, setForm }) {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (form.unit_type !== "training_platoon_commander") return undefined;
    let mounted = true;
    setLoading(true);
    setError("");
    api.get("/auth/training-centers/")
      .then(({ data }) => { if (mounted) setCenters(data); })
      .catch((requestError) => {
        if (mounted) setError(getApiErrorMessage(requestError, "Окуу борборлорун жүктөө мүмкүн болгон жок."));
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [form.unit_type, attempt]);

  if (form.unit_type === "training_center_head") {
    return <>
      <label>Аскер бөлүгү
        <select name="region" required value={form.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}>
          <option value="" disabled>Аскер бөлүгүн тандаңыз</option>
          {MILITARY_UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
        </select>
      </label>
      <label>Окуу борбордун аталышы
        <input name="outpost_name" required maxLength={160} value={form.outpost_name} onChange={(event) => setForm((current) => ({ ...current, outpost_name: event.target.value }))} />
      </label>
    </>;
  }
  if (form.unit_type !== "training_platoon_commander") return null;

  return <>
    <label>Окуу борбору
      <select name="training_center" required disabled={loading} value={form.training_center || ""} onChange={(event) => {
        const center = centers.find((item) => String(item.id) === event.target.value);
        setForm((current) => ({ ...current, training_center: event.target.value, region: center?.region || "" }));
      }}>
        <option value="" disabled>{loading ? "Жүктөлүүдө..." : "Окуу борборун тандаңыз"}</option>
        {centers.map((center) => <option key={center.id} value={center.id}>{center.name} · {center.region}</option>)}
      </select>
    </label>
    {error ? <div className="error">{error} <button onClick={() => setAttempt((value) => value + 1)} type="button">Кайра жүктөө</button></div> : null}
    {!loading && !error && !centers.length ? <p>Окуу борбору каттала элек. Алгач окуу борбордун башчысы катталышы керек.</p> : null}
    <label>Окуу взводунун номери
      <span className="training-platoon-number">
        <span aria-hidden="true">№</span>
        <input aria-label="Окуу взводунун номери" name="platoon_number" required inputMode="numeric" pattern="[0-9]+" maxLength={12} value={form.platoon_number || ""} onChange={(event) => {
          const value = event.target.value;
          if (/^[0-9]*$/.test(value)) setForm((current) => ({ ...current, platoon_number: value }));
        }} />
      </span>
    </label>
  </>;
}
