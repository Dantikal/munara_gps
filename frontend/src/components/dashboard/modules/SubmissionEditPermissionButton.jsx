import React, { useState } from "react";
import { useSelector } from "react-redux";

import { requestSubmissionEditPermission } from "../../../api/dashboard.js";
import { getApiErrorMessage } from "../../../api/errors.js";

export default function SubmissionEditPermissionButton({ submission, onUpdated }) {
  const user = useSelector((state) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isOwner = ["outpost", "regional"].includes(user?.role) && String(submission?.senderId) === String(user?.id);

  if (!isOwner) return null;

  if (submission.canEdit || submission.editRequestStatus === "approved") {
    return <span className="submission-edit-status submission-edit-status--approved">Можно изменить</span>;
  }
  if (submission.editRequestStatus === "pending") {
    return <span className="submission-edit-status submission-edit-status--pending">Запрос отправлен</span>;
  }

  const requestPermission = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await requestSubmissionEditPermission(submission.id);
      onUpdated?.({ ...submission, editRequestStatus: result.status, canEdit: false });
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось отправить запрос."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button disabled={loading} onClick={requestPermission} type="button">
        {loading ? "Отправка..." : "Запросить разрешение на исправление"}
      </button>
      {error ? <small className="dashboard-error">{error}</small> : null}
    </>
  );
}
