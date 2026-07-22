import React, { useEffect, useMemo, useState } from "react";

import {
  createCombatTrainingJournal,
  createCombatTrainingJournalSubject,
  deleteCombatTrainingJournal,
  deleteThematicAccountSubmission,
  forwardThematicAccountSubmission,
  getCombatTrainingJournals,
  getCombatTrainingJournalSubjects,
  getThematicAccountSubmissions,
  updateCombatTrainingJournal,
} from "../../../api/dashboard.js";
import {
  OUTPOSTS_BY_MILITARY_UNIT,
  formatOutpostName,
} from "../../../data/militaryUnits.js";
import Library from "./Library.jsx";
import SubmissionForwardDialog from "./SubmissionForwardDialog.jsx";
import SubmissionEditPermissionButton from "./SubmissionEditPermissionButton.jsx";

const DEFAULT_YEAR = "20__";
const BLANK_UNIT = "_________________________________";
const JOURNAL_REGISTRY_STORAGE_PREFIX = "munara-combat-training-journals";
const SUBJECT_REGISTRY_STORAGE_PREFIX = "munara-combat-training-subjects";
const SUBJECT_SECTION_TITLE =
  "\u041e\u043a\u0443\u0442\u0443\u0443 \u0442\u04af\u0440\u043b\u04e9\u0440\u04af \u0431\u043e\u044e\u043d\u0447\u0430 \u0441\u0430\u0431\u0430\u043a\u0442\u0430\u0440\u0434\u044b\u043d \u0430\u0442\u0430\u043b\u044b\u0448\u0442\u0430\u0440\u044b";
const COMBAT_TRAINING_JOURNAL_TITLE =
  "\u041a\u04af\u0436\u04af\u0440\u043c\u04e9\u043d \u0434\u0430\u044f\u0440\u0434\u043e\u043e\u043d\u0443 \u043a\u0430\u0442\u0442\u043e\u043e \u0436\u0443\u0440\u043d\u0430\u043b\u044b";
const JOURNAL_CATEGORIES = [
  {
    id: "personnel-training",
    title: "Өздүк курамдын күжүрмөн даярдоосун каттоо журналы",
  },
  {
    id: "command-training",
    title: "Командирдик даярдоо боюнча күжүрмөн даярдоону каттоо журналы",
  },
];

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
      cell.editableKey || cell.fixed
        ? cell
        : {
            ...cell,
            defaultValue: cell.defaultValue ?? cell.label ?? "",
            editableKey: `combat_header_${rowIndex}_${cell.key || cellIndex}`,
          }
    )
  );

const buildSubjectJournalTable = (title, options = {}) => {
  const { enableCellColoring = false, hideDate = false } = options;
  const mainHeaderRowSpan = hideDate ? 3 : 4;
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
    label: '"__"____202__ж.',
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
    ...(!hideDate ? [{key: "date", label: labels.date, width: 180}] : []),
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
    enableCellColoring,
    hideDate,
    headerRows: makeEditableHeaderRows([
      [
        {key: "number", label: "\u043a/\u0441\n\u2116", rowSpan: mainHeaderRowSpan},
        {key: "personal_number", label: labels.personalNumberHeader, rowSpan: mainHeaderRowSpan},
        {
          key: "attendance_group",
          label: labels.attendanceGroup,
          colSpan: attendanceColumns.length + 1,
        },
        ...(!hideDate ? [{key: "date", label: labels.date, rowSpan: mainHeaderRowSpan}] : []),
        {key: "hours", label: labels.hours, rowSpan: mainHeaderRowSpan},
        {
          key: "topic_method",
          label: labels.topicMethod,
          rowSpan: mainHeaderRowSpan,
        },
        {
          key: "completion_note",
          label: labels.completionNote,
          rowSpan: mainHeaderRowSpan,
        },
      ],
      [
        {
          key: "attendance_number_label",
          label: "Күн, ай, жыл",
          fixed: true,
          vertical: true,
        },
        ...attendanceColumns,
      ],
      [
        {key: "attendance_hours_label", label: labels.hour},
        ...attendanceHoursHeaderColumns,
      ],
      ...(!hideDate
        ? [[
            {key: "attendance_date_label", label: labels.date},
            ...attendanceDateHeaderColumns,
          ]]
        : []),
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

const getSubmissionSenderLabel = (submission) => {
  if (submission?.senderRole === "outpost") {
    const outpost = submission.outpostName || submission.senderName || "Застава көрсөтүлгөн эмес";
    return submission.unitNumber
      ? `Застава: ${outpost} · Аскер бөлүгү: ${submission.unitNumber}`
      : `Застава: ${outpost}`;
  }

  return `Аскер бөлүгү: ${submission?.unitNumber || submission?.senderName || "көрсөтүлгөн эмес"}`;
};

const openCardWithKeyboard = (event, openCard) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openCard();
  }
};

export default function CombatTrainingJournal({ data, methodicalSubjects = [], user }) {
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [unitName, setUnitName] = useState(getDefaultUnitName(user));
  const [journalTitle, setJournalTitle] = useState(() =>
    buildJournalTitle(DEFAULT_YEAR, getDefaultUnitName(user))
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubjectCreateOpen, setIsSubjectCreateOpen] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [journals, setJournals] = useState([]);
  const [selectedMethodicalSubjectId, setSelectedMethodicalSubjectId] = useState("");
  const [manualSubjectTitle, setManualSubjectTitle] = useState("");
  const [subjectLoadError, setSubjectLoadError] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [selectedJournalCategory, setSelectedJournalCategory] = useState(null);
  const [selectedAdminUnitNumber, setSelectedAdminUnitNumber] = useState(null);
  const [selectedAdminOutpostName, setSelectedAdminOutpostName] = useState(null);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [journalEditDraft, setJournalEditDraft] = useState(null);
  const [subjectEditDraft, setSubjectEditDraft] = useState(null);
  const [journalSubmissions, setJournalSubmissions] = useState([]);
  const [selectedJournalSubmission, setSelectedJournalSubmission] = useState(null);
  const [journalSubmissionError, setJournalSubmissionError] = useState("");
  const [deletingJournalSubmissionId, setDeletingJournalSubmissionId] = useState(null);
  const [deletingJournalId, setDeletingJournalId] = useState(null);
  const [forwardingSubmission, setForwardingSubmission] = useState(null);
  const selectedCategory = JOURNAL_CATEGORIES.find(
    (category) => category.id === selectedJournalCategory
  );
  const journalScope = selectedJournalCategory === "command-training"
    ? `${data?.scope || "default"}:command-training`
    : data?.scope;
  const registryStorageKey = getJournalRegistryKey(journalScope);
  const selectedJournalTitle = selectedJournal ? getJournalTitle(selectedJournal) : "";
  const selectedJournalStorageId = selectedJournal ? getJournalStorageId(selectedJournal) : null;
  const subjectRegistryStorageKey = getSubjectRegistryKey(
    journalScope,
    selectedJournalStorageId,
  );
  const journalSubmissionSectionId = selectedJournalCategory === "personnel-training"
    ? "combat-training-personnel-journal"
    : selectedJournalCategory === "command-training"
      ? "combat-training-command-journal"
      : null;

  const loadJournalSubmissions = async () => {
    try {
      const items = await getThematicAccountSubmissions();
      setJournalSubmissions(
        (Array.isArray(items) ? items : []).filter(
          (item) => item.sectionId === journalSubmissionSectionId
        )
      );
      setJournalSubmissionError("");
    } catch {
      setJournalSubmissions([]);
      setJournalSubmissionError("Жөнөтүлгөн журналдарды жүктөө мүмкүн болгон жок.");
    }
  };

  useEffect(() => {
    if (journalSubmissionSectionId && ["outpost", "regional", "admin"].includes(user?.role)) {
      loadJournalSubmissions();
    } else {
      setJournalSubmissions([]);
    }
  }, [journalSubmissionSectionId, user?.id, user?.role]);

  useEffect(() => {
    let isMounted = true;

    const loadJournals = async () => {
      if (!selectedJournalCategory) {
        setJournals([]);
        return;
      }

      const localJournals = getStoredJournals(registryStorageKey);

      try {
        const serverJournals = await getCombatTrainingJournals(journalScope);
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
  }, [journalScope, registryStorageKey, selectedJournalCategory]);

  useEffect(() => {
    let isMounted = true;
    getCombatTrainingJournalSubjects()
      .then((items) => {
        if (isMounted) {
          setAvailableSubjects(Array.isArray(items) ? items : []);
          setSubjectLoadError("");
        }
      })
      .catch(() => {
        if (isMounted) {
          setAvailableSubjects(methodicalSubjects);
          setSubjectLoadError("Не удалось загрузить список предметов.");
        }
      });
    return () => {
      isMounted = false;
    };
  }, [methodicalSubjects]);

  useEffect(() => {
    if (!selectedJournal) {
      setSubjects([]);
      return;
    }

    setSubjects(availableSubjects);
    setSelectedSubject(null);
    setIsSubjectCreateOpen(false);
  }, [selectedJournal, availableSubjects]);

  const selectableSubjects = availableSubjects.filter(
    (subject) =>
      !subjects.some(
        (journalSubject) =>
          String(journalSubject.methodicalSubjectId) === String(subject.id)
      )
  );
  const getJournalSubjectTitle = (subject) =>
    subject.title || availableSubjects.find(
      (availableSubject) =>
        String(availableSubject.id) === String(subject.methodicalSubjectId)
    )?.title || "";

  const journalData = useMemo(() => {
    if (!selectedJournal || !selectedSubject || !data?.table) {
      return null;
    }

    const journalId = getJournalStorageId(selectedJournal);
    const subjectId = selectedSubject.id || getStorageSafeValue(selectedSubject.title);
    const storageId = `${journalId}:subject:${subjectId}`;
    const tableStorageKey = `munara-library-table:${journalScope || "default"}:${storageId}:main`;
    const subjectJournalTitle = buildSubjectRegistrationTitle(selectedSubject.title);

    return {
      ...data,
      description: "",
      id: storageId,
      table: buildSubjectJournalTable(subjectJournalTitle, {
        enableCellColoring: true,
        hideDate: true,
      }),
      title: subjectJournalTitle,
      tableStorageKey,
      headerStorageKey: `${tableStorageKey}:fields-v2`,
      tableActionStorageKey: `${tableStorageKey}:action`,
      submissionPeriodId: storageId,
      submissionSectionId: journalSubmissionSectionId,
      autoSubmitOnSave: false,
      submissionDocumentTitle: subjectJournalTitle,
    };
  }, [selectedJournal, selectedSubject, data, journalScope, journalSubmissionSectionId]);

  if (selectedJournalSubmission) {
    const submissionStorageKey = `combat-journal-submission:${selectedJournalSubmission.id}`;
    return (
      <Library
        data={{
          ...data,
          description: "",
          id: submissionStorageKey,
          readOnly: true,
          table: selectedJournalSubmission.table,
          tableStorageKey: submissionStorageKey,
          title: selectedJournalSubmission.documentTitle,
        }}
        onBack={() => setSelectedJournalSubmission(null)}
      />
    );
  }

  if (journalData) {
    return (
      <Library
        data={journalData}
        onBack={() => {
          setSelectedSubject(null);
          loadJournalSubmissions();
        }}
        onSubmissionCreated={(submission) => {
          setJournalSubmissions((items) => [
            submission,
            ...items.filter((item) => item.id !== submission.id),
          ]);
          setSelectedSubject(null);
          setSelectedJournal(null);
        }}
      />
    );
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
        await createCombatTrainingJournal(buildJournalPayload(nextJournal, journalScope))
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
            buildJournalPayload(nextJournal, journalScope)
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

  const handleDeleteJournal = async (journal) => {
    if (!journal?.serverId || !window.confirm(`"${getJournalTitle(journal)}" өчүрүлсүнбү?`)) {
      return;
    }

    setDeletingJournalId(journal.serverId);
    try {
      await deleteCombatTrainingJournal(journal.serverId);
      setJournals((currentJournals) =>
        currentJournals.filter((item) => item.serverId !== journal.serverId)
      );
      if (selectedJournal?.serverId === journal.serverId) {
        setSelectedJournal(null);
      }
    } finally {
      setDeletingJournalId(null);
    }
  };

  const handleCreateSubject = async (event) => {
    event.preventDefault();
    if (user?.role !== "admin") {
      return;
    }
    const manualTitle = manualSubjectTitle.trim();

    const selectedMethodicalSubject = availableSubjects.find(
      (subject) => String(subject.id) === String(selectedMethodicalSubjectId)
    );

    if (!selectedMethodicalSubject && !manualTitle) {
      return;
    }

    const subjectTitle = manualTitle || selectedMethodicalSubject.title;
    try {
      const createdSubject = await createCombatTrainingJournalSubject({
        title: subjectTitle,
        order: availableSubjects.length + 1,
      });
      setAvailableSubjects((items) => [...items, createdSubject]);
      setSubjects((items) => [...items, createdSubject]);
      setSelectedMethodicalSubjectId("");
      setManualSubjectTitle("");
      setSubjectLoadError("");
      setIsSubjectCreateOpen(false);
    } catch {
      setSubjectLoadError("Не удалось добавить предмет. Проверьте название и повторите попытку.");
    }
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
      setAvailableSubjects(await getCombatTrainingJournalSubjects());
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
          onClick={() => {
            setSelectedJournal(null);
            setSelectedSubject(null);
            if (user?.role !== "admin") {
              setSelectedJournalCategory(null);
            }
          }}
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
            {user?.role === "admin" ? (
              <button
                className="combat-journal-create-button"
                onClick={openSubjectCreateDialog}
                type="button"
              >
                {"\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u043f\u0440\u0435\u0434\u043c\u0435\u0442"}
              </button>
            ) : null}
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
                onClick={() => setSelectedSubject(subject)}
                onKeyDown={(event) => openCardWithKeyboard(event, () => setSelectedSubject(subject))}
                role="button"
                tabIndex={0}
              >
                <strong>{getJournalSubjectTitle(subject)}</strong>
                {formatCreatedAt(subject.createdAt) && (
                  <span>{"\u0421\u043e\u0437\u0434\u0430\u043d\u043e"}: {formatCreatedAt(subject.createdAt)}</span>
                )}
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

  const handleDeleteJournalSubmission = async (submission) => {
    if (!window.confirm(`"${submission.documentTitle}" өчүрүлсүнбү?`)) {
      return;
    }

    setDeletingJournalSubmissionId(submission.id);
    setJournalSubmissionError("");
    try {
      await deleteThematicAccountSubmission(submission.id);
      setJournalSubmissions((items) =>
        items.filter((item) => item.id !== submission.id)
      );
    } catch {
      setJournalSubmissionError("Журналды өчүрүү мүмкүн болгон жок.");
    } finally {
      setDeletingJournalSubmissionId(null);
    }
  };

  const renderJournalSubmissions = () => {
    if (!journalSubmissionSectionId) {
      return null;
    }

    const renderSubmissionCard = (submission, canForward = false) => (
      <article
        className="saved-table-card"
        key={`journal-submission-${submission.id}`}
        onClick={() => setSelectedJournalSubmission(submission)}
        onKeyDown={(event) => openCardWithKeyboard(
          event,
          () => setSelectedJournalSubmission(submission),
        )}
        role="button"
        tabIndex={0}
      >
        <strong>{submission.documentTitle}</strong>
        <span>{getSubmissionSenderLabel(submission)}</span>
        <span>Заполнено</span>
        <div
          className="saved-table-card__actions"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <SubmissionEditPermissionButton
            onUpdated={(updated) => setJournalSubmissions((items) => items.map((item) => item.id === updated.id ? updated : item))}
            submission={submission}
          />
          {canForward ? (
            <button onClick={() => setForwardingSubmission(submission)} type="button">
              Отправить
            </button>
          ) : null}
          <button
            disabled={deletingJournalSubmissionId === submission.id}
            onClick={() => handleDeleteJournalSubmission(submission)}
            type="button"
          >
            {deletingJournalSubmissionId === submission.id ? "Өчүрүү..." : "Өчүрүү"}
          </button>
        </div>
      </article>
    );

    if (user?.role === "admin") {
      const unitNumbers = Array.from(new Set([
        ...(data?.unitNumbers || []),
        ...journalSubmissions.map((submission) => submission.unitNumber),
      ].map((unitNumber) => String(unitNumber || "").trim()).filter(Boolean)));
      const unitSubmissions = journalSubmissions.filter(
        (submission) => String(submission.unitNumber) === String(selectedAdminUnitNumber)
      );
      const militaryUnitSubmissions = unitSubmissions.filter(
        (submission) => submission.senderRole === "regional"
      );
      const outpostSubmissions = unitSubmissions.filter(
        (submission) => submission.senderRole === "outpost"
      );
      const outpostNames = Array.from(new Set([
        ...(OUTPOSTS_BY_MILITARY_UNIT[selectedAdminUnitNumber] || []).map(([, name]) =>
          formatOutpostName(name)
        ),
        ...outpostSubmissions.map((submission) => formatOutpostName(submission.outpostName)),
      ].filter(Boolean)));
      const selectedOutpostSubmissions = selectedAdminOutpostName
        ? outpostSubmissions.filter(
            (submission) => formatOutpostName(submission.outpostName) === selectedAdminOutpostName
          )
        : [];

      if (!selectedAdminUnitNumber) {
        return (
          <div className="saved-table-list">
            {unitNumbers.map((unitNumber) => (
              <button
                className="saved-table-card"
                key={unitNumber}
                onClick={() => {
                  setSelectedAdminUnitNumber(unitNumber);
                  setSelectedAdminOutpostName(null);
                }}
                type="button"
              >
                <strong>{unitNumber} аскер бөлүгү</strong>
              </button>
            ))}
          </div>
        );
      }

      if (selectedAdminOutpostName) {
        return (
          <div className="module-submission-list">
            <h2>{selectedAdminOutpostName}</h2>
            <h3>Заставадан жөнөтүлгөн журналдар</h3>
            {selectedOutpostSubmissions.length > 0 ? (
              <div className="saved-table-list">
                {selectedOutpostSubmissions.map((submission) => renderSubmissionCard(submission))}
              </div>
            ) : (
              <p className="dashboard-state">
                Бул заставадан жөнөтүлгөн журналдар азырынча жок.
              </p>
            )}
            {journalSubmissionError && <p className="dashboard-error">{journalSubmissionError}</p>}
          </div>
        );
      }

      return (
        <div className="module-submission-list">
          <h2>{selectedAdminUnitNumber} аскер бөлүгү</h2>
          <h3>Аскер бөлүгүнөн жөнөтүлгөн журналдар</h3>
          {militaryUnitSubmissions.length > 0 ? (
            <div className="saved-table-list">
              {militaryUnitSubmissions.map((submission) => renderSubmissionCard(submission))}
            </div>
          ) : (
            <p className="dashboard-state">Аскер бөлүгүнөн жөнөтүлгөн журналдар азырынча жок.</p>
          )}
          <h3>Заставалар</h3>
          {outpostNames.length > 0 ? (
            <div className="saved-table-list">
              {outpostNames.map((outpostName) => (
                <button
                  className="saved-table-card"
                  key={outpostName}
                  onClick={() => setSelectedAdminOutpostName(outpostName)}
                  type="button"
                >
                  <strong>{outpostName}</strong>
                </button>
              ))}
            </div>
          ) : (
            <p className="dashboard-state">Бул аскер бөлүгүнө караштуу заставалар табылган жок.</p>
          )}
          {journalSubmissionError && <p className="dashboard-error">{journalSubmissionError}</p>}
        </div>
      );
    }

    const incomingSubmissions = user?.role === "regional"
      ? journalSubmissions.filter((submission) => submission.senderRole === "outpost")
      : journalSubmissions;
    const outgoingSubmissions = user?.role === "regional"
      ? journalSubmissions.filter((submission) => submission.senderRole === "regional")
      : [];

    return (
      <div className="module-submission-list">
        <h3>{user?.role === "outpost" ? "Чыгыш" : "Кириш"}</h3>
        {incomingSubmissions.length > 0 ? (
          <div className="saved-table-list">
            {incomingSubmissions.map((submission) => renderSubmissionCard(
              submission,
              user?.role === "regional",
            ))}
          </div>
        ) : (
          <p className="dashboard-state">Документов пока нет.</p>
        )}
        {user?.role === "regional" ? (
          <>
            <h3>Чыгыш</h3>
            {outgoingSubmissions.length > 0 ? (
              <div className="saved-table-list">
                {outgoingSubmissions.map((submission) => renderSubmissionCard(submission))}
              </div>
            ) : <p className="dashboard-state">Жөнөтүлгөн документтер азырынча жок.</p>}
          </>
        ) : null}
        {journalSubmissionError && <p className="dashboard-error">{journalSubmissionError}</p>}
      </div>
    );
  };

  if (!selectedJournalCategory) {
    return (
      <section className="module-panel">
        <header>
          <h1>{COMBAT_TRAINING_JOURNAL_TITLE}</h1>
        </header>
        <div className="saved-table-list">
          {JOURNAL_CATEGORIES.map((category) => (
            <button
              className="saved-table-card"
              key={category.id}
              onClick={() => {
                setJournals([]);
                setSelectedAdminUnitNumber(null);
                setSelectedAdminOutpostName(null);
                setSelectedJournalCategory(category.id);
                if (user?.role !== "admin") {
                  setSelectedJournal({
                    id: `combat-training-journal-${category.id}`,
                    title: category.title,
                    unitName: getDefaultUnitName(user),
                    year: DEFAULT_YEAR,
                  });
                }
              }}
              type="button"
            >
              <strong>{category.title}</strong>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="module-panel">
      <button
        className="module-back-button"
        onClick={() => {
          if (selectedAdminOutpostName) {
            setSelectedAdminOutpostName(null);
          } else if (selectedAdminUnitNumber) {
            setSelectedAdminUnitNumber(null);
          } else {
            setJournals([]);
            setSelectedJournal(null);
            setSelectedJournalCategory(null);
          }
        }}
        type="button"
      >
        {"\u0410\u0440\u0442\u043a\u0430"}
      </button>
      <header>
        <h1>{selectedCategory?.title || COMBAT_TRAINING_JOURNAL_TITLE}</h1>
      </header>
      {(
        <button
          className="combat-journal-create-button"
          onClick={() => setSelectedJournal({
            id: `combat-training-journal-${selectedJournalCategory}`,
            title: selectedCategory?.title || COMBAT_TRAINING_JOURNAL_TITLE,
            unitName: "",
            year: DEFAULT_YEAR,
          })}
          type="button"
        >
          Предметы журнала
        </button>
      )}
      {user?.role !== "admin" && isCreateOpen && (
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
      {renderJournalSubmissions()}
      <SubmissionForwardDialog
        onClose={() => setForwardingSubmission(null)}
        onForward={async (submission, title) => {
          const forwarded = await forwardThematicAccountSubmission(submission.id, title);
          setJournalSubmissions((items) => [forwarded, ...items]);
        }}
        submission={forwardingSubmission}
      />
    </section>
  );
}
