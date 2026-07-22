import React, { useEffect, useRef, useState } from "react";

import {
  createCombatTrainingPlan,
  deleteCombatTrainingPlan,
  getCombatTrainingPlans,
  updateCombatTrainingPlan,
} from "../../../api/dashboard.js";
import { getApiErrorMessage } from "../../../api/errors.js";

const MODULE_TITLE = "Күжүрмөн даярдоонун пландалган иш-чаралары";
const DEFAULT_PLAN_TITLE =
  "2028 аскер болугунун ойронду чек ара заставасынын башчысынын кужурмон даярдоо боюнча орун басарынын 2026-жылдын февраль айына иш планы";
const WEEKDAYS = [
  "Дүйшөмбү",
  "Шейшемби",
  "Шаршемби",
  "Бейшемби",
  "Жума",
  "Ишемби",
  "Жекшемби",
];
const ENTRIES_PER_DAY = 5;

const createEmptyEntries = () =>
  Array.from({ length: ENTRIES_PER_DAY }, () => ({
    number: "",
    text: "",
    startTime: "",
    endTime: "",
  }));

const createEmptyDays = () =>
  WEEKDAYS.map((name) => ({ name, entries: createEmptyEntries() }));

const createEmptyPlanRows = () =>
  Array.from({ length: 10 }, (_, index) => ({
    number: index + 1,
    activity: "",
    date: "",
    startTime: "",
    endTime: "",
    note: "",
  }));

const getPlanRows = (section) =>
  Array.isArray(section?.planRows) && section.planRows.length > 0
    ? section.planRows
    : createEmptyPlanRows();

const getSectionDays = (section) =>
  WEEKDAYS.map((name, dayIndex) => {
    const storedDay = section?.days?.[dayIndex];
    const storedEntries = Array.isArray(storedDay?.entries)
      ? storedDay.entries
      : [{ number: storedDay?.number ?? "", text: storedDay?.text ?? "" }];

    return {
      name,
      entries: Array.from({ length: ENTRIES_PER_DAY }, (_, entryIndex) => ({
        number: storedEntries[entryIndex]?.number ?? "",
        text: storedEntries[entryIndex]?.text ?? "",
        startTime: storedEntries[entryIndex]?.startTime ?? "",
        endTime: storedEntries[entryIndex]?.endTime ?? "",
      })),
    };
  });

export default function CombatTrainingPlan({ user, title = MODULE_TITLE, layout = "plan" }) {
  const isAdmin = user?.role === "admin";
  const hasLoadedSectionsRef = useRef(false);
  const [sections, setSections] = useState([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [draftTitle, setDraftTitle] = useState(DEFAULT_PLAN_TITLE);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const signatureCanvasRef = useRef(null);
  const isDrawingSignatureRef = useRef(false);

  useEffect(() => {
    let isActive = true;
    hasLoadedSectionsRef.current = false;
    getCombatTrainingPlans(layout)
      .then((items) => {
        if (isActive) {
          setSections(Array.isArray(items) ? items : []);
          hasLoadedSectionsRef.current = true;
        }
      })
      .catch((requestError) => {
        if (isActive) {
          setError(getApiErrorMessage(requestError, "Иш планын жүктөө мүмкүн болгон жок."));
          hasLoadedSectionsRef.current = true;
        }
      });
    return () => {
      isActive = false;
    };
  }, [layout]);

  useEffect(() => {
    if (!isAdmin || !hasLoadedSectionsRef.current || sections.length === 0) return undefined;

    const saveTimer = window.setTimeout(() => {
      sections.forEach((section) => {
        const { id, title: sectionTitle, layout: sectionLayout, createdAt, updatedAt, ...data } = section;
        updateCombatTrainingPlan(id, { data }).catch(() => {
          setError("Таблицаны серверге сактоо мүмкүн болгон жок.");
        });
      });
    }, 500);
    return () => window.clearTimeout(saveTimer);
  }, [isAdmin, sections]);

  const selectedSection = sections.find(
    (section) => section.id === selectedSectionId
  );

  const openCreateDialog = () => {
    setEditingSectionId(null);
    setDraftTitle(DEFAULT_PLAN_TITLE);
    setError("");
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (section) => {
    setEditingSectionId(section.id);
    setDraftTitle(section.title);
    setError("");
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingSectionId(null);
    setError("");
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!isAdmin) return;
    const title = draftTitle.trim();

    if (!title) {
      setError("Разделдин аталышын жазыңыз.");
      return;
    }

    try {
      if (editingSectionId !== null) {
        const updatedSection = await updateCombatTrainingPlan(editingSectionId, { title });
        setSections((currentSections) => currentSections.map((section) =>
          section.id === editingSectionId ? updatedSection : section
        ));
      } else {
        const createdSection = await createCombatTrainingPlan({
          title,
          layout,
          data: layout === "plan"
            ? { planRows: createEmptyPlanRows() }
            : { days: createEmptyDays() },
        });
        setSections((currentSections) => [...currentSections, createdSection]);
      }
      closeCreateDialog();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Иш планын сактоо мүмкүн болгон жок."));
    }
  };

  const handleDelete = async (section) => {
    if (!isAdmin) return;
    if (!window.confirm(`«${section.title}» бөлүмүн өчүрөсүзбү?`)) return;

    try {
      await deleteCombatTrainingPlan(section.id);
      setSections((currentSections) =>
        currentSections.filter((currentSection) => currentSection.id !== section.id)
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Иш планын өчүрүү мүмкүн болгон жок."));
    }
  };

  const handleDayChange = (dayIndex, entryIndex, field, value) => {
    setSections((currentSections) =>
      currentSections.map((section) => {
        if (section.id !== selectedSectionId) return section;

        const days = getSectionDays(section);
        days[dayIndex].entries[entryIndex] = {
          ...days[dayIndex].entries[entryIndex],
          [field]: value,
        };
        return { ...section, days };
      })
    );
  };

  const handlePlanRowChange = (rowIndex, field, value) => {
    setSections((currentSections) =>
      currentSections.map((section) => {
        if (section.id !== selectedSectionId) return section;

        const planRows = getPlanRows(section).map((row, index) =>
          index === rowIndex ? { ...row, [field]: value } : row
        );
        return { ...section, planRows };
      })
    );
  };

  const handleSend = () => {
    setSections((currentSections) =>
      currentSections.map((section) =>
        section.id === selectedSectionId
          ? { ...section, sentAt: new Date().toISOString() }
          : section
      )
    );
    setNotice("Иш планы ийгиликтүү жөнөтүлдү.");
  };

  const updateSelectedSection = (changes) => {
    setSections((currentSections) =>
      currentSections.map((section) =>
        section.id === selectedSectionId ? { ...section, ...changes } : section
      )
    );
  };

  const getSignaturePoint = (event) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleSignatureStart = (event) => {
    const canvas = signatureCanvasRef.current;
    const point = getSignaturePoint(event);
    if (!canvas || !point) return;

    event.preventDefault();
    const context = canvas.getContext("2d");
    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111";
    context.beginPath();
    context.moveTo(point.x, point.y);
    isDrawingSignatureRef.current = true;
  };

  const handleSignatureMove = (event) => {
    if (!isDrawingSignatureRef.current) return;
    const canvas = signatureCanvasRef.current;
    const point = getSignaturePoint(event);
    if (!canvas || !point) return;

    event.preventDefault();
    const context = canvas.getContext("2d");
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const handleSignatureEnd = () => {
    isDrawingSignatureRef.current = false;
  };

  const loadSignature = (signature) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!signature) return;

    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = signature;
  };

  const openSignatureDialog = () => {
    setIsSignatureDialogOpen(true);
    window.requestAnimationFrame(() => loadSignature(selectedSection?.signature || ""));
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    updateSelectedSection({ signature: canvas.toDataURL("image/png") });
    setIsSignatureDialogOpen(false);
  };

  if (selectedSection) {
    if (layout === "plan") {
      const planRows = getPlanRows(selectedSection);

      return (
        <section className="module-panel combat-training-plan">
          <button
            className="module-back-button"
            onClick={() => setSelectedSectionId(null)}
            type="button"
          >
            Артка
          </button>
          <header className="module-header">
            <div>
              <h1>{selectedSection.title}</h1>
            </div>
          </header>

          {notice && <p className="dashboard-notice">{notice}</p>}

          <div className="table-wrap">
            <table className="training-table">
              <colgroup>
                <col style={{width: "6%"}} />
                <col style={{width: "34%"}} />
                <col style={{width: "16%"}} />
                <col style={{width: "20%"}} />
                <col style={{width: "24%"}} />
              </colgroup>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Аткарылган иш-чаралары</th>
                  <th>Күнү</th>
                  <th>Убактысы</th>
                  <th>Эскертүү</th>
                </tr>
              </thead>
              <tbody>
                {planRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td>{row.number || rowIndex + 1}</td>
                    <td>
                      <textarea
                        aria-label={`${rowIndex + 1}: Аткарылган иш-чаралары`}
                        className="training-table-input training-table-input--textarea"
                        readOnly={!isAdmin}
                        onChange={(event) =>
                          handlePlanRowChange(rowIndex, "activity", event.target.value)
                        }
                        value={row.activity || ""}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`${rowIndex + 1}: Күнү`}
                        className="training-table-input"
                        readOnly={!isAdmin}
                        onChange={(event) =>
                          handlePlanRowChange(rowIndex, "date", event.target.value)
                        }
                        type="date"
                        value={row.date || ""}
                      />
                    </td>
                    <td>
                      <div className="combat-training-plan__time-fields">
                        <label>
                          <span>Башталыш убактысы</span>
                          <input
                            aria-label={`${rowIndex + 1}: Башталыш убактысы`}
                            className="training-table-input"
                            readOnly={!isAdmin}
                            onChange={(event) =>
                              handlePlanRowChange(rowIndex, "startTime", event.target.value)
                            }
                            type="time"
                            value={row.startTime || ""}
                          />
                        </label>
                        <label>
                          <span>Аяктоо убактысы</span>
                          <input
                            aria-label={`${rowIndex + 1}: Аяктоо убактысы`}
                            className="training-table-input"
                            readOnly={!isAdmin}
                            onChange={(event) =>
                              handlePlanRowChange(rowIndex, "endTime", event.target.value)
                            }
                            type="time"
                            value={row.endTime || ""}
                          />
                        </label>
                      </div>
                    </td>
                    <td>
                      <textarea
                        aria-label={`${rowIndex + 1}: Эскертүү`}
                        className="training-table-input training-table-input--textarea combat-training-plan__note-input"
                        readOnly={!isAdmin}
                        onChange={(event) =>
                          handlePlanRowChange(rowIndex, "note", event.target.value)
                        }
                        rows={4}
                        value={row.note || ""}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    const days = getSectionDays(selectedSection);

    return (
      <section className="module-panel combat-training-plan">
        <button
          className="module-back-button"
          onClick={() => setSelectedSectionId(null)}
          type="button"
        >
          Артка
        </button>
        <header className="module-header">
          <div>
            <h1>{selectedSection.title}</h1>
          </div>
        </header>

        {notice && <p className="dashboard-notice">{notice}</p>}

        <div className="combat-training-plan__calendar-wrap">
          <div className="combat-training-plan__calendar">
            {days.map((day, index) => (
              <div className="combat-training-plan__day" key={day.name}>
                <strong>{day.name}</strong>
                {day.entries.map((entry, entryIndex) => (
                  <div className="combat-training-plan__day-entry" key={entryIndex}>
                    <label>
                      <span>Күнү</span>
                      <input
                        aria-label={`${day.name}, ${entryIndex + 1}: күнү`}
                        max="31"
                        min="1"
                        readOnly={!isAdmin}
                        onChange={(event) =>
                          handleDayChange(
                            index,
                            entryIndex,
                            "number",
                            event.target.value
                          )
                        }
                        placeholder="—"
                        type="number"
                        value={entry.number}
                      />
                    </label>
                    <label>
                      <span>Аткаруучу иштин кыскача аталышы</span>
                      <textarea
                        aria-label={`${day.name}, ${entryIndex + 1}: аткаруучу иштин кыскача аталышы`}
                        onChange={(event) =>
                          handleDayChange(
                            index,
                            entryIndex,
                            "text",
                            event.target.value
                          )
                        }
                        placeholder="Маалымат киргизиңиз"
                        readOnly={!isAdmin}
                        value={entry.text}
                      />
                    </label>
                    <div className="combat-training-plan__time-fields">
                      <label>
                        <span>Башталыш убактысы</span>
                        <input
                          aria-label={`${day.name}, ${entryIndex + 1}: башталыш убактысы`}
                          onChange={(event) =>
                            handleDayChange(
                              index,
                              entryIndex,
                              "startTime",
                              event.target.value
                            )
                          }
                          type="time"
                          readOnly={!isAdmin}
                          value={entry.startTime}
                        />
                      </label>
                      <label>
                        <span>Аяктоо убактысы</span>
                        <input
                          aria-label={`${day.name}, ${entryIndex + 1}: аяктоо убактысы`}
                          onChange={(event) =>
                            handleDayChange(
                              index,
                              entryIndex,
                              "endTime",
                              event.target.value
                            )
                          }
                          type="time"
                          readOnly={!isAdmin}
                          value={entry.endTime}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="combat-training-plan__signature-block">
          <input
            onChange={(event) =>
              updateSelectedSection({ commanderTitle: event.target.value })
            }
            placeholder="2026 аскер бөлүгүнүн командири"
            readOnly={!isAdmin}
            value={selectedSection.commanderTitle || ""}
          />
          <div className="combat-training-plan__signature-row">
            <input
              onChange={(event) =>
                updateSelectedSection({ commanderRank: event.target.value })
              }
              placeholder="полковник"
              readOnly={!isAdmin}
              value={selectedSection.commanderRank || ""}
            />
            <input
              onChange={(event) =>
                updateSelectedSection({ commanderName: event.target.value })
              }
              placeholder="ФИО"
              readOnly={!isAdmin}
              value={selectedSection.commanderName || ""}
            />
          </div>
        </div>

      </section>
    );
  }

  return (
    <section className="module-panel combat-training-plan">
      <header className="module-header">
        <div>
          <h1>{title}</h1>
        </div>
        {isAdmin && (
          <button onClick={openCreateDialog} type="button">
            Түзүү
          </button>
        )}
      </header>

      {sections.length > 0 ? (
        <div className="module-grid module-section-grid">
          {sections.map((section) => (
            <article className="combat-training-plan__section-card" key={section.id}>
              <button
                className="module-metric module-section-card combat-training-plan__section"
                onClick={() => {
                  setNotice("");
                  setSelectedSectionId(section.id);
                }}
                type="button"
              >
                <strong>{section.title}</strong>
              </button>
              {isAdmin && (
                <div className="combat-training-plan__section-actions">
                  <button onClick={() => openEditDialog(section)} type="button">
                    Өзгөртүү
                  </button>
                  <button onClick={() => handleDelete(section)} type="button">
                    Өчүрүү
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="dashboard-state">Иш планы азырынча түзүлө элек.</p>
      )}

      {isAdmin && isCreateDialogOpen && (
        <div
          aria-labelledby="combat-training-plan-create-title"
          aria-modal="true"
          className="combat-journal-dialog"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateDialog();
          }}
          role="dialog"
        >
          <form className="combat-journal-dialog__panel" onSubmit={handleCreate}>
            <h2 id="combat-training-plan-create-title">
              {editingSectionId !== null ? "Бөлүмдү өзгөртүү" : "Жаңы бөлүм түзүү"}
            </h2>
            <label>
              Бөлүмдүн аталышы
              <textarea
                autoFocus
                onChange={(event) => setDraftTitle(event.target.value)}
                value={draftTitle}
              />
            </label>
            {error && <p className="dashboard-error">{error}</p>}
            <div className="combat-journal-dialog__actions">
              <button onClick={closeCreateDialog} type="button">
                Жокко чыгаруу
              </button>
              <button type="submit">
                {editingSectionId !== null ? "Сактоо" : "Түзүү"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
