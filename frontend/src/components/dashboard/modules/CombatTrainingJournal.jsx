import React, { useEffect, useMemo, useState } from "react";

import {
  createCombatTrainingJournal,
  getCombatTrainingJournals,
  getMethodicalSubjects,
  updateCombatTrainingJournal,
} from "../../../api/dashboard.js";
import Library from "./Library.jsx";

const DEFAULT_YEAR = "20__";
const BLANK_UNIT = "_________________________________";
const JOURNAL_REGISTRY_STORAGE_PREFIX = "munara-combat-training-journals";
const SUBJECT_REGISTRY_STORAGE_PREFIX = "munara-combat-training-subjects";
const SUBJECT_SECTION_TITLE =
  "\u041e\u043a\u0443\u0442\u0443\u0443 \u0442\u04af\u0440\u043b\u04e9\u0440\u04af \u0431\u043e\u044e\u043d\u0447\u0430 \u0441\u0430\u0431\u0430\u043a\u0442\u0430\u0440\u0434\u044b\u043d \u0430\u0442\u0430\u043b\u044b\u0448\u0442\u0430\u0440\u044b";
const COMBAT_TRAINING_JOURNAL_TITLE =
  "\u041a\u04af\u0436\u04af\u0440\u043c\u04e9\u043d \u0434\u0430\u044f\u0440\u0434\u043e\u043e\u043d\u0443 \u043a\u0430\u0442\u0442\u043e\u043e \u0436\u0443\u0440\u043d\u0430\u043b\u044b";

const buildJournalTitle = (year, unitName) =>
  `${year || DEFAULT_YEAR} Р¶. РћРєСѓСѓ Р¶С‹Р»С‹РЅРґР°РіС‹ ${
    unitName || BLANK_UNIT
  } РєТЇР¶ТЇСЂРјУ©РЅ РґР°СЏСЂРґРѕРѕРЅСѓ СЌР»РµРєС‚СЂРѕРЅРґСѓРє РєР°С‚С‚РѕРѕ Р¶СѓСЂРЅР°Р»С‹`;

const getJournalTitle = (journal) =>
  journal?.title?.trim() || buildJournalTitle(journal?.year, journal?.unitName);

const buildSubjectRegistrationTitle = (subjectTitle) => {
  const title = subjectTitle?.trim() || "";
  const brokenSuffix = "Р±РѕСЋРЅС‡Р° РѕРєСѓСѓ РєУ©РЅТЇРіТЇТЇР»У©СЂТЇРЅ РєР°С‚С‚РѕРѕ";
  const suffix =
    "\u0431\u043e\u044e\u043d\u0447\u0430 \u043e\u043a\u0443\u0443 \u043a\u04e9\u043d\u04af\u0433\u04af\u04af\u043b\u04e9\u0440\u04af\u043d \u043a\u0430\u0442\u0442\u043e\u043e";
  const normalizedTitle = title.replace(brokenSuffix, suffix);

  if (!normalizedTitle) {
    return suffix;
  }

  return normalizedTitle.endsWith(suffix)
    ? normalizedTitle
    : `${normalizedTitle} ${suffix}`;
};

const makeEditableHeaderRows = (headerRows) =>
  headerRows.map((headerRow, rowIndex) =>
    headerRow.map((cell, cellIndex) =>
      cell.editableKey
        ? cell
        : {
            ...cell,
            defaultValue: cell.defaultValue ?? cell.label ?? "",
            editableKey: `combat_header_${rowIndex}_${cell.key || cellIndex}`,
          }
    )
  );

const buildSubjectJournalTable = (title) => {
  const labels = {
    number: "\u043a/\u0441 \u2116",
    personalNumber: "\u0436\u0435\u043a\u0435 \u043d\u043e\u043c\u0435\u0440\u0438",
    personalNumberHeader: "\u0416\u0435\u043a\u0435 \u043d\u043e\u043c\u0435\u0440",
    attendanceGroup:
      "\u041a\u04af\u043d\u04af, \u0441\u0430\u0430\u0442\u0442\u0430\u0440, \u043a\u0430\u0442\u044b\u0448\u0443\u0443\u0447\u0443\u043b\u0430\u0440\u0434\u044b\u043d \u0436\u0435\u0442\u0438\u0448\u043a\u0435\u043d\u0434\u0438\u0433\u0438",
    date: "\u041a\u04af\u043d\u04af",
    hours: "\u0421\u0430\u0430\u0442\u0442\u0430\u0440\u0434\u044b\u043d \u0441\u0430\u043d\u044b",
    hour: "\u0421\u0430\u0430\u0442",
    topicMethod:
      "\u0422\u0435\u043c\u0430\u043d\u044b\u043d \u0436\u0430\u043d\u0430 \u0441\u0430\u0431\u0430\u043a\u0442\u0430\u0440\u0434\u044b\u043d \u043d\u043e\u043c\u0435\u0440\u0438, \u043a\u044b\u0441\u043a\u0430\u0447\u0430 \u043c\u0430\u0437\u043c\u0443\u043d\u0443. \u0421\u0430\u0431\u0430\u043a \u04e9\u0442\u04af\u04af\u043d\u04af\u043d \u044b\u043a\u043c\u0430\u0441\u044b",
    completionNote:
      "\u0416\u0435\u0442\u0435\u043a\u0447\u0438\u043d\u0438\u043d \u0430\u0442\u044b-\u0436\u04e9\u043d\u04af \u0436\u0430\u043d\u0430 \u0430\u0442\u043a\u0430\u0440\u044b\u043d\u0433\u0430\u043d\u0434\u044b\u0433\u044b \u0442\u0443\u0443\u0440\u0430\u043b\u0443\u0443 \u0431\u0435\u043b\u0433\u0438",
  };
  const attendanceColumns = Array.from({ length: 31 }, (_, index) => ({
    key: `attendance_${index + 1}`,
    label: `${index + 1}`,
    width: 44,
  }));
  const attendanceHoursHeaderColumns = attendanceColumns.map((column) => ({
    defaultValue: "",
    editableKey: `${column.key}_hours`,
    key: `${column.key}_hours`,
    label: "",
  }));
  const attendanceDateHeaderColumns = attendanceColumns.map((column) => ({
    defaultValue: "",
    editableKey: `${column.key}_date`,
    key: `${column.key}_date`,
    label: "",
  }));
  const columns = [
    {key: "number", label: labels.number, width: 52},
    {key: "personal_number", label: labels.personalNumber, width: 140},
    {key: "attendance_marker", label: "", readOnly: true, width: 44},
    ...attendanceColumns,
    {key: "date", label: labels.date, width: 180},
    {key: "hours", label: labels.hours, type: "number", width: 180},
    {
      key: "topic_method",
      label: labels.topicMethod,
      type: "textarea",
      rows: 3,
      width: 520,
    },
    {
      key: "completion_note",
      label: labels.completionNote,
      type: "textarea",
      width: 420,
    },
  ];
  const compactColumns = columns.map((column) => {
    if (column.key === "number") {
      return {...column, editable: true};
    }

    if (column.key === "attendance_marker") {
      return {...column, readOnly: false};
    }

    if (column.key === "date") {
      return {...column, type: "date", width: 180};
    }

    if (column.key === "hours") {
      return {...column, type: "number", width: 180};
    }

    return column;
  });

  return {
    title,
    variant: "combat-subject-journal",
    headerRows: makeEditableHeaderRows([
      [
        {key: "number", label: "\u043a/\u0441\n\u2116", rowSpan: 4},
        {key: "personal_number", label: labels.personalNumberHeader, rowSpan: 4},
        {
          key: "attendance_group",
          label: labels.attendanceGroup,
          colSpan: attendanceColumns.length + 1,
        },
        {key: "date", label: labels.date, rowSpan: 4},
        {key: "hours", label: labels.hours, rowSpan: 4},
        {
          key: "topic_method",
          label: labels.topicMethod,
          rowSpan: 4,
        },
        {
          key: "completion_note",
          label: labels.completionNote,
          rowSpan: 4,
        },
      ],
      [
        {key: "attendance_number_label", label: ""},
        ...attendanceColumns,
      ],
      [
        {key: "attendance_hours_label", label: labels.hour},
        ...attendanceHoursHeaderColumns,
      ],
      [
        {key: "attendance_date_label", label: labels.date},
        ...attendanceDateHeaderColumns,
      ],
    ]),
    columns: compactColumns,
    rows: Array.from({ length: 20 }, (_, index) => ({
      number: index + 1,
      personal_number: "",
      attendance_marker: "",
      ...attendanceColumns.reduce(
        (values, column) => ({
          ...values,
          [column.key]: "",
        }),
        {}
      ),
      date: "",
      hours: "",
      topic_method: "",
      completion_note: "",
    })),
  };
};
const getDefaultUnitName = (user) => user?.outpost_name || user?.region || "";

const getStorageSafeValue = (value) =>
  encodeURIComponent(value?.trim() || "blank").slice(0, 120);

const getJournalRegistryKey = (scope) =>
  `${JOURNAL_REGISTRY_STORAGE_PREFIX}:${scope || "default"}`;

const getSubjectRegistryKey = (scope, journalId) =>
  `${SUBJECT_REGISTRY_STORAGE_PREFIX}:${scope || "default"}:${journalId || "default"}`;

const getJournalStorageId = (journal) =>
  journal?.id ||
  [
    "combat-training-journal",
    getStorageSafeValue(journal.year),
    getStorageSafeValue(journal.unitName),
  ].join("-");

const getSubjectStorageId = (subject) =>
  subject.methodicalSubjectId
    ? `combat-training-subject-${subject.methodicalSubjectId}`
    : [
        "combat-training-subject",
        getStorageSafeValue(subject.title),
        subject.createdAt ? String(new Date(subject.createdAt).getTime()) : Date.now(),
      ].join("-");

const getStoredJournals = (storageKey) => {
  if (!storageKey || typeof window === "undefined") {
    return [];
  }

  try {
    const journals = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    return Array.isArray(journals) ? journals : [];
  } catch {
    return [];
  }
};

const saveStoredJournals = (storageKey, journals) => {
  if (!storageKey || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(journals));
  } catch {
    // The created journal should remain available in the current session.
  }
};

const normalizeServerJournal = (journal) => ({
  ...journal,
  createdAt: journal.createdAt || journal.created_at,
  id: journal.storage_id || journal.id,
  serverId: journal.id,
  unitName: journal.unitName ?? journal.unit_name ?? "",
});

const buildJournalPayload = (journal, scope) => ({
  storage_id: getJournalStorageId(journal),
  title: getJournalTitle(journal),
  year: journal.year || DEFAULT_YEAR,
  unitName: journal.unitName || "",
  scope: scope || "",
  ...(journal.createdAt ? { createdAt: journal.createdAt } : {}),
});

const formatCreatedAt = (createdAt) => {
  if (!createdAt) {
    return "";
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function CombatTrainingJournal({ data, methodicalSubjects = [], user }) {
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [unitName, setUnitName] = useState(getDefaultUnitName(user));
  const [journalTitle, setJournalTitle] = useState(() =>
    buildJournalTitle(DEFAULT_YEAR, getDefaultUnitName(user))
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubjectCreateOpen, setIsSubjectCreateOpen] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState(methodicalSubjects);
  const [journals, setJournals] = useState([]);
  const [selectedMethodicalSubjectId, setSelectedMethodicalSubjectId] = useState("");
  const [manualSubjectTitle, setManualSubjectTitle] = useState("");
  const [subjectLoadError, setSubjectLoadError] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [journalEditDraft, setJournalEditDraft] = useState(null);
  const [subjectEditDraft, setSubjectEditDraft] = useState(null);
  const registryStorageKey = getJournalRegistryKey(data?.scope);
  const selectedJournalTitle = selectedJournal ? getJournalTitle(selectedJournal) : "";
  const selectedJournalStorageId = selectedJournal ? getJournalStorageId(selectedJournal) : null;
  const subjectRegistryStorageKey = getSubjectRegistryKey(
    data?.scope,
    selectedJournalStorageId,
  );

  useEffect(() => {
    let isMounted = true;

    const loadJournals = async () => {
      const localJournals = getStoredJournals(registryStorageKey);

      try {
        const serverJournals = await getCombatTrainingJournals(data?.scope);
        if (isMounted) {
          setJournals(serverJournals.map(normalizeServerJournal));
        }
        saveStoredJournals(registryStorageKey, []);
      } catch {
        if (isMounted) {
          setJournals(localJournals);
        }
      }
    };

    loadJournals();

    return () => {
      isMounted = false;
    };
  }, [data?.scope, registryStorageKey]);

  useEffect(() => {
    setAvailableSubjects(methodicalSubjects);
  }, [methodicalSubjects]);

  useEffect(() => {
    if (!selectedJournal) {
      setSubjects([]);
      return;
    }

    setSubjects(getStoredJournals(subjectRegistryStorageKey));
    setSelectedSubject(null);
    setIsSubjectCreateOpen(false);
  }, [selectedJournal, subjectRegistryStorageKey]);

  const selectableSubjects = availableSubjects.filter(
    (subject) =>
      !subjects.some(
        (journalSubject) =>
          String(journalSubject.methodicalSubjectId) === String(subject.id)
      )
  );
  const getJournalSubjectTitle = (subject) =>
    buildSubjectRegistrationTitle(subject.title || availableSubjects.find(
      (availableSubject) =>
        String(availableSubject.id) === String(subject.methodicalSubjectId)
    )?.title);

  const subjectData = useMemo(() => {
    if (!selectedJournal || !selectedSubject || !data?.table) {
      return null;
    }

    const storageId = getJournalStorageId(selectedJournal);
    const subjectId = selectedSubject.id || getSubjectStorageId(selectedSubject);
    const tableStorageKey = `munara-library-table:${data?.scope || "default"}:${storageId}:${subjectId}`;

    return {
      ...data,
      description: SUBJECT_SECTION_TITLE,
      id: storageId,
      table: buildSubjectJournalTable(getJournalSubjectTitle(selectedSubject)),
      title: selectedJournalTitle,
      tableStorageKey,
      headerStorageKey: `${tableStorageKey}:fields`,
      tableActionStorageKey: `${tableStorageKey}:action`,
    };
  }, [selectedJournal, selectedJournalTitle, selectedSubject, data, availableSubjects]);

  if (subjectData) {
    return <Library data={subjectData} onBack={() => setSelectedSubject(null)} />;
  }

  const handleCreateYearChange = (value) => {
    const previousTitle = buildJournalTitle(year, unitName);
    setYear(value);
    setJournalTitle((currentTitle) =>
      !currentTitle.trim() || currentTitle === previousTitle
        ? buildJournalTitle(value, unitName)
        : currentTitle
    );
  };

  const handleCreateUnitNameChange = (value) => {
    const previousTitle = buildJournalTitle(year, unitName);
    setUnitName(value);
    setJournalTitle((currentTitle) =>
      !currentTitle.trim() || currentTitle === previousTitle
        ? buildJournalTitle(year, value)
        : currentTitle
    );
  };

  const handleCreateJournal = async (event) => {
    event.preventDefault();

    const nextJournal = {
      createdAt: new Date().toISOString(),
      unitName: unitName.trim(),
      year: year.trim() || DEFAULT_YEAR,
    };
    nextJournal.id = getJournalStorageId(nextJournal);
    nextJournal.title =
      journalTitle.trim() || buildJournalTitle(nextJournal.year, nextJournal.unitName);

    let savedJournal = nextJournal;

    try {
      savedJournal = normalizeServerJournal(
        await createCombatTrainingJournal(buildJournalPayload(nextJournal, data?.scope))
      );
    } catch {
      // Keep local behavior if the API is temporarily unavailable.
    }

    const nextJournals = [
      savedJournal,
      ...journals.filter((journal) => getJournalStorageId(journal) !== getJournalStorageId(savedJournal)),
    ];

    setJournals(nextJournals);
    saveStoredJournals(registryStorageKey, nextJournals);
    setIsCreateOpen(false);
  };

  const openJournalEditDialog = (journal) => {
    setJournalEditDraft({
      id: getJournalStorageId(journal),
      title: getJournalTitle(journal),
      unitName: journal.unitName || "",
      year: journal.year || DEFAULT_YEAR,
    });
  };

  const handleUpdateJournal = async (event) => {
    event.preventDefault();

    if (!journalEditDraft?.id) {
      return;
    }

    const currentJournal = journals.find(
      (journal) => getJournalStorageId(journal) === journalEditDraft.id
    );

    if (!currentJournal) {
      setJournalEditDraft(null);
      return;
    }

    const nextJournal = {
      ...currentJournal,
      id: journalEditDraft.id,
      unitName: journalEditDraft.unitName.trim(),
      year: journalEditDraft.year.trim() || DEFAULT_YEAR,
    };
    nextJournal.title =
      journalEditDraft.title?.trim() ||
      buildJournalTitle(nextJournal.year, nextJournal.unitName);

    let savedJournal = nextJournal;

    try {
      if (nextJournal.serverId) {
        savedJournal = normalizeServerJournal(
          await updateCombatTrainingJournal(
            nextJournal.serverId,
            buildJournalPayload(nextJournal, data?.scope)
          )
        );
      }
    } catch {
      // Keep edited value in local state if the API is temporarily unavailable.
    }

    const nextJournals = journals.map((journal) =>
      getJournalStorageId(journal) === journalEditDraft.id ? savedJournal : journal
    );

    setJournals(nextJournals);
    saveStoredJournals(registryStorageKey, nextJournals);
    setSelectedJournal((currentSelectedJournal) =>
      currentSelectedJournal &&
      getJournalStorageId(currentSelectedJournal) === journalEditDraft.id
        ? savedJournal
        : currentSelectedJournal
    );
    setJournalEditDraft(null);
  };

  const handleCreateSubject = (event) => {
    event.preventDefault();
    const manualTitle = manualSubjectTitle.trim();

    const selectedMethodicalSubject = availableSubjects.find(
      (subject) => String(subject.id) === String(selectedMethodicalSubjectId)
    );

    if (!selectedMethodicalSubject && !manualTitle) {
      return;
    }

    const subjectTitle = manualTitle || selectedMethodicalSubject.title;
    const nextSubject = {
      createdAt: new Date().toISOString(),
      ...(selectedMethodicalSubject ? { methodicalSubjectId: selectedMethodicalSubject.id } : {}),
      title: buildSubjectRegistrationTitle(subjectTitle),
    };
    nextSubject.id = getSubjectStorageId(nextSubject);

    const nextSubjects = [
      nextSubject,
      ...subjects.filter((subject) => subject.id !== nextSubject.id),
    ];

    setSubjects(nextSubjects);
    saveStoredJournals(subjectRegistryStorageKey, nextSubjects);
    setSelectedMethodicalSubjectId("");
    setManualSubjectTitle("");
    setIsSubjectCreateOpen(false);
  };

  const openSubjectEditDialog = (subject) => {
    setSubjectEditDraft({
      id: subject.id,
      title: getJournalSubjectTitle(subject),
    });
  };

  const handleUpdateSubject = (event) => {
    event.preventDefault();

    const title = buildSubjectRegistrationTitle(subjectEditDraft?.title || "");
    if (!subjectEditDraft?.id || !title) {
      return;
    }

    const nextSubjects = subjects.map((subject) =>
      subject.id === subjectEditDraft.id
        ? {
            ...subject,
            title,
          }
        : subject
    );

    setSubjects(nextSubjects);
    saveStoredJournals(subjectRegistryStorageKey, nextSubjects);
    setSelectedSubject((currentSelectedSubject) =>
      currentSelectedSubject?.id === subjectEditDraft.id
        ? {
            ...currentSelectedSubject,
            title,
          }
        : currentSelectedSubject
    );
    setSubjectEditDraft(null);
  };

  const openSubjectCreateDialog = async () => {
    setSubjectLoadError("");
    setSelectedMethodicalSubjectId("");
    setManualSubjectTitle("");
    setIsSubjectCreateOpen(true);

    try {
      setAvailableSubjects(await getMethodicalSubjects());
    } catch {
      setSubjectLoadError(
        "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0441\u043f\u0438\u0441\u043e\u043a \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u043e\u0432."
      );
    }
  };

  const renderJournalEditDialog = () =>
    journalEditDraft && (
      <div className="combat-journal-dialog" role="dialog" aria-modal="true">
        <form
          className="combat-journal-dialog__panel"
          onSubmit={handleUpdateJournal}
        >
          <h2>{"\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0436\u0443\u0440\u043d\u0430\u043b"}</h2>
          <label>
            {"\u041f\u043e\u043b\u043d\u043e\u0435 \u043d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u0436\u0443\u0440\u043d\u0430\u043b\u0430"}
            <textarea
              autoFocus
              onChange={(event) =>
                setJournalEditDraft((currentDraft) => ({
                  ...currentDraft,
                  title: event.target.value,
                }))
              }
              rows={3}
              value={journalEditDraft.title}
            />
          </label>
          <div className="combat-journal-dialog__actions">
            <button type="submit">{"\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c"}</button>
            <button onClick={() => setJournalEditDraft(null)} type="button">
              {"\u041e\u0442\u043c\u0435\u043d\u0430"}
            </button>
          </div>
        </form>
      </div>
    );

  const renderSubjectEditDialog = () =>
    subjectEditDraft && (
      <div className="combat-journal-dialog" role="dialog" aria-modal="true">
        <form
          className="combat-journal-dialog__panel"
          onSubmit={handleUpdateSubject}
        >
          <h2>{"\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u043f\u0440\u0435\u0434\u043c\u0435\u0442"}</h2>
          <label>
            {"\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u0430"}
            <textarea
              autoFocus
              onChange={(event) =>
                setSubjectEditDraft((currentDraft) => ({
                  ...currentDraft,
                  title: event.target.value,
                }))
              }
              rows={3}
              value={subjectEditDraft.title}
            />
          </label>
          <div className="combat-journal-dialog__actions">
            <button disabled={!subjectEditDraft.title.trim()} type="submit">
              {"\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c"}
            </button>
            <button onClick={() => setSubjectEditDraft(null)} type="button">
              {"\u041e\u0442\u043c\u0435\u043d\u0430"}
            </button>
          </div>
        </form>
      </div>
    );

  if (selectedJournal) {
    return (
      <section className="module-panel">
        <button
          className="module-back-button"
          onClick={() => setSelectedJournal(null)}
          type="button"
        >
          {"\u0410\u0440\u0442\u043a\u0430"}
        </button>
        <header>
          <h1>{selectedJournalTitle}</h1>
        </header>
        <div className="combat-journal-subject-header">
          <h2>{SUBJECT_SECTION_TITLE}</h2>
          <div className="saved-table-card__actions">
            <button
              className="combat-journal-create-button"
              onClick={() => openJournalEditDialog(selectedJournal)}
              type="button"
            >
              {"\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0436\u0443\u0440\u043d\u0430\u043b"}
            </button>
            <button
              className="combat-journal-create-button"
              onClick={openSubjectCreateDialog}
              type="button"
            >
              {"\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u0440\u0435\u0434\u043c\u0435\u0442"}
            </button>
          </div>
        </div>
        {renderJournalEditDialog()}
        {renderSubjectEditDialog()}
        {isSubjectCreateOpen && (
          <div className="combat-journal-dialog" role="dialog" aria-modal="true">
            <form
              className="combat-journal-dialog__panel"
              onSubmit={handleCreateSubject}
            >
              <h2>{"\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u0440\u0435\u0434\u043c\u0435\u0442"}</h2>
              <label>
                {"\u041f\u0440\u0435\u0434\u043c\u0435\u0442"}
                <select
                  autoFocus
                  onChange={(event) => setSelectedMethodicalSubjectId(event.target.value)}
                  value={selectedMethodicalSubjectId}
                >
                  <option value="">{"\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043f\u0440\u0435\u0434\u043c\u0435\u0442"}</option>
                  {selectableSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {"Ввести предмет вручную"}
                <input
                  onChange={(event) => setManualSubjectTitle(event.target.value)}
                  placeholder="Напишите название предмета"
                  type="text"
                  value={manualSubjectTitle}
                />
              </label>
              {subjectLoadError && <p className="dashboard-error">{subjectLoadError}</p>}
              {!subjectLoadError && selectableSubjects.length === 0 && (
                <p className="dashboard-state">
                  {"\u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0445 \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u043e\u0432. \u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0441\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u0438\u0445 \u0432 \u0440\u0430\u0437\u0434\u0435\u043b\u0435 \"\u041a\u04af\u0436\u04af\u0440\u043c\u04e9\u043d \u0434\u0430\u044f\u0440\u0434\u043e\u043e \u0431\u043e\u044e\u043d\u0447\u0430 \u0443\u0441\u0443\u043b\u0434\u0443\u043a \u043a\u043e\u043b\u0434\u043e\u043d\u043c\u043e\u043b\u043e\u0440\"."}
                </p>
              )}
              <div className="combat-journal-dialog__actions">
                <button disabled={!selectedMethodicalSubjectId && !manualSubjectTitle.trim()} type="submit">
                  {"\u0421\u043e\u0437\u0434\u0430\u0442\u044c"}
                </button>
                <button
                  onClick={() => {
                    setSelectedMethodicalSubjectId("");
                    setManualSubjectTitle("");
                    setIsSubjectCreateOpen(false);
                  }}
                  type="button"
                >
                  {"\u041e\u0442\u043c\u0435\u043d\u0430"}
                </button>
              </div>
            </form>
          </div>
        )}
        {subjects.length > 0 ? (
          <div className="saved-table-list">
            {subjects.map((subject) => (
              <article
                className="saved-table-card"
                key={subject.id}
              >
                <strong>{getJournalSubjectTitle(subject)}</strong>
                {formatCreatedAt(subject.createdAt) && (
                  <span>{"\u0421\u043e\u0437\u0434\u0430\u043d\u043e"}: {formatCreatedAt(subject.createdAt)}</span>
                )}
                <div className="saved-table-card__actions">
                  <button onClick={() => setSelectedSubject(subject)} type="button">
                    {"\u041e\u0442\u043a\u0440\u044b\u0442\u044c"}
                  </button>
                  <button onClick={() => openSubjectEditDialog(subject)} type="button">
                    {"\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="dashboard-state">
            {"\u0421\u043e\u0437\u0434\u0430\u043d\u043d\u044b\u0445 \u043f\u0440\u0435\u0434\u043c\u0435\u0442\u043e\u0432 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442."}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="module-panel">
      <header>
        <h1>{COMBAT_TRAINING_JOURNAL_TITLE}</h1>
      </header>
      <button
        className="combat-journal-create-button"
        onClick={() => {
          setJournalTitle("");
          setIsCreateOpen(true);
        }}
        type="button"
      >
        {"\u0421\u043e\u0437\u0434\u0430\u0442\u044c"}
      </button>
      {isCreateOpen && (
        <div className="combat-journal-dialog" role="dialog" aria-modal="true">
          <form
            className="combat-journal-dialog__panel"
            onSubmit={handleCreateJournal}
          >
            <h2>{"\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0436\u0443\u0440\u043d\u0430\u043b"}</h2>
            <label>
              {"\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435"}
              <textarea
                autoFocus
                onChange={(event) => setJournalTitle(event.target.value)}
                rows={3}
                value={journalTitle}
              />
            </label>
            <div className="combat-journal-dialog__actions">
              <button disabled={!journalTitle.trim()} type="submit">
                {"\u0421\u043e\u0437\u0434\u0430\u0442\u044c"}
              </button>
              <button onClick={() => setIsCreateOpen(false)} type="button">
                {"\u041e\u0442\u043c\u0435\u043d\u0430"}
              </button>
            </div>
          </form>
        </div>
      )}
      {renderJournalEditDialog()}
      {journals.length > 0 ? (
        <div className="saved-table-list">
          {journals.map((journal) => (
            <article
              className="saved-table-card"
              key={getJournalStorageId(journal)}
            >
              <strong>{getJournalTitle(journal)}</strong>
              <div className="saved-table-card__actions">
                <button onClick={() => setSelectedJournal(journal)} type="button">
                  {"\u041e\u0442\u043a\u0440\u044b\u0442\u044c"}
                </button>
                <button onClick={() => openJournalEditDialog(journal)} type="button">
                  {"\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="dashboard-state">
          {"\u0421\u043e\u0437\u0434\u0430\u043d\u043d\u044b\u0445 \u0436\u0443\u0440\u043d\u0430\u043b\u043e\u0432 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442."}
        </p>
      )}
    </section>
  );
}
