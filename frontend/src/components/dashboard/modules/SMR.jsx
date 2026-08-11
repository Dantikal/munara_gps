import React, { useEffect, useState } from "react";

import {
  createMethodicalDocument,
  createMethodicalSubject,
  deleteMethodicalDocument,
  deleteMethodicalSubject,
  getMethodicalDocuments,
  getMethodicalSubjects,
  updateMethodicalSubject,
} from "../../../api/dashboard.js";

const SECTION_TITLE = "Күжүрмөн даярдоо боюнча усулдук колдонмолор";
const DEFAULT_COLLECTION = "methodical_manuals";

export default function SMR({
  allowTextMaterials = true,
  collection = DEFAULT_COLLECTION,
  data,
  onBack,
  user,
}) {
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
  const [materialMode, setMaterialMode] = useState(
    allowTextMaterials ? "text" : "file"
  );
  const [activeDocument, setActiveDocument] = useState(null);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    setSubjects(data?.subjects || []);
  }, [data?.subjects]);

  useEffect(() => {
    let isCurrent = true;

    getMethodicalSubjects(collection)
      .then((items) => {
        if (isCurrent) setSubjects(items);
      })
      .catch(() => {
        if (isCurrent) {
          setError("Материалдардын тизмесин жүктөө мүмкүн болгон жок.");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [collection]);

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
        if (isCurrent) setError("Документтердин тизмесин жүктөө мүмкүн болгон жок.");
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
      setError("Предметтин аталышын көрсөтүңүз.");
      return;
    }

    resetMessages();
    setIsSubmitting(true);

    try {
      const createdSubject = await createMethodicalSubject({
        collection,
        order: subjects.length + 1,
        title,
      });
      setSubjects((currentSubjects) => [...currentSubjects, createdSubject]);
      setNewTitle("");
      setNotice("Предмет түзүлдү.");
    } catch {
      setError("Предметти түзүү мүмкүн болгон жок.");
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
      setError("Предметтин аталышын көрсөтүңүз.");
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
      setNotice("Предмет өзгөртүлдү.");
    } catch {
      setError("Предметти өзгөртүү мүмкүн болгон жок.");
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
      setNotice("Предмет өчүрүлдү.");
    } catch {
      setError("Предметти өчүрүү мүмкүн болгон жок.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setDocumentTitle("");
    setDocumentFile(null);
    setDocumentText("");
    setMaterialMode(allowTextMaterials ? "text" : "file");
  };

  const handleDocumentCreate = async (event) => {
    event.preventDefault();
    const title = documentTitle.trim();
    if (!title || (materialMode === "text" ? !documentText.trim() : !documentFile)) {
      setError(
        materialMode === "text"
          ? "Аталышын көрсөтүп, материалдын текстин жазыңыз."
          : "Аталышын көрсөтүп, файлды тандаңыз."
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
      setNotice("Документ түзүлдү.");
    } catch (requestError) {
      const fileError = requestError.response?.data?.file;
      setError(
        (Array.isArray(fileError) ? fileError[0] : fileError) ||
          "Документти жүктөө мүмкүн болгон жок. Файлды текшерип, кайра аракет кылыңыз."
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
      setNotice("Документ өчүрүлдү.");
    } catch {
      setError("Документти өчүрүү мүмкүн болгон жок.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaterialDownload = async (material) => {
    if (!material) return;

    if (material.fileUrl) {
      try {
        const response = await fetch(material.fileUrl);
        if (!response.ok) throw new Error("Download failed");
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = material.originalName || material.title;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(objectUrl);
      } catch {
        setError("Материалды жүктөп алуу мүмкүн болгон жок.");
      }
      return;
    }

    const blob = new Blob([material.content || ""], {
      type: "text/plain;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${material.title || "material"}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
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
          Браузериңиз видеону ойнотууну колдобойт.
        </video>
      );
    }
    if (activeDocument.kind === "audio") {
      return (
        <audio className="methodical-media methodical-media--audio" controls preload="metadata">
          <source src={activeDocument.fileUrl} />
          Браузериңиз аудиону ойнотууну колдобойт.
        </audio>
      );
    }
    return (
      <div className="methodical-file-download">
        <p>Бул файлды ачууга же жүктөп алууга болот.</p>
        <a href={activeDocument.fileUrl} rel="noreferrer" target="_blank">
          Файлды ачуу
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
          <div>
            <h1>{activeDocument.title}</h1>
            <span>{activeDocument.originalName || "Текстовый материал"}</span>
          </div>
          <button
            className="methodical-document-download"
            onClick={() => handleMaterialDownload(activeDocument)}
            type="button"
          >
            Жүктөп алуу
          </button>
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
                  Кошуу
                </button>
              </div>
            )}

            {notice && <p className="dashboard-notice">{notice}</p>}
            {error && <p className="dashboard-error">{error}</p>}

            {documentsLoading ? (
              <p className="dashboard-state">Документтер жүктөлүүдө...</p>
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
                    <div className="methodical-document-actions">
                      <button
                        className="methodical-document-download methodical-document-download--compact"
                        onClick={() => handleMaterialDownload(document)}
                        type="button"
                      >
                        Жүктөп алуу
                      </button>
                      {isAdmin && (
                        <button
                          className="methodical-document-delete"
                          disabled={isSubmitting}
                          onClick={() => handleDocumentDelete(document)}
                          type="button"
                        >
                          Өчүрүү
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="dashboard-state">Документтер азырынча жок.</p>
            )}

            {isCreateDialogOpen && (
              <div className="combat-journal-dialog" role="dialog" aria-modal="true">
                <form className="combat-journal-dialog__panel" onSubmit={handleDocumentCreate}>
                  <h2>Материал кошуу</h2>
                  <label>
                    Аталышы
                    <input
                      autoFocus
                      disabled={isSubmitting}
                      onChange={(event) => setDocumentTitle(event.target.value)}
                      required
                      value={documentTitle}
                    />
                  </label>
                  <label>
                    Материалдын түрү
                    <select
                      disabled={isSubmitting}
                      onChange={(event) => {
                        setMaterialMode(event.target.value);
                        setDocumentFile(null);
                        setDocumentText("");
                      }}
                      value={materialMode}
                    >
                      {allowTextMaterials ? <option value="text">Текст</option> : null}
                      <option value="file">Файл, PDF, сүрөт, видео жана башкалар</option>
                    </select>
                  </label>
                  {materialMode === "text" ? (
                    <label>
                      Материалдын тексти
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
                      Жокко чыгаруу
                    </button>
                    <button disabled={isSubmitting} type="submit">
                      {isSubmitting ? "Жүктөлүүдө..." : "Кошуу"}
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
      {onBack ? (
        <button className="module-back-button" onClick={onBack} type="button">
          Артка
        </button>
      ) : null}
      <header>
        <h1>{data?.title || SECTION_TITLE}</h1>
      </header>

      {isAdmin && (
        <form className="methodical-subject-form" onSubmit={handleCreate}>
          <label>
            Предметтин аталышы
            <input
              disabled={isSubmitting}
              onChange={(event) => setNewTitle(event.target.value)}
              value={newTitle}
            />
          </label>
          <button disabled={isSubmitting} type="submit">
            Кошуу
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
                          Сактоо
                        </button>
                        <button
                          disabled={isSubmitting}
                          onClick={handleEditCancel}
                          type="button"
                        >
                          Жокко чыгаруу
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          disabled={isSubmitting}
                          onClick={() => handleEditStart(subject)}
                          type="button"
                        >
                          Өзгөртүү
                        </button>
                        <button
                          disabled={isSubmitting}
                          onClick={() => handleDelete(subject)}
                          type="button"
                        >
                          Өчүрүү
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
        <p className="dashboard-state">Предметтер азырынча жок.</p>
      )}
    </section>
  );
}
