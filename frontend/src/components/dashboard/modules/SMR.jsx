import React, { useEffect, useState } from "react";

import {
  createMethodicalSubject,
  deleteMethodicalSubject,
  updateMethodicalSubject,
} from "../../../api/dashboard.js";

const SECTION_TITLE = "Күжүрмөн даярдоо боюнча усулдук колдонмолор";

export default function SMR({ data, user }) {
  const [subjects, setSubjects] = useState(data?.subjects || []);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    setSubjects(data?.subjects || []);
  }, [data?.subjects]);

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
                  <strong>{subject.title}</strong>
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
