import React, { useEffect, useMemo, useState } from "react";

import Analytics from "./Analytics.jsx";
import { buildSubjectJournalTable } from "./CombatTrainingJournal.jsx";
import CombatTrainingResults, {
  createCustomTable,
  createKojTable,
  createLineTrainingTable,
  createPhysicalTrainingTable,
  createShootingTrainingTable,
} from "./CombatTrainingResults.jsx";
import Library, {
  buildLessonScheduleLikePhoto,
  buildThematicAccountLikePhoto,
} from "./Library.jsx";

const MEETING_SECTIONS = [
  { id: "thematic-account", title: "Сабактын тематикалык эсеби" },
  { id: "lesson-schedule", title: "Сабактардын жүгүртмөсү" },
  { id: "combat-training-journal", title: "Күжүрмөн даярдоону каттоо журналы" },
  { id: "observation", title: "Көзөмөл сабактары" },
  { id: "meeting-analysis", title: "Жыйындын талдоосу" },
];

const OBSERVATION_TEMPLATE_OPTIONS = [
  {
    id: "tpv",
    title: "ТПВ",
    createTable: createCustomTable,
  },
  {
    id: "ogp",
    title: "ОГП",
    createTable: createCustomTable,
  },
  {
    id: "fp",
    title: "ФП",
    createTable: createPhysicalTrainingTable,
  },
  {
    id: "spec",
    title: "СПЕЦ",
    createTable: createCustomTable,
  },
  {
    id: "tp",
    title: "ТП",
    createTable: createCustomTable,
  },
  {
    id: "op",
    title: "ОП",
    createTable: createShootingTrainingTable,
  },
  {
    id: "stp",
    title: "СТП",
    createTable: createLineTrainingTable,
  },
  {
    id: "ovu",
    title: "ОВУ",
    createTable: createCustomTable,
  },
  {
    id: "koj",
    title: "КОЖ",
    createTable: createKojTable,
  },
];

const LEGACY_OBSERVATION_TEMPLATE_IDS = {
  line: "stp",
  physical: "fp",
  shooting: "op",
};

const getObservationTemplate = (templateId) => {
  const normalizedTemplateId =
    LEGACY_OBSERVATION_TEMPLATE_IDS[templateId] || templateId;
  return OBSERVATION_TEMPLATE_OPTIONS.find(
    (option) => option.id === normalizedTemplateId
  ) || OBSERVATION_TEMPLATE_OPTIONS[0];
};

const getNestedSections = (section) =>
  section?.sections || section?.subsections || [];

const findSection = (sections, sectionId) => {
  for (const section of sections || []) {
    if (section?.id === sectionId) return section;
    const nestedSection = findSection(getNestedSections(section), sectionId);
    if (nestedSection) return nestedSection;
  }
  return null;
};

const getFirstTablePeriod = (section) =>
  (section?.periods || []).find((period) => period?.table) || null;

const createDocumentId = (sectionId) =>
  `meetings-${sectionId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function Meetings({ modules, user }) {
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [createSectionId, setCreateSectionId] = useState(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [observationTemplateId, setObservationTemplateId] = useState(
    OBSERVATION_TEMPLATE_OPTIONS[0].id
  );
  const [createError, setCreateError] = useState("");

  const meetingsScope =
    `${modules?.library?.scope || user?.role || "default"}:meetings`;
  const documentsStorageKey = `munara-meetings-documents:${meetingsScope}`;
  const legacyObservationStorageKey =
    `munara-meetings-observation-documents:${meetingsScope}`;
  const selectedSection = MEETING_SECTIONS.find(
    (section) => section.id === selectedSectionId
  );
  const sectionDocuments = documents.filter(
    (document) => document.sectionId === selectedSectionId
  );
  const activeDocument = documents.find(
    (document) => document.id === activeDocumentId
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const storedDocuments = JSON.parse(
        window.localStorage.getItem(documentsStorageKey) || "[]"
      );
      const legacyObservationDocuments = JSON.parse(
        window.localStorage.getItem(legacyObservationStorageKey) || "[]"
      );
      const normalizedDocuments = Array.isArray(storedDocuments)
        ? storedDocuments
        : [];
      const migratedObservationDocuments = Array.isArray(legacyObservationDocuments)
        ? legacyObservationDocuments.map((document) => ({
            ...document,
            sectionId: "observation",
          }))
        : [];
      const knownIds = new Set(normalizedDocuments.map((document) => document.id));
      const mergedDocuments = [
        ...normalizedDocuments,
        ...migratedObservationDocuments.filter(
          (document) => !knownIds.has(document.id)
        ),
      ];

      setDocuments(mergedDocuments);
      if (migratedObservationDocuments.length > 0) {
        window.localStorage.setItem(
          documentsStorageKey,
          JSON.stringify(mergedDocuments)
        );
        window.localStorage.removeItem(legacyObservationStorageKey);
      }
    } catch {
      setDocuments([]);
    }
  }, [documentsStorageKey, legacyObservationStorageKey]);

  const saveDocuments = (nextDocuments) => {
    setDocuments(nextDocuments);
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        documentsStorageKey,
        JSON.stringify(nextDocuments)
      );
    } catch {
      // The current session remains usable if browser storage is unavailable.
    }
  };

  const tableBySection = useMemo(() => {
    const librarySections = modules?.library?.sections || [];
    const thematicPeriod = getFirstTablePeriod(
      findSection(librarySections, "thematic-account")
    );
    const lessonSchedulePeriod = getFirstTablePeriod(
      findSection(librarySections, "lesson-schedule")
    );
    const thematicSource = thematicPeriod?.table || {
      title: "Сабактын тематикалык эсеби",
    };
    const lessonScheduleSource = lessonSchedulePeriod?.table || {
      title: "Сабактардын жүгүртмөсү",
      variant: "lesson-schedule",
    };

    return {
      "thematic-account": buildThematicAccountLikePhoto(
        thematicSource,
        false,
        thematicPeriod?.id || "period-1"
      ),
      "lesson-schedule": buildLessonScheduleLikePhoto(lessonScheduleSource),
      "combat-training-journal": buildSubjectJournalTable(
        "Өздүк курамдын күжүрмөн даярдоосун каттоо журналы",
        {
          enableCellColoring: true,
          hideDate: true,
        }
      ),
    };
  }, [modules?.library?.sections]);

  const openCreateDialog = (sectionId) => {
    setCreateSectionId(sectionId);
    setDocumentTitle("");
    setObservationTemplateId(OBSERVATION_TEMPLATE_OPTIONS[0].id);
    setCreateError("");
  };

  const handleCreateDocument = (event) => {
    event.preventDefault();
    const title = documentTitle.trim();
    if (!title) {
      setCreateError("Документтин аталышын жазыңыз.");
      return;
    }

    const document = {
      createdAt: new Date().toISOString(),
      id: createDocumentId(createSectionId),
      sectionId: createSectionId,
      templateId:
        createSectionId === "observation" ? observationTemplateId : null,
      title,
    };
    saveDocuments([document, ...documents]);
    setCreateSectionId(null);
    setDocumentTitle("");
    setCreateError("");
    setActiveDocumentId(document.id);
  };

  const handleRenameDocument = (document) => {
    const title = window.prompt("Документтин аталышы", document.title)?.trim();
    if (!title) return;

    saveDocuments(
      documents.map((item) =>
        item.id === document.id ? { ...item, title } : item
      )
    );

    if (typeof window !== "undefined") {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key?.includes(document.id) && key.endsWith(":title")) {
          window.localStorage.setItem(key, title);
        }
      }
      window.localStorage.setItem(
        `combat-training-results-custom-periods-${document.id}-title`,
        title
      );
    }
  };

  const handleDeleteDocument = (document) => {
    if (!window.confirm(`"${document.title}" өчүрүлсүнбү?`)) return;

    saveDocuments(documents.filter((item) => item.id !== document.id));
    if (activeDocumentId === document.id) setActiveDocumentId(null);

    if (typeof window !== "undefined") {
      const keysToDelete = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key?.includes(document.id)) keysToDelete.push(key);
      }
      keysToDelete.forEach((key) => window.localStorage.removeItem(key));
    }
  };

  if (activeDocument?.sectionId === "observation") {
    const template = getObservationTemplate(activeDocument.templateId);
    const subsectionId = `meetings-observation-${template.id}`;

    return (
      <CombatTrainingResults
        data={{
          directEditor: true,
          hideModuleHeader: true,
          hideResultSubmissionActions: true,
          initialObservationGroupId: "regional-unit",
          initialPeriodId: activeDocument.id,
          initialSectionId: "observation",
          initialSubsectionId: subsectionId,
          onBack: () => setActiveDocumentId(null),
          sections: [
            {
              id: "observation",
              title: "Көзөмөл сабактары",
              sections: [
                {
                  id: subsectionId,
                  title: template.title,
                  periods: [
                    {
                      id: activeDocument.id,
                      table: template.createTable(activeDocument.title),
                      title: activeDocument.title,
                    },
                  ],
                },
              ],
            },
          ],
          unitNumbers: modules?.combatTrainingResults?.unitNumbers || [],
        }}
        key={activeDocument.id}
        user={user}
      />
    );
  }

  if (activeDocument?.sectionId === "meeting-analysis") {
    return (
      <Analytics
        data={{
          directDocumentId: activeDocument.id,
          directDocumentTitle: activeDocument.title,
          directEditor: true,
          initialSectionId: "monthly-analysis",
          onBack: () => setActiveDocumentId(null),
          storageNamespace: `${meetingsScope}:${activeDocument.id}`,
        }}
        key={activeDocument.id}
        user={user}
      />
    );
  }

  if (activeDocument) {
    const template = tableBySection[activeDocument.sectionId];
    const table = template
      ? {
          ...template,
          title: activeDocument.title,
        }
      : null;

    return table ? (
      <Library
        data={{
          description: "",
          hideSubmit: true,
          id: activeDocument.id,
          scope: meetingsScope,
          table,
          title: activeDocument.title,
        }}
        key={activeDocument.id}
        onBack={() => setActiveDocumentId(null)}
      />
    ) : (
      <section className="module-panel">
        <button
          className="module-back-button"
          onClick={() => setActiveDocumentId(null)}
          type="button"
        >
          Артка
        </button>
        <p className="dashboard-state error">
          Таблицанын шаблону табылган жок.
        </p>
      </section>
    );
  }

  if (selectedSection) {
    return (
      <section className="module-panel">
        <button
          className="module-back-button"
          onClick={() => setSelectedSectionId(null)}
          type="button"
        >
          Артка
        </button>
        <header className="module-header">
          <h1>{selectedSection.title}</h1>
        </header>
        <div className="module-actions">
          <button
            className="module-action-button"
            onClick={() => openCreateDialog(selectedSection.id)}
            type="button"
          >
            + Создать
          </button>
        </div>
        {sectionDocuments.length > 0 ? (
          <div className="module-period-list">
            {sectionDocuments.map((document) => (
              <div className="module-period-row" key={document.id}>
                <button
                  className="module-period-card module-period-card--document"
                  onClick={() => setActiveDocumentId(document.id)}
                  type="button"
                >
                  <span aria-hidden="true" className="module-document-icon" />
                  <span className="module-submission-card__content">
                    <strong>{document.title}</strong>
                    {document.sectionId === "observation" ? (
                      <small>
                        Таблица как{" "}
                        {getObservationTemplate(document.templateId).title}
                      </small>
                    ) : null}
                  </span>
                </button>
                <div className="module-period-actions">
                  <button
                    onClick={() => handleRenameDocument(document)}
                    type="button"
                  >
                    Изменить
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(document)}
                    type="button"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="dashboard-state">Түзүлгөн документтер азырынча жок.</p>
        )}
        {createSectionId === selectedSection.id ? (
          <div
            className="lesson-period-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="meetings-create-title"
          >
            <form
              className="lesson-period-dialog__panel"
              onSubmit={handleCreateDocument}
            >
              <h2 id="meetings-create-title">{selectedSection.title}</h2>
              <label>
                Название
                <input
                  autoFocus
                  className="lesson-period-dialog__input"
                  onChange={(event) => setDocumentTitle(event.target.value)}
                  value={documentTitle}
                />
              </label>
              {selectedSection.id === "observation" ? (
                <label>
                  Таблица
                  <select
                    className="lesson-period-dialog__input"
                    onChange={(event) =>
                      setObservationTemplateId(event.target.value)
                    }
                    value={observationTemplateId}
                  >
                    {OBSERVATION_TEMPLATE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        Таблица как {option.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {createError ? (
                <p className="lesson-period-dialog__error">{createError}</p>
              ) : null}
              <div className="lesson-period-dialog__actions">
                <button onClick={() => setCreateSectionId(null)} type="button">
                  Отмена
                </button>
                <button type="submit">Создать</button>
              </div>
            </form>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="module-panel">
      <header className="module-header">
        <h1>Жыйындар</h1>
      </header>
      <div className="module-document-list">
        {MEETING_SECTIONS.map((section) => (
          <button
            className="module-document-card"
            key={section.id}
            onClick={() => {
              setSelectedSectionId(section.id);
              setActiveDocumentId(null);
              setCreateSectionId(null);
            }}
            type="button"
          >
            <span aria-hidden="true" className="module-document-icon" />
            <strong>{section.title}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
