import React, { useEffect, useRef, useState } from "react";

const MODULE_TITLE = "Күжүрмөн даярдоонун 1 айга иш-чараларынын пландоосу";
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

export default function CombatTrainingPlan({ user }) {
  const storageKey = `combat-training-plan-sections:${user?.id || "current"}`;
  const [sections, setSections] = useState(() => {
    try {
      const storedSections = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
      return Array.isArray(storedSections) ? storedSections : [];
    } catch {
      return [];
    }
  });
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
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(sections));
    } catch {
      // Created sections remain available for the current session.
    }
  }, [sections, storageKey]);

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

  const handleCreate = (event) => {
    event.preventDefault();
    const title = draftTitle.trim();

    if (!title) {
      setError("Разделдин аталышын жазыңыз.");
      return;
    }

    setSections((currentSections) => {
      if (editingSectionId !== null) {
        return currentSections.map((section) =>
          section.id === editingSectionId ? { ...section, title } : section
        );
      }

      return [
        ...currentSections,
        {
          id: `${Date.now()}-${currentSections.length}`,
          title,
          days: createEmptyDays(),
        },
      ];
    });
    closeCreateDialog();
  };

  const handleDelete = (section) => {
    if (!window.confirm(`«${section.title}» бөлүмүн өчүрөсүзбү?`)) return;

    setSections((currentSections) =>
      currentSections.filter((currentSection) => currentSection.id !== section.id)
    );
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
          <button onClick={handleSend} type="button">
            Жөнөтүү
          </button>
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
            value={selectedSection.commanderTitle || ""}
          />
          <div className="combat-training-plan__signature-row">
            <input
              onChange={(event) =>
                updateSelectedSection({ commanderRank: event.target.value })
              }
              placeholder="полковник"
              value={selectedSection.commanderRank || ""}
            />
            <button
              className="combat-training-plan__signature-button"
              onClick={openSignatureDialog}
              type="button"
            >
              {selectedSection.signature ? (
                <img alt="Кол тамга" src={selectedSection.signature} />
              ) : (
                <span>кол тамга</span>
              )}
            </button>
            <input
              onChange={(event) =>
                updateSelectedSection({ commanderName: event.target.value })
              }
              placeholder="ФИО"
              value={selectedSection.commanderName || ""}
            />
          </div>
        </div>

        {isSignatureDialogOpen && (
          <div
            aria-labelledby="combat-plan-signature-title"
            aria-modal="true"
            className="combat-journal-dialog"
            role="dialog"
          >
            <div className="combat-journal-dialog__panel combat-training-plan__signature-dialog">
              <h2 id="combat-plan-signature-title">Кол тамга</h2>
              <canvas
                height="300"
                onPointerDown={handleSignatureStart}
                onPointerLeave={handleSignatureEnd}
                onPointerMove={handleSignatureMove}
                onPointerUp={handleSignatureEnd}
                ref={signatureCanvasRef}
                width="860"
              />
              <div className="combat-journal-dialog__actions">
                <button onClick={clearSignature} type="button">
                  Тазалоо
                </button>
                <button onClick={() => setIsSignatureDialogOpen(false)} type="button">
                  Жокко чыгаруу
                </button>
                <button onClick={saveSignature} type="button">
                  Сактоо
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="module-panel combat-training-plan">
      <header className="module-header">
        <div>
          <h1>{MODULE_TITLE}</h1>
        </div>
        <button onClick={openCreateDialog} type="button">
          Түзүү
        </button>
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
              <div className="combat-training-plan__section-actions">
                <button onClick={() => openEditDialog(section)} type="button">
                  Өзгөртүү
                </button>
                <button onClick={() => handleDelete(section)} type="button">
                  Өчүрүү
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="dashboard-state">Иш планы азырынча түзүлө элек.</p>
      )}

      {isCreateDialogOpen && (
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
