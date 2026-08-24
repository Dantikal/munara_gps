import React, { useEffect, useMemo, useState } from "react";

import {
  getThematicAccountSubmissions,
  markThematicAccountSubmissionRead,
} from "../../../api/dashboard.js";
import { getDocumentRegistrationCode } from "../../../utils/documentRegistration.js";
import Analytics from "./Analytics.jsx";

const SECTION_ID = "memo-letter";

const readDrafts = (storageKey) => {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString("ky-KG");
};

export default function MemoLetter({ user }) {
  const storageKey = `munara-memo-letters:${user?.id || "anonymous"}`;
  const [drafts, setDrafts] = useState(() => readDrafts(storageKey));
  const [submissions, setSubmissions] = useState([]);
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    getThematicAccountSubmissions()
      .then((items) => {
        if (!isCurrent) return;
        setSubmissions(
          (Array.isArray(items) ? items : []).filter(
            (submission) => submission.sectionId === SECTION_ID
          )
        );
      })
      .catch(() => {
        if (isCurrent) setError("Документтерди жүктөө мүмкүн болгон жок.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const saveDrafts = (nextDrafts) => {
    setDrafts(nextDrafts);
    window.localStorage.setItem(storageKey, JSON.stringify(nextDrafts));
  };

  const activeDraft = drafts.find((draft) => draft.id === activeDraftId) || null;
  const incoming = useMemo(() => {
    if (user?.role === "regional") {
      return submissions.filter((submission) => submission.senderRole === "outpost");
    }
    if (user?.role === "admin") {
      return submissions.filter((submission) => submission.senderRole === "regional");
    }
    return [];
  }, [submissions, user?.role]);
  const outgoing = useMemo(() => {
    if (user?.role === "outpost") return submissions;
    if (user?.role === "regional") {
      return submissions.filter((submission) => submission.senderId === user?.id);
    }
    return [];
  }, [submissions, user?.id, user?.role]);

  const handleCreate = (event) => {
    event.preventDefault();
    const title = draftTitle.trim();
    if (!title) {
      setError("Билдирме каттын аталышын жазыңыз.");
      return;
    }
    const id = `memo-letter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    saveDrafts([{ id, title, createdAt: new Date().toISOString() }, ...drafts]);
    setDraftTitle("");
    setError("");
    setIsCreateOpen(false);
    setActiveDraftId(id);
  };

  const handleDeleteDraft = (documentId) => {
    saveDrafts(drafts.filter((draft) => draft.id !== documentId));
    setActiveDraftId(null);
  };

  const handleSubmissionCreated = (submission) => {
    setSubmissions((items) => [
      submission,
      ...items.filter((item) => item.id !== submission.id),
    ]);
  };

  const handleOpenSubmission = (submission) => {
    setActiveSubmission(submission);
    const isIncoming =
      (user?.role === "regional" && submission.senderRole === "outpost") ||
      (user?.role === "admin" && submission.senderRole === "regional");
    if (!isIncoming || submission.isRead) return;

    setSubmissions((items) =>
      items.map((item) =>
        item.id === submission.id ? { ...item, isRead: true } : item
      )
    );
    markThematicAccountSubmissionRead(submission.id)
      .then(() => window.dispatchEvent(new Event("memo-letter-read")))
      .catch(() => {
        setSubmissions((items) =>
          items.map((item) =>
            item.id === submission.id ? { ...item, isRead: false } : item
          )
        );
      });
  };

  if (activeDraft) {
    return (
      <Analytics
        data={{
          directDocumentId: activeDraft.id,
          directDocumentTitle: activeDraft.title,
          directEditor: true,
          defaultAddressee:
            user?.role === "outpost" ? "Аскер бөлүгүнүн командирине" : "Администраторго",
          initialSectionId: "monthly-analysis",
          onBack: () => setActiveDraftId(null),
          onDeleteDirectDocument: handleDeleteDraft,
          onSubmissionCreated: handleSubmissionCreated,
          registryCounterStorageKey: `munara-memo-letter-registry:${user?.id}`,
          simpleLetterEditor: true,
          storageNamespace: `memo-letter:${user?.id}:${activeDraft.id}`,
          submissionPeriodId: activeDraft.id,
          submissionSectionId: SECTION_ID,
        }}
        key={activeDraft.id}
        user={user}
      />
    );
  }

  if (activeSubmission) {
    return (
      <Analytics
        data={{
          directEditor: true,
          directSubmission: activeSubmission,
          initialSectionId: "monthly-analysis",
          onBack: () => setActiveSubmission(null),
          simpleLetterEditor: true,
          storageNamespace: `memo-letter-submission:${activeSubmission.id}`,
        }}
        key={`memo-letter-submission-${activeSubmission.id}`}
        user={user}
      />
    );
  }

  const renderSubmissions = (title, items, emptyText) => (
    <div className="module-submission-list">
      <h2>{title}</h2>
      {items.length > 0 ? (
        <div className="module-period-list">
          {items.map((submission) => (
            <button
              className="module-period-card module-period-card--document"
              key={submission.id}
              onClick={() => handleOpenSubmission(submission)}
              type="button"
            >
              <span aria-hidden="true" className="module-document-icon" />
              <span className="module-submission-card__content">
                <strong>{submission.documentTitle}</strong>
                <small>Каттоо № {getDocumentRegistrationCode(submission)}</small>
                <small>
                  {submission.senderName || submission.outpostName || submission.unitNumber}
                  {submission.createdAt ? ` · ${formatDate(submission.createdAt)}` : ""}
                </small>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="dashboard-state">{emptyText}</p>
      )}
    </div>
  );

  return (
    <section className="module-panel">
      <div className="module-header-row">
        <div>
          <p className="eyebrow">Иш кагаздар</p>
          <h1>Билдирме кат</h1>
        </div>
        {user?.role !== "admin" ? (
          <button
            className="module-action-button"
            onClick={() => {
              setDraftTitle("");
              setError("");
              setIsCreateOpen(true);
            }}
            type="button"
          >
            + Кошуу
          </button>
        ) : null}
      </div>

      {error && !isCreateOpen ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p className="dashboard-state">Жүктөлүүдө...</p> : null}

      {user?.role !== "admin" ? (
        <div className="module-submission-list">
          <h2>Даярдалган документтер</h2>
          {drafts.length > 0 ? (
            <div className="module-period-list">
              {drafts.map((draft) => (
                <button
                  className="module-period-card module-period-card--document"
                  key={draft.id}
                  onClick={() => setActiveDraftId(draft.id)}
                  type="button"
                >
                  <span aria-hidden="true" className="module-document-icon" />
                  <span className="module-submission-card__content">
                    <strong>{draft.title}</strong>
                    <small>{formatDate(draft.createdAt)}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="dashboard-state">Даярдалган документтер азырынча жок.</p>
          )}
        </div>
      ) : null}

      {incoming.length > 0 || user?.role !== "outpost"
        ? renderSubmissions("Кириш", incoming, "Келген документтер азырынча жок.")
        : null}
      {user?.role !== "admin"
        ? renderSubmissions("Чыгыш", outgoing, "Жөнөтүлгөн документтер азырынча жок.")
        : null}

      {isCreateOpen ? (
        <div className="lesson-period-dialog" role="dialog" aria-modal="true" aria-labelledby="memo-letter-create-title">
          <form className="lesson-period-dialog__panel" onSubmit={handleCreate}>
            <h2 id="memo-letter-create-title">Билдирме кат кошуу</h2>
            <label>
              Аталышы
              <input
                autoFocus
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="Документтин аталышы"
                value={draftTitle}
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="lesson-period-dialog__actions">
              <button onClick={() => setIsCreateOpen(false)} type="button">Жокко чыгаруу</button>
              <button type="submit">Кошуу</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
