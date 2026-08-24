import React, { useEffect, useState } from "react";

import {
  decideSubmissionEditRequest,
  deleteSubmissionEditRequest,
  getSubmissionEditRequests,
} from "../../api/dashboard.js";
import { RegisteredDocumentView } from "../../components/dashboard/modules/DocumentRegistry.jsx";
import { getDocumentRegistrationCode } from "../../utils/documentRegistration.js";

const statusLabels = {
  pending: "Каралууда",
  approved: "Уруксат берилди",
  rejected: "Четке кагылды",
};

export default function SubmissionEditRequestsPage({ user }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const load = async () => {
    try {
      setItems(await getSubmissionEditRequests());
      setError("");
    } catch {
      setError("Оңдоо сурамдарын жүктөө мүмкүн болгон жок.");
    }
  };

  useEffect(() => { load(); }, []);

  const decide = async (item, status) => {
    setLoadingId(item.id);
    try {
      const updated = await decideSubmissionEditRequest(item.id, status);
      setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry));
    } catch {
      setError("Сурамды иштетүү мүмкүн болгон жок.");
    } finally {
      setLoadingId(null);
    }
  };

  const remove = async (item) => {
    const warning = item.status === "approved"
      ? "Бул сурамды өчүрсөңүз, документти оңдоого берилген уруксат да жокко чыгарылат. Өчүрүлсүнбү?"
      : "Бул сурам өчүрүлсүнбү?";
    if (!window.confirm(warning)) return;

    setLoadingId(item.id);
    try {
      await deleteSubmissionEditRequest(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setError("");
    } catch {
      setError("Сурамды өчүрүү мүмкүн болгон жок.");
    } finally {
      setLoadingId(null);
    }
  };

  if (selectedDocument) {
    return (
      <RegisteredDocumentView
        document={selectedDocument}
        onBack={() => setSelectedDocument(null)}
        user={user}
      />
    );
  }

  return (
    <section className="module-panel">
      <header><h1>Уруксат сурамдары</h1></header>
      {error ? <p className="dashboard-error">{error}</p> : null}
      <div className="saved-table-list">
        {items.length ? items.map((item) => (
          <article className="saved-table-card" key={item.id}>
            <strong>{item.submission.documentTitle}</strong>
            <span>Каттоо № {getDocumentRegistrationCode(item.submission)}</span>
            <span>{item.requesterName} · {item.requesterRole === "outpost" ? "Застава" : "Аскер бөлүгү"}</span>
            <span className={`submission-edit-status submission-edit-status--${item.status}`}>{statusLabels[item.status]}</span>
            <div className="saved-table-card__actions">
              <button
                className="module-action-button"
                onClick={() => setSelectedDocument(item.submission)}
                type="button"
              >
                Документти көрүү
              </button>
              {item.status === "pending" ? (
                <>
                  <button disabled={loadingId === item.id} onClick={() => decide(item, "approved")} type="button">Уруксат берүү</button>
                  <button disabled={loadingId === item.id} onClick={() => decide(item, "rejected")} type="button">Четке кагуу</button>
                </>
              ) : (
                <button disabled={loadingId === item.id} onClick={() => remove(item)} type="button">
                  Өчүрүү
                </button>
              )}
            </div>
          </article>
        )) : <p>Сурамдар азырынча жок.</p>}
      </div>
    </section>
  );
}
