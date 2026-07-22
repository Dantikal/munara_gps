import React, { useEffect, useState } from "react";

import { getApiErrorMessage } from "../../../api/errors.js";

export default function SubmissionForwardDialog({ onClose, onForward, submission }) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setTitle(submission?.documentTitle || "");
    setError("");
  }, [submission]);

  if (!submission) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const documentTitle = title.trim();
    if (!documentTitle) {
      setError("Иш кагаздардын аталышын жазыңыз.");
      return;
    }

    setIsSending(true);
    setError("");
    try {
      await onForward(submission, documentTitle);
      onClose();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Документти жөнөтүү мүмкүн болгон жок."));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="lesson-period-dialog" role="dialog" aria-modal="true">
      <form className="lesson-period-dialog__panel" onSubmit={handleSubmit}>
        <h2>Документти администраторго жөнөтүү</h2>
        <label>
          Иш кагаздардын аталышы
          <input
            autoFocus
            disabled={isSending}
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </label>
        {error ? <p className="lesson-period-dialog__error">{error}</p> : null}
        <div className="lesson-period-dialog__actions">
          <button disabled={isSending} onClick={onClose} type="button">Жокко чыгаруу</button>
          <button disabled={isSending} type="submit">
            {isSending ? "Жөнөтүлүүдө..." : "Отправить"}
          </button>
        </div>
      </form>
    </div>
  );
}
