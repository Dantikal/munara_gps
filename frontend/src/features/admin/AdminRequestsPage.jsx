import React from "react";
import { useEffect, useRef, useState } from "react";

import { api } from "../../api/client.js";
import { getApiErrorMessage } from "../../api/errors.js";

const unitLabels = {
  regional_department: "Войсковая часть №",
  outpost: "Застава",
};

const hasValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== "";

const getRegistrationRows = (request) =>
  [
    ["ФИО", request.full_name],
    ["Email", request.email],
    ["Телефон", request.phone],
    ["Звание", request.military_rank],
    ["Должность", request.position],
    ["Подразделение", unitLabels[request.unit_type] || request.unit_type],
    ["Аскер бөлүк", request.region],
    ["Застава", request.outpost_name],
  ].filter(([, value]) => hasValue(value));

const isAlreadyProcessedError = (error) =>
  error.response?.status === 400 &&
  ["PENDING", "уже обработана"].some((text) =>
    String(error.response?.data?.detail || "").includes(text)
  );

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const moderationInFlight = useRef(false);

  const loadRequests = async () => {
    const { data } = await api.get("/auth/admin/requests/");
    setRequests(data);
    setSelected(data[0] || null);
  };

  useEffect(() => {
    loadRequests().catch((err) =>
      setError(getApiErrorMessage(err, "Не удалось загрузить заявки."))
    );
  }, []);

  const moderate = async (decision) => {
    if (!selected || moderationInFlight.current) return;

    if (decision === "reject" && !reason.trim()) {
      setMessage("");
      setError("Укажите причину отклонения.");
      return;
    }

    moderationInFlight.current = true;
    setActionLoading(true);
    setMessage("");
    setError("");

    try {
      await api.post(`/auth/admin/requests/${selected.id}/moderate/`, {
        decision,
        rejection_reason: reason.trim(),
      });
      setMessage(
        decision === "approve"
          ? "Заявка одобрена."
          : "Заявка отклонена, email-уведомление отправлено."
      );
      setReason("");
      await loadRequests();
    } catch (err) {
      if (isAlreadyProcessedError(err)) {
        setMessage("Эта заявка уже обработана. Список заявок обновлен.");
        setReason("");
        await loadRequests();
      } else {
        setError(getApiErrorMessage(err, "Не удалось обработать заявку."));
      }
    } finally {
      moderationInFlight.current = false;
      setActionLoading(false);
    }
  };

  return (
    <section className="admin-layout">
      <aside className="panel">
        <h1>Новые заявки</h1>
        {requests.length === 0 && <p>Нет заявок на рассмотрении.</p>}
        <div className="request-list">
          {requests.map((item) => (
            <button
              className={selected?.id === item.id ? "active-row" : ""}
              key={item.id}
              onClick={() => setSelected(item)}
            >
              <strong>{item.full_name}</strong>
              <span>{item.region}</span>
            </button>
          ))}
        </div>
      </aside>

      <article className="panel">
        {!selected && <p>Выберите заявку.</p>}
        {selected && (
          <>
            <h2>{selected.full_name}</h2>
            <dl className="details">
              {getRegistrationRows(selected).map(([label, value]) => (
                <React.Fragment key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </React.Fragment>
              ))}
            </dl>
            <div className="photo-grid">
              <figure>
                <button
                  className="photo-preview-button"
                  onClick={() =>
                    setPreview({ src: selected.photo_face, alt: "Фото лица" })
                  }
                  type="button"
                >
                  <img src={selected.photo_face} alt="Фото лица" />
                </button>
                <figcaption>Фото лица</figcaption>
              </figure>
              <figure>
                <button
                  className="photo-preview-button"
                  onClick={() =>
                    setPreview({
                      src: selected.photo_military_id,
                      alt: "Военный билет",
                    })
                  }
                  type="button"
                >
                  <img src={selected.photo_military_id} alt="Военный билет" />
                </button>
                <figcaption>Военный билет</figcaption>
              </figure>
            </div>
            <label>
              Причина отклонения
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <div className="actions">
              <button disabled={actionLoading} onClick={() => moderate("approve")}>
                {actionLoading ? "Обработка..." : "Подтвердить"}
              </button>
              <button
                className="danger"
                disabled={actionLoading}
                onClick={() => moderate("reject")}
              >
                Отклонить
              </button>
            </div>
          </>
        )}
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        {preview && (
          <div className="photo-lightbox" onClick={() => setPreview(null)}>
            <button
              aria-label="Закрыть"
              className="photo-lightbox__close"
              onClick={() => setPreview(null)}
              type="button"
            >
              Закрыть
            </button>
            <img
              alt={preview.alt}
              onClick={(event) => event.stopPropagation()}
              src={preview.src}
            />
          </div>
        )}
      </article>
    </section>
  );
}
