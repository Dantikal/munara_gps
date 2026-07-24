import React, { useEffect, useMemo, useState } from "react";

import {
  deleteCombatTrainingJournalRevision,
  deleteThematicAccountSubmission,
  getCombatTrainingJournalSubjects,
  getThematicAccountSubmissions,
} from "../../../api/dashboard.js";
import Analytics from "./Analytics.jsx";
import {
  buildSubjectJournalTable,
  buildSubjectRegistrationTitle,
} from "./CombatTrainingJournal.jsx";
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
const PERSONNEL_JOURNAL_TITLE =
  "Өздүк курамдын күжүрмөн даярдоосун каттоо журналы";

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

const SUBMISSION_SECTION_SUFFIXES = {
  "thematic-account": "thematic-account",
  "lesson-schedule": "lesson-schedule",
  "combat-training-journal": "combat-training-journal",
  observation: "observation",
  "meeting-analysis": "analysis",
};

const getSubmissionPrefix = (storageNamespace) =>
  storageNamespace === "young-soldier-training-course"
    ? "young-soldier"
    : "meetings";

const getSubmissionSectionId = (storageNamespace, sectionId) =>
  `${getSubmissionPrefix(storageNamespace)}-${
    SUBMISSION_SECTION_SUFFIXES[sectionId] || sectionId
  }`;

export default function Meetings({
  adminExtraCard,
  adminExtraCards,
  analysisSourceSectionId,
  disableAdminBrowser = false,
  directSectionId,
  moduleTitle = "Жыйындар",
  modules,
  onBack,
  sectionIds,
  sectionTitleOverrides,
  storageNamespace = "meetings",
  user,
}) {
  const [selectedSectionId, setSelectedSectionId] = useState(
    directSectionId || null
  );
  const [documents, setDocuments] = useState([]);
  const [activeDocumentId, setActiveDocumentId] = useState(null);
  const [createSectionId, setCreateSectionId] = useState(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [observationTemplateId, setObservationTemplateId] = useState(
    OBSERVATION_TEMPLATE_OPTIONS[0].id
  );
  const [createError, setCreateError] = useState("");
  const [adminSubmissions, setAdminSubmissions] = useState([]);
  const [adminSubmissionsLoading, setAdminSubmissionsLoading] = useState(false);
  const [selectedAdminUnitNumber, setSelectedAdminUnitNumber] = useState(null);
  const [selectedAdminSectionId, setSelectedAdminSectionId] = useState(null);
  const [selectedAdminSubmission, setSelectedAdminSubmission] = useState(null);
  const [journalSubjects, setJournalSubjects] = useState([]);
  const [journalSubjectsLoading, setJournalSubjectsLoading] = useState(false);
  const [journalSubjectsError, setJournalSubjectsError] = useState("");
  const [deletingJournalRevisionId, setDeletingJournalRevisionId] = useState(null);

  const visibleSections = (sectionIds
    ? MEETING_SECTIONS.filter((section) => sectionIds.includes(section.id))
    : MEETING_SECTIONS
  ).map((section) => ({
    ...section,
    title: sectionTitleOverrides?.[section.id] || section.title,
  }));
  const meetingsScope =
    `${modules?.library?.scope || user?.role || "default"}:${storageNamespace}`;
  const documentsStorageKey = `munara-meetings-documents:${meetingsScope}`;
  const legacyObservationStorageKey =
    `munara-meetings-observation-documents:${meetingsScope}`;
  const selectedSection = visibleSections.find(
    (section) => section.id === selectedSectionId
  );
  const sectionDocuments = documents.filter(
    (document) => document.sectionId === selectedSectionId
  );
  const activeDocument = documents.find(
    (document) => document.id === activeDocumentId
  );
  const submissionSectionId = selectedSectionId
    ? getSubmissionSectionId(storageNamespace, selectedSectionId)
    : "";
  const adminUnitNumbers = Array.from(
    new Set(
      [
        ...(modules?.combatTrainingResults?.unitNumbers || []),
        ...adminSubmissions.map((submission) => submission.unitNumber),
      ]
        .map((unitNumber) => String(unitNumber || "").trim())
        .filter(Boolean)
    )
  );
  const selectedAdminSection = visibleSections.find(
    (section) => section.id === selectedAdminSectionId
  );
  const selectedAdminSectionSubmissions = adminSubmissions.filter(
    (submission) =>
      String(submission.unitNumber) === String(selectedAdminUnitNumber) &&
      submission.senderRole === "regional" &&
      submission.sectionId ===
        getSubmissionSectionId(storageNamespace, selectedAdminSectionId)
  );
  const ownSectionSubmissions = selectedSectionId
    ? adminSubmissions.filter(
        (submission) =>
          String(submission.senderId) === String(user?.id) &&
          submission.sectionId ===
            getSubmissionSectionId(storageNamespace, selectedSectionId)
      )
    : [];

  useEffect(() => {
    if (directSectionId) {
      setSelectedSectionId(directSectionId);
      setActiveDocumentId(null);
      setCreateSectionId(null);
    }
  }, [directSectionId]);

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

  useEffect(() => {
    if (
      !["admin", "regional", "outpost"].includes(user?.role) ||
      (user?.role === "admin" && disableAdminBrowser)
    ) {
      return undefined;
    }

    let isCurrent = true;
    setAdminSubmissionsLoading(true);
    getThematicAccountSubmissions()
      .then((items) => {
        if (!isCurrent) return;
        const allowedSectionIds = new Set(
          visibleSections.map((section) =>
            getSubmissionSectionId(storageNamespace, section.id)
          )
        );
        setAdminSubmissions(
          (Array.isArray(items) ? items : []).filter((submission) =>
            allowedSectionIds.has(submission.sectionId)
          )
        );
      })
      .catch(() => {
        if (isCurrent) setAdminSubmissions([]);
      })
      .finally(() => {
        if (isCurrent) setAdminSubmissionsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [disableAdminBrowser, storageNamespace, user?.id, user?.role]);

  useEffect(() => {
    const isUserJournalOpen =
      user?.role !== "admin" &&
      selectedSectionId === "combat-training-journal";
    const isAdminJournalOpen =
      user?.role === "admin" &&
      selectedAdminSectionId === "combat-training-journal" &&
      Boolean(selectedAdminUnitNumber);

    if (!isUserJournalOpen && !isAdminJournalOpen) {
      return undefined;
    }

    let isCurrent = true;
    setJournalSubjects([]);
    setJournalSubjectsLoading(true);
    setJournalSubjectsError("");
    getCombatTrainingJournalSubjects(
      isAdminJournalOpen ? selectedAdminUnitNumber : undefined
    )
      .then((items) => {
        if (isCurrent) {
          setJournalSubjects(Array.isArray(items) ? items : []);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setJournalSubjects([]);
          setJournalSubjectsError(
            "Предметтердин тизмесин жүктөө мүмкүн болгон жок."
          );
        }
      })
      .finally(() => {
        if (isCurrent) setJournalSubjectsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [
    selectedAdminSectionId,
    selectedAdminUnitNumber,
    selectedSectionId,
    user?.id,
    user?.role,
  ]);

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

  const removeLocalDocument = (document) => {
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

  const handleDeleteDocument = (document) => {
    if (!window.confirm(`"${document.title}" өчүрүлсүнбү?`)) return;
    removeLocalDocument(document);
  };

  const handleSubmissionCreated = (submission) => {
    setAdminSubmissions((items) => [
      submission,
      ...items.filter((item) => item.id !== submission.id),
    ]);
  };

  const handleDeleteOutgoingSubmission = async (submission) => {
    if (!window.confirm(`"${submission.documentTitle}" өчүрүлсүнбү?`)) return;

    try {
      await deleteThematicAccountSubmission(submission.id);
      setAdminSubmissions((items) =>
        items.filter((item) => item.id !== submission.id)
      );
      const localDocument = documents.find(
        (document) => String(document.id) === String(submission.periodId)
      );
      if (localDocument) removeLocalDocument(localDocument);
    } catch {
      window.alert("Жөнөтүлгөн документти өчүрүү мүмкүн болгон жок.");
    }
  };

  const handleDeleteJournalRevision = async (submissionId, revision) => {
    if (!window.confirm("Удалить это обновление из истории?")) return;

    setDeletingJournalRevisionId(revision.id);
    try {
      await deleteCombatTrainingJournalRevision(revision.id);
      setAdminSubmissions((items) =>
        items.map((submission) =>
          submission.id === submissionId
            ? {
                ...submission,
                revisions: (submission.revisions || []).filter(
                  (item) => item.id !== revision.id
                ),
              }
            : submission
        )
      );
    } catch {
      window.alert("Обновление журнала удалить не удалось.");
    } finally {
      setDeletingJournalRevisionId(null);
    }
  };

  const openJournalSubject = (subject) => {
    const existingDocument = documents.find(
      (document) =>
        document.sectionId === "combat-training-journal" &&
        String(document.subjectId || "") === String(subject.id)
    );
    if (existingDocument) {
      setActiveDocumentId(existingDocument.id);
      return;
    }

    const document = {
      createdAt: new Date().toISOString(),
      id: createDocumentId("combat-training-journal"),
      sectionId: "combat-training-journal",
      subjectId: subject.id,
      subjectTitle: subject.title,
      title: buildSubjectRegistrationTitle(subject.title),
    };
    saveDocuments([document, ...documents]);
    setActiveDocumentId(document.id);
  };

  const renderOutgoingSubmissions = () => (
    <div className="module-submission-list">
      {selectedSectionId !== "combat-training-journal" ? (
        <>
          <h2>Чыгыш</h2>
          {ownSectionSubmissions.length > 0 ? (
            <div className="module-period-list">
              {ownSectionSubmissions.map((submission) => (
                <div className="module-period-row" key={`outgoing-${submission.id}`}>
                  <div className="module-period-card module-period-card--document">
                    <span aria-hidden="true" className="module-document-icon" />
                    <span className="module-submission-card__content">
                      <strong>{submission.documentTitle}</strong>
                      <small>
                        Жөнөтүлдү:{" "}
                        {new Date(
                          submission.updatedAt || submission.createdAt
                        ).toLocaleString("ru-RU")}
                      </small>
                    </span>
                  </div>
                  <div className="module-period-actions">
                    <button
                      onClick={() => handleDeleteOutgoingSubmission(submission)}
                      type="button"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="dashboard-state">
              Жөнөтүлгөн документтер азырынча жок.
            </p>
          )}
        </>
      ) : (
        <>
          <h3>История обновлений</h3>
          {ownSectionSubmissions.some(
            (submission) => (submission.revisions || []).length > 0
          ) ? (
            <div className="module-period-list">
              {ownSectionSubmissions.flatMap((submission) =>
                (submission.revisions || []).map((revision) => (
                  <div
                    className="module-period-row"
                    key={`meeting-journal-revision-${revision.id}`}
                  >
                    <div className="module-period-card module-period-card--document">
                      <span aria-hidden="true" className="module-document-icon" />
                      <span className="module-submission-card__content">
                        <strong>{revision.documentTitle}</strong>
                        <small>
                          {new Date(revision.createdAt).toLocaleString("ru-RU")}
                        </small>
                      </span>
                    </div>
                    <div className="module-period-actions">
                      <button
                        disabled={deletingJournalRevisionId === revision.id}
                        onClick={() =>
                          handleDeleteJournalRevision(submission.id, revision)
                        }
                        type="button"
                      >
                        {deletingJournalRevisionId === revision.id
                          ? "Удаление..."
                          : "Удалить"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="dashboard-state">Обновлений пока нет.</p>
          )}
        </>
      )}
    </div>
  );

  if (
    user?.role === "admin" &&
    !disableAdminBrowser &&
    selectedAdminSubmission
  ) {
    const submittedDocument = selectedAdminSubmission.table?.document;
    const submittedTable =
      selectedAdminSubmission.table?.table || selectedAdminSubmission.table;

    if (submittedDocument) {
      const attachments = Array.isArray(submittedDocument.attachments)
        ? submittedDocument.attachments
        : [];
      const submittedAt = new Date(
        selectedAdminSubmission.createdAt || Date.now()
      );
      const registryMonth = String(submittedAt.getMonth() + 1).padStart(
        2,
        "0"
      );
      return (
        <section className="module-panel monthly-analysis-print-root">
          <button
            className="module-back-button"
            onClick={() => setSelectedAdminSubmission(null)}
            type="button"
          >
            Артка
          </button>
          <header className="module-header">
            <h1>
              {submittedDocument.title ||
                selectedAdminSubmission.documentTitle}
            </h1>
          </header>
          {submittedDocument.registryNumber ? (
            <p className="monthly-analysis-registry-number">
              № {registryMonth}/{submittedDocument.registryNumber}
            </p>
          ) : null}
          {submittedDocument.addressee ? (
            <p>{submittedDocument.addressee}</p>
          ) : null}
          {submittedDocument.body ? (
            <div className="methodical-text-content">
              {submittedDocument.body}
            </div>
          ) : null}
          {(submittedDocument.extraPages || [])
            .filter((page) => String(page || "").trim())
            .map((page, index) => (
              <div
                className="methodical-text-content"
                key={`page-${index + 1}`}
              >
                {page}
              </div>
            ))}
          {submittedDocument.commanderTitle ||
          submittedDocument.commanderRank ||
          submittedDocument.commanderName ? (
            <div className="monthly-analysis-signature-block">
              <span>{submittedDocument.commanderTitle}</span>
              <span>{submittedDocument.commanderRank}</span>
              <strong>{submittedDocument.commanderName}</strong>
              {submittedDocument.commanderSignature ? (
                <img
                  alt="Кол тамга"
                  src={submittedDocument.commanderSignature}
                />
              ) : null}
            </div>
          ) : null}
          {attachments.length > 0 ? (
            <div className="monthly-analysis-attachments__grid">
              {attachments.map((attachment) => {
                const attachmentUrl =
                  attachment.dataUrl ||
                  attachment.url ||
                  attachment.objectUrl ||
                  attachment.fileUrl;
                return (
                  <div key={attachment.id || attachment.fileName}>
                    {attachment.type === "photo" && attachmentUrl ? (
                      <img
                        alt={attachment.fileName || "Материал"}
                        className="methodical-media methodical-media--image"
                        src={attachmentUrl}
                      />
                    ) : (
                      <a
                        href={attachmentUrl || undefined}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {attachment.fileName ||
                          attachment.name ||
                          attachment.originalName ||
                          "Материал"}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      );
    }

    return (
      <Library
        data={{
          description: "",
          hideSubmit: true,
          id: `admin-submission-${selectedAdminSubmission.id}`,
          scope: `admin-submission-${selectedAdminSubmission.id}`,
          table: {
            ...(submittedTable || {}),
            title:
              submittedTable?.title ||
              selectedAdminSubmission.documentTitle,
          },
          title: selectedAdminSubmission.documentTitle,
        }}
        key={selectedAdminSubmission.id}
        onBack={() => setSelectedAdminSubmission(null)}
      />
    );
  }

  if (
    user?.role === "admin" &&
    !disableAdminBrowser &&
    selectedAdminSection
  ) {
    if (selectedAdminSectionId === "combat-training-journal") {
      const getSubjectSubmission = (subject) =>
        selectedAdminSectionSubmissions.find(
          (submission) =>
            String(submission.table?.subjectId || "") === String(subject.id) ||
            String(submission.table?.subjectTitle || "").trim() ===
              String(subject.title || "").trim() ||
            String(submission.table?.title || "").includes(subject.title)
        );
      const journalUpdates = selectedAdminSectionSubmissions
        .flatMap((submission) =>
          (submission.revisions || []).map((revision) => ({
            ...revision,
            submissionId: submission.id,
            unitNumber: submission.unitNumber,
          }))
        )
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime()
        );

      return (
        <section className="module-panel">
          <button
            className="module-back-button"
            onClick={() => setSelectedAdminSectionId(null)}
            type="button"
          >
            Артка
          </button>
          <header className="module-header">
            <h1>{selectedAdminSection.title}</h1>
          </header>
          <div className="combat-journal-subject-header">
            <div>
              <h2>Предметтер</h2>
              <p>Предметтердин саны: {journalSubjects.length}</p>
            </div>
          </div>
          {journalSubjectsLoading ? (
            <p className="dashboard-state">Предметтер жүктөлүүдө...</p>
          ) : journalSubjects.length > 0 ? (
            <div className="saved-table-list">
              {journalSubjects.map((subject, subjectIndex) => {
                const submission = getSubjectSubmission(subject);
                return (
                  <button
                    className="saved-table-card"
                    disabled={!submission}
                    key={subject.id}
                    onClick={() => {
                      if (submission) setSelectedAdminSubmission(submission);
                    }}
                    type="button"
                  >
                    <strong>{subjectIndex + 1}. {subject.title}</strong>
                    <span>
                      {submission
                        ? `Последнее обновление: ${new Date(
                            submission.updatedAt || submission.createdAt
                          ).toLocaleString("ru-RU")}`
                        : "Обновлений пока нет"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="dashboard-state">
              Бул аскер бөлүгү үчүн предметтер азырынча кошулган жок.
            </p>
          )}
          {journalSubjectsError ? (
            <p className="dashboard-error">{journalSubjectsError}</p>
          ) : null}

          <div className="combat-journal-subject-header">
            <h2>История обновлений</h2>
          </div>
          {journalUpdates.length > 0 ? (
            <div className="module-period-list">
              {journalUpdates.map((revision) => (
                <div
                  className="module-period-row"
                  key={`admin-meeting-journal-revision-${revision.id}`}
                >
                  <button
                    className="module-period-card module-period-card--document"
                    onClick={() =>
                      setSelectedAdminSubmission({
                        id: `revision-${revision.id}`,
                        documentTitle: revision.documentTitle,
                        table: revision.table,
                      })
                    }
                    type="button"
                  >
                    <span aria-hidden="true" className="module-document-icon" />
                    <span className="module-submission-card__content">
                      <strong>{revision.documentTitle}</strong>
                      <small>
                        {new Date(revision.createdAt).toLocaleString("ru-RU")}
                      </small>
                    </span>
                  </button>
                  <div className="module-period-actions">
                    <button
                      disabled={deletingJournalRevisionId === revision.id}
                      onClick={() =>
                        handleDeleteJournalRevision(
                          revision.submissionId,
                          revision
                        )
                      }
                      type="button"
                    >
                      {deletingJournalRevisionId === revision.id
                        ? "Удаление..."
                        : "Удалить"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="dashboard-state">Обновлений пока нет.</p>
          )}
        </section>
      );
    }

    return (
      <section className="module-panel">
        <button
          className="module-back-button"
          onClick={() => setSelectedAdminSectionId(null)}
          type="button"
        >
          Артка
        </button>
        <header className="module-header">
          <h1>{selectedAdminSection.title}</h1>
        </header>
        {selectedAdminSectionSubmissions.length > 0 ? (
          <div className="module-period-list">
            {selectedAdminSectionSubmissions.map((submission) => (
              <div className="module-period-row" key={submission.id}>
                <button
                  className="module-period-card module-period-card--document"
                  onClick={() => setSelectedAdminSubmission(submission)}
                  type="button"
                >
                  <span aria-hidden="true" className="module-document-icon" />
                  <span className="module-submission-card__content">
                    <strong>{submission.documentTitle}</strong>
                    <small>
                      {new Date(
                        submission.updatedAt || submission.createdAt
                      ).toLocaleString("ru-RU")}
                    </small>
                  </span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="dashboard-state">
            Бул аскер бөлүгүнөн жөнөтүлгөн документтер азырынча жок.
          </p>
        )}
      </section>
    );
  }

  if (
    user?.role === "admin" &&
    !disableAdminBrowser &&
    selectedAdminUnitNumber
  ) {
    return (
      <section className="module-panel">
        <button
          className="module-back-button"
          onClick={() => setSelectedAdminUnitNumber(null)}
          type="button"
        >
          Артка
        </button>
        <header className="module-header">
          <h1>{selectedAdminUnitNumber} аскер бөлүгү</h1>
        </header>
        <div className="module-document-list">
          {visibleSections.map((section) => {
            const sectionSubmissionId = getSubmissionSectionId(
              storageNamespace,
              section.id
            );
            const sentCount = adminSubmissions.filter(
              (submission) =>
                String(submission.unitNumber) ===
                  String(selectedAdminUnitNumber) &&
                submission.senderRole === "regional" &&
                submission.sectionId === sectionSubmissionId
            ).length;
            return (
              <button
                className="module-document-card"
                key={section.id}
                onClick={() => setSelectedAdminSectionId(section.id)}
                type="button"
              >
                <span aria-hidden="true" className="module-document-icon" />
                <span className="module-submission-card__content">
                  <strong>{section.title}</strong>
                  <small>Жөнөтүлгөн документтер: {sentCount}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  if (user?.role === "admin" && !disableAdminBrowser) {
    const extraCards = [
      ...(adminExtraCard ? [adminExtraCard] : []),
      ...(adminExtraCards || []),
    ];
    return (
      <section className="module-panel">
        {onBack ? (
          <button className="module-back-button" onClick={onBack} type="button">
            Артка
          </button>
        ) : null}
        <header className="module-header">
          <h1>{moduleTitle}</h1>
        </header>
        <div className="module-document-list">
          {extraCards.map((extraCard) => (
            <button
              className="module-document-card"
              key={extraCard.title}
              onClick={extraCard.onOpen}
              type="button"
            >
              <span aria-hidden="true" className="module-document-icon" />
              <strong>{extraCard.title}</strong>
            </button>
          ))}
          {adminSubmissionsLoading ? (
            <p className="dashboard-state">Маалымат жүктөлүүдө...</p>
          ) : (
            adminUnitNumbers.map((unitNumber) => (
              <button
                className="module-document-card"
                key={unitNumber}
                onClick={() => setSelectedAdminUnitNumber(unitNumber)}
                type="button"
              >
                <span aria-hidden="true" className="module-document-icon" />
                <strong>{unitNumber} аскер бөлүгү</strong>
              </button>
            ))
          )}
        </div>
      </section>
    );
  }

  if (activeDocument?.sectionId === "observation") {
    const template = getObservationTemplate(activeDocument.templateId);
    const subsectionId = `meetings-observation-${template.id}`;

    return (
      <CombatTrainingResults
        data={{
          directEditor: true,
          hideModuleHeader: true,
          hideResultSubmissionActions: false,
          initialObservationGroupId: "regional-unit",
          initialPeriodId: activeDocument.id,
          initialSectionId: "observation",
          initialSubsectionId: subsectionId,
          onBack: () => setActiveDocumentId(null),
          onSubmissionCreated: handleSubmissionCreated,
          submissionPeriodId: activeDocument.id,
          submissionSectionId: getSubmissionSectionId(
            storageNamespace,
            activeDocument.sectionId
          ),
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
          onSubmissionCreated: handleSubmissionCreated,
          registryCounterStorageKey: `munara-analysis-registry:${meetingsScope}`,
          storageNamespace: `${meetingsScope}:${activeDocument.id}`,
          submissionSourceSectionId: analysisSourceSectionId,
          submissionPeriodId: activeDocument.id,
          submissionSectionId: getSubmissionSectionId(
            storageNamespace,
            activeDocument.sectionId
          ),
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
          subjectId: activeDocument.subjectId || null,
          subjectTitle: activeDocument.subjectTitle || "",
          title: activeDocument.title,
        }
      : null;

    return table ? (
      <Library
        data={{
          allowThematicMonthDeletion:
            activeDocument.sectionId === "thematic-account",
          description: "",
          directSubmissionUpdate:
            activeDocument.sectionId === "combat-training-journal",
          hideSubmit: false,
          id: activeDocument.id,
          scope: meetingsScope,
          requestSubmissionTitleOnUpdate:
            activeDocument.sectionId === "combat-training-journal",
          submissionDocumentTitle: activeDocument.title,
          submissionPeriodId: activeDocument.id,
          submissionSectionId: getSubmissionSectionId(
            storageNamespace,
            activeDocument.sectionId
          ),
          submissionActionLabel:
            activeDocument.sectionId === "combat-training-journal"
              ? "Обновить"
              : undefined,
          table,
          title: activeDocument.title,
        }}
        key={activeDocument.id}
        onBack={() => setActiveDocumentId(null)}
        onSubmissionCreated={handleSubmissionCreated}
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

  if (selectedSection?.id === "combat-training-journal") {
    return (
      <section className="module-panel">
        <button
          className="module-back-button"
          onClick={() => {
            if (directSectionId && onBack) {
              onBack();
              return;
            }
            setSelectedSectionId(null);
          }}
          type="button"
        >
          Артка
        </button>
        <header className="module-header">
          <h1>{PERSONNEL_JOURNAL_TITLE}</h1>
        </header>
        <div className="combat-journal-subject-header">
          <h2>
            Окутуу түрлөрү боюнча сабактардын аталыштары
          </h2>
        </div>
        {journalSubjectsLoading ? (
          <p className="dashboard-state">Предметтер жүктөлүүдө...</p>
        ) : journalSubjects.length > 0 ? (
          <div className="saved-table-list">
            {journalSubjects.map((subject) => (
              <button
                className="saved-table-card"
                key={subject.id}
                onClick={() => openJournalSubject(subject)}
                type="button"
              >
                <strong>{subject.title}</strong>
              </button>
            ))}
          </div>
        ) : (
          <p className="dashboard-state">
            Предметтер азырынча жок.
          </p>
        )}
        {journalSubjectsError ? (
          <p className="dashboard-error">{journalSubjectsError}</p>
        ) : null}
        {renderOutgoingSubmissions()}
      </section>
    );
  }

  if (selectedSection) {
    return (
      <section className="module-panel">
        <button
          className="module-back-button"
          onClick={() => {
            if (directSectionId && onBack) {
              onBack();
              return;
            }
            setSelectedSectionId(null);
          }}
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
                {(() => {
                  const sentSubmission = ownSectionSubmissions.find(
                    (submission) =>
                      String(submission.periodId) === String(document.id)
                  );
                  return (
                    <>
                <button
                  className="module-period-card module-period-card--document"
                  disabled={Boolean(sentSubmission)}
                  onClick={() => {
                    if (!sentSubmission) setActiveDocumentId(document.id);
                  }}
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
                    {sentSubmission ? <small>Жөнөтүлдү. Өзгөртүүгө болбойт.</small> : null}
                  </span>
                </button>
                <div className="module-period-actions">
                  {!sentSubmission ? (
                      <button
                        onClick={() => handleRenameDocument(document)}
                        type="button"
                      >
                        Изменить
                      </button>
                  ) : null}
                  <button
                    onClick={() =>
                      sentSubmission
                        ? handleDeleteOutgoingSubmission(sentSubmission)
                        : handleDeleteDocument(document)
                    }
                    type="button"
                  >
                    Удалить
                  </button>
                </div>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        ) : (
          <p className="dashboard-state">Түзүлгөн документтер азырынча жок.</p>
        )}
        {renderOutgoingSubmissions()}
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
      {onBack ? (
        <button className="module-back-button" onClick={onBack} type="button">
          Артка
        </button>
      ) : null}
      <header className="module-header">
        <h1>{moduleTitle}</h1>
      </header>
      <div className="module-document-list">
        {visibleSections.map((section) => (
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
