import React, { useEffect, useState } from "react";

import {
  createMethodicalDocument,
  createMethodicalSubject,
  deleteMethodicalDocument,
  deleteMethodicalSubject,
  getMethodicalDocuments,
  updateMethodicalSubject,
} from "../../../api/dashboard.js";

const SECTION_TITLE = "Күжүрмөн даярдоо боюнча усулдук колдонмолор";

export default function SMR({ data, user }) {
  const [subjects, setSubjects] = useState(data?.subjects || []);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [documentText, setDocumentText] = useState("");
  const [materialMode, setMaterialMode] = useState("text");
  const [activeDocument, setActiveDocument] = useState(null);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    setSubjects(data?.subjects || []);
  }, [data?.subjects]);

  useEffect(() => {
    if (
      selectedSubjectId !== null &&
      !subjects.some((subject) => subject.id === selectedSubjectId)
    ) {
      setSelectedSubjectId(null);
    }
  }, [selectedSubjectId, subjects]);

  const selectedSubject = subjects.find(
    (subject) => subject.id === selectedSubjectId
  );

  useEffect(() => {
    if (!selectedSubject) {
      setDocuments([]);
      setActiveDocument(null);
      return;
    }

    let isCurrent = true;
    setDocumentsLoading(true);
    setError("");
    getMethodicalDocuments(selectedSubject.id)
      .then((items) => {
        if (isCurrent) setDocuments(items);
      })
      .catch(() => {
        if (isCurrent) setError("Не удалось загрузить список документов.");
      })
      .finally(() => {
        if (isCurrent) setDocumentsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedSubject?.id]);

  const resetMessages = () => {
    setNotice("");
    setError("");
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    const title = newTitle.trim();

    if (!title) {
      setError("Укажите название предмета.");
      return;
    }

    resetMessages();
    setIsSubmitting(true);

    try {
      const createdSubject = await createMethodicalSubject({
        order: subjects.length + 1,
        title,
      });
      setSubjects((currentSubjects) => [...currentSubjects, createdSubject]);
      setNewTitle("");
      setNotice("Предмет создан.");
    } catch {
      setError("Не удалось создать предмет.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStart = (subject) => {
    resetMessages();
    setEditingId(subject.id);
    setEditingTitle(subject.title);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const handleUpdate = async (subject) => {
    const title = editingTitle.trim();

    if (!title) {
      setError("Укажите название предмета.");
      return;
    }

    resetMessages();
    setIsSubmitting(true);

    try {
      const updatedSubject = await updateMethodicalSubject(subject.id, { title });
      setSubjects((currentSubjects) =>
        currentSubjects.map((currentSubject) =>
          currentSubject.id === subject.id ? updatedSubject : currentSubject
        )
      );
      setEditingId(null);
      setEditingTitle("");
      setNotice("Предмет изменен.");
    } catch {
      setError("Не удалось изменить предмет.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (subject) => {
    resetMessages();
    setIsSubmitting(true);

    try {
      await deleteMethodicalSubject(subject.id);
      setSubjects((currentSubjects) =>
        currentSubjects.filter((currentSubject) => currentSubject.id !== subject.id)
      );
      setNotice("Предмет удален.");
    } catch {
      setError("Не удалось удалить предмет.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setDocumentTitle("");
    setDocumentFile(null);
    setDocumentText("");
    setMaterialMode("text");
  };

  const handleDocumentCreate = async (event) => {
    event.preventDefault();
    const title = documentTitle.trim();
    if (!title || (materialMode === "text" ? !documentText.trim() : !documentFile)) {
      setError(
        materialMode === "text"
          ? "Укажите название и введите текст материала."
          : "Укажите название и выберите файл."
      );
      return;
    }

    resetMessages();
    setIsSubmitting(true);
    const payload = new FormData();
    payload.append("title", title);
    if (materialMode === "text") {
      payload.append("content", documentText.trim());
    } else {
      payload.append("file", documentFile);
    }

    try {
      const createdDocument = await createMethodicalDocument(selectedSubject.id, payload);
      setDocuments((currentDocuments) => [createdDocument, ...currentDocuments]);
      closeCreateDialog();
      setNotice("Документ создан.");
    } catch (requestError) {
      const fileError = requestError.response?.data?.file;
      setError(
        (Array.isArray(fileError) ? fileError[0] : fileError) ||
          "Не удалось загрузить документ. Проверьте файл и повторите попытку."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocumentDelete = async (document) => {
    resetMessages();
    setIsSubmitting(true);
    try {
      await deleteMethodicalDocument(selectedSubject.id, document.id);
      setDocuments((currentDocuments) =>
        currentDocuments.filter((currentDocument) => currentDocument.id !== document.id)
      );
      if (activeDocument?.id === document.id) setActiveDocument(null);
      setNotice("Документ удален.");
    } catch {
      setError("Не удалось удалить документ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderActiveMaterial = () => {
    if (activeDocument.kind === "text") {
      return <div className="methodical-text-content">{activeDocument.content}</div>;
    }
    if (activeDocument.kind === "docx" && activeDocument.previewHtml) {
      return (
        <article
          className="docx-preview methodical-document-page__content"
          dangerouslySetInnerHTML={{ __html: activeDocument.previewHtml }}
        />
      );
    }
    if (activeDocument.kind === "pdf") {
      return (
        <iframe
          className="methodical-media methodical-media--pdf"
          src={activeDocument.fileUrl}
          title={activeDocument.title}
        />
      );
    }
    if (activeDocument.kind === "image") {
      return (
        <img
          alt={activeDocument.title}
          className="methodical-media methodical-media--image"
          src={activeDocument.fileUrl}
        />
      );
    }
    if (activeDocument.kind === "video") {
      return (
        <video className="methodical-media methodical-media--video" controls preload="metadata">
          <source src={activeDocument.fileUrl} />
          Ваш браузер не поддерживает воспроизведение видео.
        </video>
      );
    }
    if (activeDocument.kind === "audio") {
      return (
        <audio className="methodical-media methodical-media--audio" controls preload="metadata">
          <source src={activeDocument.fileUrl} />
          Ваш браузер не поддерживает воспроизведение аудио.
        </audio>
      );
    }
    return (
      <div className="methodical-file-download">
        <p>Этот файл можно открыть или скачать.</p>
        <a href={activeDocument.fileUrl} rel="noreferrer" target="_blank">
          Открыть файл
        </a>
      </div>
    );
  };

  if (selectedSubject && activeDocument) {
    return (
      <section className="module-panel methodical-document-page">
        <button
          className="module-back-button"
          onClick={() => setActiveDocument(null)}
          type="button"
        >
          Артка
        </button>
        <header className="methodical-document-page__header">
          <h1>{activeDocument.title}</h1>
          <span>{activeDocument.originalName || "Текстовый материал"}</span>
        </header>
        {renderActiveMaterial()}
      </section>
    );
  }

  if (selectedSubject) {
    return (
      <section className="module-panel">
        <button
          className="module-back-button"
          onClick={() => setSelectedSubjectId(null)}
          type="button"
        >
          Артка
        </button>
        <header>
          <h1>{selectedSubject.title}</h1>
        </header>

        <>
            {isAdmin && (
              <div className="methodical-document-toolbar">
                <button onClick={() => setIsCreateDialogOpen(true)} type="button">
                  Создать
                </button>
              </div>
            )}

            {notice && <p className="dashboard-notice">{notice}</p>}
            {error && <p className="dashboard-error">{error}</p>}

            {documentsLoading ? (
              <p className="dashboard-state">Документы загружаются...</p>
            ) : documents.length > 0 ? (
              <div className="methodical-document-list">
                {documents.map((document) => (
                  <article className="methodical-document-card" key={document.id}>
                    <button
                      className="methodical-document-open"
                      onClick={() => setActiveDocument(document)}
                      type="button"
                    >
                      <span aria-hidden="true" className="module-document-icon" />
                      <span>
                        <strong>{document.title}</strong>
                        <small>{document.originalName || "Текстовый материал"}</small>
                      </span>
                    </button>
                    {isAdmin && (
                      <button
                        className="methodical-document-delete"
                        disabled={isSubmitting}
                        onClick={() => handleDocumentDelete(document)}
                        type="button"
                      >
                        Удалить
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="dashboard-state">Документов пока нет.</p>
            )}

            {isCreateDialogOpen && (
              <div className="combat-journal-dialog" role="dialog" aria-modal="true">
                <form className="combat-journal-dialog__panel" onSubmit={handleDocumentCreate}>
                  <h2>Добавить материал</h2>
                  <label>
                    Название
                    <input
                      autoFocus
                      disabled={isSubmitting}
                      onChange={(event) => setDocumentTitle(event.target.value)}
                      required
                      value={documentTitle}
                    />
                  </label>
                  <label>
                    Тип материала
                    <select
                      disabled={isSubmitting}
                      onChange={(event) => {
                        setMaterialMode(event.target.value);
                        setDocumentFile(null);
                        setDocumentText("");
                      }}
                      value={materialMode}
                    >
                      <option value="text">Текст</option>
                      <option value="file">Файл, PDF, фото, видео и другое</option>
                    </select>
                  </label>
                  {materialMode === "text" ? (
                    <label>
                      Текст материала
                      <textarea
                        disabled={isSubmitting}
                        onChange={(event) => setDocumentText(event.target.value)}
                        required
                        rows="10"
                        value={documentText}
                      />
                    </label>
                  ) : (
                    <label>
                      Файл
                      <input
                        accept=".doc,.docx,.pdf,.txt,.rtf,.odt,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp,.jpg,.jpeg,.png,.gif,.webp,.bmp,.mp4,.webm,.mov,.m4v,.avi,.mkv,.mp3,.wav,.ogg,.m4a,.aac,.flac,.zip,.rar,.7z"
                        disabled={isSubmitting}
                        onChange={(event) => setDocumentFile(event.target.files?.[0] || null)}
                        required
                        type="file"
                      />
                    </label>
                  )}
                  <div className="combat-journal-dialog__actions">
                    <button disabled={isSubmitting} onClick={closeCreateDialog} type="button">
                      Отмена
                    </button>
                    <button disabled={isSubmitting} type="submit">
                      {isSubmitting ? "Загрузка..." : "Создать"}
                    </button>
                  </div>
                </form>
              </div>
            )}
        </>
      </section>
    );
  }

  return (
    <section className="module-panel">
      <header>
        <h1>{data?.title || SECTION_TITLE}</h1>
      </header>

      {isAdmin && (
        <form className="methodical-subject-form" onSubmit={handleCreate}>
          <label>
            Название предмета
            <input
              disabled={isSubmitting}
              onChange={(event) => setNewTitle(event.target.value)}
              value={newTitle}
            />
          </label>
          <button disabled={isSubmitting} type="submit">
            Создать
          </button>
        </form>
      )}

      {notice && <p className="dashboard-notice">{notice}</p>}
      {error && <p className="dashboard-error">{error}</p>}

      {subjects.length > 0 ? (
        <div className="methodical-subject-list">
          {subjects.map((subject) => {
            const isEditing = editingId === subject.id;

            return (
              <article className="methodical-subject-card" key={subject.id}>
                {isEditing ? (
                  <input
                    disabled={isSubmitting}
                    onChange={(event) => setEditingTitle(event.target.value)}
                    value={editingTitle}
                  />
                ) : (
                  <button
                    className="methodical-subject-link"
                    onClick={() => setSelectedSubjectId(subject.id)}
                    type="button"
                  >
                    {subject.title}
                  </button>
                )}

                {isAdmin && (
                  <div className="methodical-subject-actions">
                    {isEditing ? (
                      <>
                        <button
                          disabled={isSubmitting}
                          onClick={() => handleUpdate(subject)}
                          type="button"
                        >
                          Сохранить
                        </button>
                        <button
                          disabled={isSubmitting}
                          onClick={handleEditCancel}
                          type="button"
                        >
                          Отмена
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          disabled={isSubmitting}
                          onClick={() => handleEditStart(subject)}
                          type="button"
                        >
                          Изменить
                        </button>
                        <button
                          disabled={isSubmitting}
                          onClick={() => handleDelete(subject)}
                          type="button"
                        >
                          Удалить
                        </button>
                      </>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="dashboard-state">Предметов пока нет.</p>
      )}
    </section>
  );
}
