import React, { useEffect, useState } from "react";

import { decideSubmissionEditRequest, getSubmissionEditRequests } from "../../api/dashboard.js";

const statusLabels = {
  pending: "На рассмотрении",
  approved: "Разрешено",
  rejected: "Отклонено",
};

export default function SubmissionEditRequestsPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState(null);

  const load = async () => {
    try {
      setItems(await getSubmissionEditRequests());
      setError("");
    } catch {
      setError("Не удалось загрузить запросы на исправление.");
    }
  };

  useEffect(() => { load(); }, []);

  const decide = async (item, status) => {
    setLoadingId(item.id);
    try {
      const updated = await decideSubmissionEditRequest(item.id, status);
      setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry));
    } catch {
      setError("Не удалось обработать запрос.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <section className="module-panel">
      <header><h1>Запросы на разрешение</h1></header>
      {error ? <p className="dashboard-error">{error}</p> : null}
      <div className="saved-table-list">
        {items.length ? items.map((item) => (
          <article className="saved-table-card" key={item.id}>
            <strong>{item.submission.documentTitle}</strong>
            <span>{item.requesterName} · {item.requesterRole === "outpost" ? "Застава" : "Аскер бөлүгү"}</span>
            <span className={`submission-edit-status submission-edit-status--${item.status}`}>{statusLabels[item.status]}</span>
            {item.status === "pending" ? (
              <div className="saved-table-card__actions">
                <button disabled={loadingId === item.id} onClick={() => decide(item, "approved")} type="button">Разрешить</button>
                <button disabled={loadingId === item.id} onClick={() => decide(item, "rejected")} type="button">Отклонить</button>
              </div>
            ) : null}
          </article>
        )) : <p>Запросов пока нет.</p>}
      </div>
    </section>
  );
}
