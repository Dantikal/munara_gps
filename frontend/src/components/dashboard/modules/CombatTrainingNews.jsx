import React, { useEffect, useState } from "react";

import {
  createCombatTrainingNews,
  deleteCombatTrainingNews,
  getCombatTrainingNews,
  markAllCombatTrainingNewsRead,
  toggleCombatTrainingNewsLike,
  updateCombatTrainingNews,
} from "../../../api/dashboard.js";
import { getApiErrorMessage } from "../../../api/errors.js";

const ACCEPTED_FILES =
  ".doc,.docx,.pdf,.txt,.rtf,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.svg,.mp4,.webm,.mov,.avi,.mkv,.mp3,.wav,.ogg,.m4a,.zip,.rar,.7z";

const emptyDraft = () => ({
  body: "",
  files: [],
  id: null,
  removeAttachmentIds: [],
  title: "",
});

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatFileSize = (size) => {
  if (!size) return "";
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
  return `${Math.max(1, Math.round(size / 1024))} КБ`;
};

export default function CombatTrainingNews({ user }) {
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isAdmin = user?.role === "admin";

  const loadNews = async () => {
    setLoading(true);
    setError("");
    try {
      const items = await getCombatTrainingNews();
      setNewsItems(items);
      await markAllCombatTrainingNewsRead();
      window.dispatchEvent(new CustomEvent("combat-training-news-read"));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось загрузить публикации."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const closeEditor = () => {
    setDraft(emptyDraft());
    setIsEditorOpen(false);
  };

  const openCreate = () => {
    setError("");
    setNotice("");
    setDraft(emptyDraft());
    setIsEditorOpen(true);
  };

  const openEdit = (news) => {
    setError("");
    setNotice("");
    setDraft({
      body: news.body || "",
      files: [],
      id: news.id,
      removeAttachmentIds: [],
      title: news.title || "",
    });
    setIsEditorOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    const payload = new FormData();
    payload.append("title", draft.title.trim());
    payload.append("body", draft.body.trim());
    draft.files.forEach((file) => payload.append("files", file));
    if (draft.id) {
      payload.append("removeAttachmentIds", JSON.stringify(draft.removeAttachmentIds));
    }

    try {
      const savedNews = draft.id
        ? await updateCombatTrainingNews(draft.id, payload)
        : await createCombatTrainingNews(payload);
      setNewsItems((currentItems) =>
        draft.id
          ? currentItems.map((item) => (item.id === savedNews.id ? savedNews : item))
          : [savedNews, ...currentItems]
      );
      closeEditor();
      setNotice(draft.id ? "Публикация изменена." : "Публикация добавлена.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось сохранить публикацию."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (news) => {
    if (!window.confirm(`Удалить публикацию «${news.title}»?`)) return;
    setError("");
    setNotice("");
    try {
      await deleteCombatTrainingNews(news.id);
      setNewsItems((currentItems) => currentItems.filter((item) => item.id !== news.id));
      setNotice("Публикация удалена.");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось удалить публикацию."));
    }
  };

  const handleLike = async (newsId) => {
    try {
      const likeState = await toggleCombatTrainingNewsLike(newsId);
      setNewsItems((currentItems) =>
        currentItems.map((item) =>
          item.id === newsId ? { ...item, ...likeState } : item
        )
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Не удалось изменить отметку."));
    }
  };

  const toggleAttachmentRemoval = (attachmentId) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      removeAttachmentIds: currentDraft.removeAttachmentIds.includes(attachmentId)
        ? currentDraft.removeAttachmentIds.filter((id) => id !== attachmentId)
        : [...currentDraft.removeAttachmentIds, attachmentId],
    }));
  };

  const editedNews = draft.id
    ? newsItems.find((news) => news.id === draft.id)
    : null;

  return (
    <section className="module-panel combat-news">
      <header className="module-header combat-news__header">
        <h1>Күжүрмөн даярдоонун маалыматтары</h1>
        {isAdmin && (
          <button onClick={openCreate} type="button">+ Добавить информацию</button>
        )}
      </header>

      {notice && <p className="dashboard-notice">{notice}</p>}
      {error && <p className="dashboard-error">{error}</p>}

      {loading ? (
        <p className="dashboard-state">Загрузка публикаций...</p>
      ) : newsItems.length === 0 ? (
        <p className="dashboard-state">Публикаций пока нет.</p>
      ) : (
        <div className="combat-news__feed">
          {newsItems.map((news) => (
            <article className="combat-news-card" key={news.id}>
              <header>
                <div>
                  <h2>{news.title}</h2>
                  <span>{news.authorName} · {formatDate(news.createdAt)}</span>
                </div>
                {isAdmin && (
                  <div className="combat-news-card__admin-actions">
                    <button onClick={() => openEdit(news)} type="button">Изменить</button>
                    <button onClick={() => handleDelete(news)} type="button">Удалить</button>
                  </div>
                )}
              </header>

              {news.body && <p className="combat-news-card__body">{news.body}</p>}

              {news.attachments?.length > 0 && (
                <div className="combat-news-card__attachments">
                  {news.attachments.map((attachment) => (
                    <figure className={`combat-news-attachment combat-news-attachment--${attachment.kind}`} key={attachment.id}>
                      {attachment.kind === "image" ? (
                        <img alt={attachment.originalName} src={attachment.fileUrl} />
                      ) : attachment.kind === "video" ? (
                        <video controls preload="metadata" src={attachment.fileUrl} />
                      ) : attachment.kind === "audio" ? (
                        <audio controls preload="metadata" src={attachment.fileUrl} />
                      ) : attachment.kind === "pdf" ? (
                        <iframe src={attachment.fileUrl} title={attachment.originalName} />
                      ) : null}
                      <figcaption>
                        <a href={attachment.fileUrl} rel="noreferrer" target="_blank">
                          {attachment.originalName}
                        </a>
                        <span>{formatFileSize(attachment.size)}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}

              <footer>
                <button
                  aria-pressed={news.isLiked}
                  className={news.isLiked ? "is-liked" : ""}
                  onClick={() => handleLike(news.id)}
                  type="button"
                >
                  👍 {news.likeCount}
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}

      {isEditorOpen && (
        <div className="combat-journal-dialog" role="dialog" aria-modal="true">
          <form className="combat-journal-dialog__panel combat-news-editor" onSubmit={handleSubmit}>
            <h2>{draft.id ? "Изменить публикацию" : "Добавить информацию"}</h2>
            <label>
              Заголовок
              <input
                autoFocus
                disabled={submitting}
                maxLength={255}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                required
                value={draft.title}
              />
            </label>
            <label>
              Текст
              <textarea
                disabled={submitting}
                onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
                rows={7}
                value={draft.body}
              />
            </label>
            {editedNews?.attachments?.length > 0 && (
              <div className="combat-news-editor__existing-files">
                <strong>Загруженные файлы</strong>
                {editedNews.attachments.map((attachment) => (
                  <label key={attachment.id}>
                    <input
                      checked={draft.removeAttachmentIds.includes(attachment.id)}
                      onChange={() => toggleAttachmentRemoval(attachment.id)}
                      type="checkbox"
                    />
                    Удалить {attachment.originalName}
                  </label>
                ))}
              </div>
            )}
            <label>
              Файлы (до 10 файлов, каждый до 100 МБ)
              <input
                accept={ACCEPTED_FILES}
                disabled={submitting}
                multiple
                onChange={(event) => setDraft((current) => ({ ...current, files: Array.from(event.target.files || []) }))}
                type="file"
              />
            </label>
            <div className="combat-journal-dialog__actions">
              <button disabled={submitting} onClick={closeEditor} type="button">Отмена</button>
              <button disabled={submitting || !draft.title.trim()} type="submit">
                {submitting ? "Сохранение..." : "Опубликовать"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
