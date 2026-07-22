import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import {
  createLibraryPeriod,
  createLessonSchedulePeriod,
  createThematicAccountSubmission,
  deleteLibraryPeriod,
  deleteLessonSchedulePeriod,
  deleteThematicAccountSubmission,
  forwardThematicAccountSubmission,
  getThematicAccountSubmissions,
  updateLibraryPeriod,
} from "../../../api/dashboard.js";
import { getApiErrorMessage } from "../../../api/errors.js";
import {
  OUTPOSTS_BY_MILITARY_UNIT,
  formatOutpostName,
} from "../../../data/militaryUnits.js";
import SubmissionForwardDialog from "./SubmissionForwardDialog.jsx";
import SubmissionEditPermissionButton from "./SubmissionEditPermissionButton.jsx";

const TABLE_STORAGE_PREFIX = "munara-library-table";
const TABLE_FIELD_STORAGE_SUFFIX = "fields";
const TABLE_ACTION_STORAGE_SUFFIX = "action";
const CUSTOM_PERIODS_STORAGE_PREFIX = "munara-library-custom-periods";
export const SAVED_TABLES_STORAGE_KEY = "munara-library-saved-tables";
const EMPTY_ARRAY = [];
const MULTILINE_COLUMN_KEYS = new Set([
  "activity",
  "completion_note",
  "topic_method",
]);
const COMMAND_THEMATIC_ACCOUNT_SECTION_ID = "command-thematic-account";
const THEMATIC_ACCOUNT_SECTION_IDS = new Set(["thematic-account", "command-thematic-account"]);
const LESSON_SCHEDULE_SECTION_IDS = new Set(["lesson-schedule", "command-lesson-schedule"]);
const ADMIN_GROUPED_SUBMISSION_SECTION_IDS = new Set([
  "thematic-account",
  "lesson-schedule",
  "command-thematic-account",
  "command-lesson-schedule",
]);
const OUTPOST_SUBMISSION_SECTION_IDS = new Set([
  "thematic-account",
  "lesson-schedule",
  "command-thematic-account",
  "command-lesson-schedule",
  "typical-week",
  "combat-training-personnel-journal",
  "combat-training-command-journal",
]);
const COMMAND_SUBMISSION_SECTION_IDS = new Set([
  "command-thematic-account",
  "command-lesson-schedule",
]);
const REMOVED_THEMATIC_PERIOD_IDS = new Set(["period-2", "period-3", "period-4"]);
const REMOVED_THEMATIC_PERIOD_TITLE_PARTS = [
  "2026-окуу жылынын 2 мезгилине",
  "2026-окуу жылынын 3 мезгилине",
  "2026-окуу жылынын 4 мезгилине",
  "20__-окуу жылынын 2 мезгилине",
  "20__-окуу жылынын 3 мезгилине",
  "20__-окуу жылынын 4 мезгилине",
];
const THEMATIC_ACCOUNT_UNIT_TEXT = "2027 аскер бөлүгүнүн";
const THEMATIC_ACCOUNT_YEAR_TEXT = "2026-окуу жылынын";
const THEMATIC_ACCOUNT_YEAR_PLACEHOLDER = "20__-окуу жылынын";

const buildThematicAccountTableTitle = (periodNumber) =>
  `20__-окуу жылынын ${periodNumber} мезгилине_______аскер бөлүгүнүн "__________" чек ара заставынын (тобунун, взвод, ротосынын) өздүк курамы  менен өтүлгүүчү   сабактардын тематикалык эсеп сааты.`;

const getPeriodNumber = (period) => {
  const idMatch = String(period?.id || "").match(/^period-(\d+)$/);
  if (idMatch) {
    return idMatch[1];
  }

  return String(period?.title || "").match(/20__-окуу жылынын\s+(\d+)\s+мезгилине/)?.[1];
};

const buildCommandThematicAccountTableTitle = (periodNumber = "___") =>
  `20__-окуу жылынын ${periodNumber} мезгилине_______аскер бөлүгүнүн "__________" чек ара заставынын (тобунун, взвод, ротосынын) сержант,  прапорщиктердин
өздүк курамы  менен өтүлгүүчү командирдик даярдык боюбнча  сабактардын тематикалык эсеп сааты.`;

const LESSON_SCHEDULE_MONTH_PLACEHOLDER = "__________";
const LESSON_SCHEDULE_WEEK_PLACEHOLDER = "1";

const buildLessonSchedulePeriodTitle = (weekNumber, month = "__________") =>
  `Сабактардын жүгүртмөсү "${month} "айынын ${weekNumber} жумасы`;

const normalizeThematicAccountTitle = (title = "", isCommand = false, periodNumber) => {
  const rawTitle = String(title || "")
    .replace(THEMATIC_ACCOUNT_YEAR_TEXT, THEMATIC_ACCOUNT_YEAR_PLACEHOLDER)
    .replace(THEMATIC_ACCOUNT_UNIT_TEXT, "");
  const compactTitle = rawTitle.replace(/\s{2,}/g, " ").trim();
  if (isCommand && rawTitle.includes("тематикалык эсеп сааты")) {
    return buildCommandThematicAccountTableTitle(periodNumber);
  }

  const periodMatch = compactTitle.match(/20__-окуу жылынын\s+(\d+)\s+мезгилине/);
  const hasOldTableTitle =
    compactTitle.includes("чек ара заставынын сержанттары") ||
    compactTitle.includes("командирдик даярдык боюнча сабактардын тематикалык эсеп сааты");

  if (periodMatch && hasOldTableTitle) {
    return buildThematicAccountTableTitle(periodMatch[1]);
  }

  if (rawTitle.includes("өздүк курамы") && rawTitle.includes("тематикалык эсеп сааты")) {
    return rawTitle.trim();
  }

  return compactTitle;
};

const isRemovedThematicPeriod = (period) =>
  !String(period?.id || "").startsWith("admin-document-") &&
  (
    REMOVED_THEMATIC_PERIOD_IDS.has(period?.id) ||
    REMOVED_THEMATIC_PERIOD_TITLE_PARTS.some((titlePart) =>
      String(period?.title || "").includes(titlePart)
    )
  );

const normalizeThematicPeriod = (period, sectionId) => {
  const isCommand = sectionId === COMMAND_THEMATIC_ACCOUNT_SECTION_ID;
  const periodNumber = getPeriodNumber(period);

  return {
    ...period,
    title: normalizeThematicAccountTitle(period?.title, isCommand, periodNumber),
    table: period?.table
      ? {
          ...period.table,
          title: normalizeThematicAccountTitle(period.table.title, isCommand, periodNumber),
        }
      : period?.table,
  };
};

const getVisibleThematicPeriods = (periods = EMPTY_ARRAY, sectionId) =>
  periods
    .filter((period) => !isRemovedThematicPeriod(period))
    .map((period) => normalizeThematicPeriod(period, sectionId));

const getTableStorageKey = (scope, sectionId, periodId) =>
  `${TABLE_STORAGE_PREFIX}:${scope || "default"}:${sectionId || "default"}:${periodId || "default"}`;

const getHeaderStorageKey = (tableStorageKey) =>
  tableStorageKey ? `${tableStorageKey}:${TABLE_FIELD_STORAGE_SUFFIX}` : null;

const getActionStorageKey = (tableStorageKey) =>
  tableStorageKey ? `${tableStorageKey}:${TABLE_ACTION_STORAGE_SUFFIX}` : null;

const getTitleStorageKey = (tableStorageKey) =>
  tableStorageKey ? `${tableStorageKey}:title` : null;

const getCustomPeriodsStorageKey = (scope, sectionId, subsectionId) =>
  sectionId
    ? `${CUSTOM_PERIODS_STORAGE_PREFIX}:${scope || "default"}:${sectionId}:${
        subsectionId || "default"
      }`
    : null;

const getStoredRows = (rows, storageKey) => {
  if (!storageKey || typeof window === "undefined") {
    return rows;
  }

  try {
    const savedRows = JSON.parse(window.localStorage.getItem(storageKey) || "[]");

    if (!Array.isArray(savedRows)) {
      return rows;
    }

    const mergedRows = rows.map((row, index) => ({
      ...row,
      ...(savedRows[index] || {}),
      ...(row.number !== undefined ? { number: row.number } : {}),
    }));
    return [...mergedRows, ...savedRows.slice(rows.length)];
  } catch {
    return rows;
  }
};

const getDefaultHeaderValues = (fields = []) =>
  fields.reduce((values, field) => {
    if (field.key) {
      values[field.key] = field.defaultValue ?? "";
    }

    return values;
  }, {});

const getStoredHeaderValues = (fields, storageKey) => {
  const defaults = getDefaultHeaderValues(fields);

  if (!storageKey || typeof window === "undefined") {
    return defaults;
  }

  try {
    const savedValues = JSON.parse(window.localStorage.getItem(storageKey) || "{}");

    if (!savedValues || Array.isArray(savedValues) || typeof savedValues !== "object") {
      return defaults;
    }

    return Object.keys(defaults).reduce(
      (values, key) => ({
        ...values,
        [key]: savedValues[key] ?? defaults[key],
      }),
      defaults
    );
  } catch {
    return defaults;
  }
};

const getStoredTableStatus = (storageKey) => {
  if (!storageKey || typeof window === "undefined") {
    return "editing";
  }

  const savedStatus = window.localStorage.getItem(storageKey);
  return ["editing", "saved", "submitted"].includes(savedStatus) ? savedStatus : "editing";
};

const getStoredTitle = (defaultTitle, storageKey) => {
  if (!storageKey || typeof window === "undefined") {
    return defaultTitle || "";
  }

  try {
    return window.localStorage.getItem(storageKey) || defaultTitle || "";
  } catch {
    return defaultTitle || "";
  }
};

const getSavedTables = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedTables = JSON.parse(window.localStorage.getItem(SAVED_TABLES_STORAGE_KEY) || "[]");
    return Array.isArray(savedTables) ? savedTables : [];
  } catch {
    return [];
  }
};

const upsertSavedTable = (savedTable) => {
  if (typeof window === "undefined" || !savedTable?.id) {
    return;
  }

  const currentTables = getSavedTables();
  const nextTables = [
    savedTable,
    ...currentTables.filter((table) => table.id !== savedTable.id),
  ];

  try {
    window.localStorage.setItem(SAVED_TABLES_STORAGE_KEY, JSON.stringify(nextTables));
  } catch {
    // Saving the table itself should still work if the registry cannot be updated.
  }
};

const getStoredCustomPeriods = (storageKey) => {
  if (!storageKey || typeof window === "undefined") {
    return [];
  }

  try {
    const periods = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    return Array.isArray(periods) ? periods : [];
  } catch {
    return [];
  }
};

const saveCustomPeriods = (storageKey, periods) => {
  if (!storageKey || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(periods));
  } catch {
    // The added table should still open in the current session if storage is unavailable.
  }
};

const removeTableStorage = (scope, sectionId, periodId) => {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = getTableStorageKey(scope, sectionId, periodId);
  [
    storageKey,
    getHeaderStorageKey(storageKey),
    getActionStorageKey(storageKey),
    getTitleStorageKey(storageKey),
  ].forEach((key) => {
    if (key) {
      window.localStorage.removeItem(key);
    }
  });
};

const getEditableHeaderFields = (table) => {
  const headerFields = table?.headerFields || EMPTY_ARRAY;
  const tableHeaderCells = (table?.headerRows || EMPTY_ARRAY)
    .flat()
    .filter((cell) => cell.editableKey)
    .map((cell) => ({
      key: cell.editableKey,
      label: cell.label,
      defaultValue: cell.defaultValue ?? cell.label ?? "",
    }));

  return [...headerFields, ...tableHeaderCells];
};

const createEmptyTableRow = (table, rowNumber) =>
  (table?.columns || EMPTY_ARRAY).reduce((row, column) => {
    row[column.key] = column.key === "number" ? rowNumber : "";
    return row;
  }, {});

const isMultilineColumn = (column) =>
  column.type === "textarea" || column.multiline || MULTILINE_COLUMN_KEYS.has(column.key);

const getNestedSections = (section) => section?.sections || section?.subsections || EMPTY_ARRAY;

const getSubmissionSenderLabel = (submission) => {
  if (submission?.senderRole === "outpost") {
    const outpost = submission.outpostName || submission.senderName || "Застава көрсөтүлгөн эмес";
    const sender = submission.senderName && submission.senderName !== outpost
      ? ` · Жөнөтүүчү: ${submission.senderName}`
      : "";
    return submission.unitNumber
      ? `Застава: ${outpost} · Аскер бөлүгү: ${submission.unitNumber}${sender}`
      : `Застава: ${outpost}${sender}`;
  }

  const militaryUnit = submission?.unitNumber || "көрсөтүлгөн эмес";
  const sender = submission?.senderName ? ` · Жөнөтүүчү: ${submission.senderName}` : "";
  return `Аскер бөлүгү: ${militaryUnit}${sender}`;
};

const hasSectionContent = (section) =>
  Boolean(
    OUTPOST_SUBMISSION_SECTION_IDS.has(section?.id) ||
      section?.table ||
      section?.periods?.length > 0 ||
      getNestedSections(section).length > 0
  );

const createTypicalWeekTable = (title) => ({
  title,
  variant: "typical-week",
  columns: [
    {key: "number", label: "№", width: 64},
    {key: "routine", label: "Күн тартиби", type: "textarea", width: 420},
    {key: "time", label: "Убакыт", width: 180},
    {key: "duration", label: "Узактыгы", width: 180},
  ],
  rows: [
    {number: "1", routine: "", time: "", duration: ""},
  ],
});

const thematicAccountPeriodConfig = {
  adminOnly: true,
  buttonLabel: "+ Таблица кошуу",
  maxPeriods: 2,
  promptLabel: "Таблицанын аталышы",
  getDefaultTitle: (periodNumber) =>
    `20__-окуу жылынын ${periodNumber} мезгилине`,
};
const lessonSchedulePeriodConfig = {
  buttonLabel: "+ Жума кошуу",
  promptLabel: "Жуманын аталышы",
  usesMonthDialog: true,
  usesServerCreate: true,
  getDefaultTitle: (weekNumber) => buildLessonSchedulePeriodTitle(weekNumber),
};
const typicalWeekPeriodConfig = {
  adminOnly: true,
  buttonLabel: "+ Создать",
  promptLabel: "Название",
  usesTextDialog: true,
  createTable: createTypicalWeekTable,
  getDefaultTitle: () => "",
};
const customPeriodConfigs = {
  "command-lesson-schedule": lessonSchedulePeriodConfig,
  "command-thematic-account": thematicAccountPeriodConfig,
  "lesson-schedule": lessonSchedulePeriodConfig,
  "thematic-account": thematicAccountPeriodConfig,
  "typical-week": typicalWeekPeriodConfig,
  "typical-week-military-unit": typicalWeekPeriodConfig,
};

const lessonScheduleDays = [
  ["monday", "Дүйшөмбү"],
  ["tuesday", "Шейшемби"],
  ["wednesday", "Шаршемби"],
  ["thursday", "Бейшемби"],
  ["friday", "Жума"],
  ["saturday", "Ишемби"],
  ["sunday", "Жекшемби"],
  ["methodical", "Методикалык нускамалоо"],
];

const lessonScheduleRows = [
  "Эртең мененки дене тарбия көнүгүүлөрү",
  "Машыгуулар жана маалымдоолор",
  "1-саат",
  "2-саат",
  "3-саат",
  "4-саат",
  "5-саат",
  "6-саат",
  "Техниканы куралды тейлөө",
  "Өздүк даярдануу",
  "Жалпы спорттук иш-чаралар, тарбия иштери",
  "Түнкү сабактар",
  "1-саат",
  "2-саат",
  "3-саат",
];

const thematicAccountMonths = [
  {key: "december", label: "ДЕКАБРЬ", weeks: ["1", "2", "3", "4", "5"]},
  {key: "january", label: "ЯНВАРЬ", weeks: ["1", "2", "3", "4", "5"]},
  {key: "february", label: "ФЕВРАЛЬ", weeks: ["1", "2", "3", "4", "5"]},
  {key: "march", label: "МАРТ", weeks: ["1", "2", "3", "4", "5"]},
  {key: "june", label: "ИЮНЬ", weeks: ["1", "2", "3", "4", "5"]},
  {key: "july", label: "ИЮЛЬ", weeks: ["1", "2", "3", "4", "5"]},
  {key: "august", label: "АВГУСТ", weeks: ["1", "2", "3", "4", "5"]},
  {key: "september", label: "СЕНТЯБРЬ", weeks: ["1", "2", "3", "4", "5"]},
];

const thematicAccountWeekColumns = thematicAccountMonths.flatMap((month) =>
  month.weeks.map((week) => ({
    key: `${month.key}_${week}`,
    label: week,
    width: 54,
  }))
);

const thematicAccountSubjects = [
  {number: "1", topic: "Чек ара аскерлеринин\nтактикасы\n(ЧАВ)", hours: "35"},
  {number: "2", topic: "Тактикалык даярдоо\n(ТД)", hours: "16"},
  {number: "3", topic: "Коомдук мамлекеттик\nдаярдык (ОГП)", hours: "32"},
  {number: "4", topic: "Ок атуу даярдыгы\n(ОП)", hours: "40"},
  {number: "5", topic: "Дене-тарбия даярдыгы\n(ФП)", hours: "26"},
  {number: "6", topic: "Аскердик топография\n(ВТ)", hours: "4"},
  {number: "7", topic: "Инженердик даярдоо", hours: "4"},
  {number: "8", topic: "Радиациялык химиялык\nбиологиялык коргонуу\n(РХБЗ)", hours: "2"},
  {number: "9", topic: "Байланыш боюнча\nдаярдоо (ПиС)", hours: "2"},
  {number: "10", topic: "Саптык даярдоо (СП)", hours: "6"},
  {number: "11", topic: "КР КК жалпы аскердик\nуставы (ОБУ ВС КР)", hours: "6"},
  {number: "12", topic: "Аскердик медициналык\nдаярдоо (ВМП)", hours: "4"},
  {number: "13", topic: "Психологиялык даярдоо\n(ПП)", hours: "2"},
  {number: "14", topic: "Аскердик жана\nмыйзамдык\nукуктардын негиздери\n(ОЗВиП)", hours: "3"},
  {number: "15", topic: "Элдик\nгуманитардык\nукуктардын негиздери\n(ОМГП)", hours: "2"},
  {number: "16", topic: "Өртке каршы даярдоо\n(ППП)", hours: "2"},
  {number: "17", topic: "Кадрлык иштер (КШ)", hours: "6"},
  {number: "18", topic: "Атайын даярдык (СП)", hours: "30"},
  {number: "19", topic: "Жыйынтыгы", hours: "192", rowType: "total"},
];

const thematicAccountTotalHours = [
  "5",
  "12",
  "12",
  "12",
  "12",
  "12",
  "12",
  "12",
  "12",
  "12",
  "12",
  "12",
  "12",
  "12",
  "12",
  "12",
  "12",
  "12",
  "12",
  "7",
];

const firstCommandThematicAccountMonths = [
  {key: "december", label: "ДЕКАБРЬ", slots: ["", ""]},
  {key: "january", label: "ЯНВАРЬ", slots: ["", ""]},
  {key: "february", label: "ФЕВРАЛЬ", slots: ["", ""]},
  {key: "march", label: "МАРТ", slots: ["", ""]},
  {key: "june", label: "ИЮНЬ", slots: ["", ""]},
  {key: "july", label: "ИЮЛЬ", slots: ["", ""]},
  {key: "august", label: "АВГУСТ", slots: ["", ""]},
  {key: "september", label: "СЕНТЯБРЬ", slots: ["", ""]},
];

const secondCommandThematicAccountMonths = [
  {key: "june", label: "ИЮНЬ", slots: ["", ""]},
  {key: "july", label: "ИЮЛЬ", slots: ["", ""]},
  {key: "august", label: "АВГУСТ", slots: ["", ""]},
  {key: "september", label: "СЕНТЯБРЬ", slots: ["", ""]},
  {key: "october", label: "ОКТЯБРЬ", slots: ["", ""]},
];

const getCommandThematicAccountMonths = (periodId) =>
  periodId === "period-1" ? firstCommandThematicAccountMonths : secondCommandThematicAccountMonths;

const buildCommandThematicAccountColumns = (months) => months.flatMap((month) =>
  month.slots.map((slot, index) => ({
    key: `${month.key}_${index + 1}`,
    label: slot,
    type: "textarea",
    rows: 2,
    width: 92,
  }))
);

const createCommandThematicAccountRow = (row) => ({
  number: row.number,
});

const commandThematicAccountSubjects = [
  createCommandThematicAccountRow({
    number: "1",
    topic: "Чек ара черүү тактикасы (ТТП)",
    hours: "4",
    june_1: "1/1/1",
    july_1: "2/1/1",
    august_1: "4/1/1",
  }),
  createCommandThematicAccountRow({
    number: "2",
    topic: "Тактикалык даярдык (ТП)",
    hours: "5",
    june_2: "1/1/1",
    july_2: "2/1/1",
    august_1: "6/1/1",
    september_2: "8/1/1",
  }),
  createCommandThematicAccountRow({
    number: "3",
    topic: "Коомдук-мамлекеттик даярдык",
    hours: "8",
    june_1: "2",
    july_1: "2",
    august_1: "2",
    september_1: "2",
  }),
  createCommandThematicAccountRow({
    number: "4",
    topic: "Ок атуу даярдыгы (ОТ)",
    hours: "8/4",
    june_1: "1/1/2\n1/1/1",
    july_1: "1/2/2\n1/2/1",
    september_1: "5/1/1",
  }),
  createCommandThematicAccountRow({
    number: "5",
    topic: "Техникалык даярдык (Тех.Г):\n- унаа чопкутанк даярдыгы (АБТГ)\n\n- ракета-артиллериялык даярдык",
    topicRows: 4,
    hours: "--/4\n\n4/4",
    hoursRows: 4,
    june_1: "-----\n1/1/1",
    june_2: "1/1/2\n1/1/2",
    july_1: "-----\n2/1/1",
    july_2: "2/1/2\n-----",
    august_1: "5/1/2",
    august_2: "6/1/1",
  }),
  createCommandThematicAccountRow({
    number: "6",
    topic: "Айдоочулук",
    hours: "--/3",
    july_2: "-----\n1/1/1",
    september_2: "-----\n6/1/1",
  }),
  createCommandThematicAccountRow({
    number: "7",
    topic: "Атайын даярдык (СП) *",
    hours: "--/8",
    july_2: "--/1",
    august_2: "2",
    september_2: "2",
  }),
  createCommandThematicAccountRow({
    number: "8",
    topic: "Радиациялык химиялык биологиялык\nкоргонуу (РХБЗ)",
    hours: "1",
    july_1: "1/1/1",
    september_1: "2/1/1",
  }),
  createCommandThematicAccountRow({
    number: "9",
    topic: "Инженердик даярдык (ИП)",
    hours: "3",
    june_2: "1/1/1",
    july_2: "4/1/2",
    august_2: "4/1/2",
    september_2: "5/1/1",
  }),
  createCommandThematicAccountRow({
    number: "10",
    topic: "Байланыш боюнча даярдык (ПиС)",
    hours: "2",
    july_2: "1/1/2",
    september_1: "2/2/1",
  }),
  createCommandThematicAccountRow({
    number: "11",
    topic: "КР КК Аскердик жалпы усулдар\n(ОВУ ВС КР)",
    hours: "13/4",
    june_1: "1/1/1\n1/1/1",
    july_1: "2/1/1\n2/1/1",
    july_2: "3/1/2\n3/1/2",
    august_1: "4/1/1\n-----",
    august_2: "5/1/1\n-----",
    september_1: "6/1/1\n-----",
  }),
  createCommandThematicAccountRow({
    number: "12",
    topic: "Саптык даярдык (СП)",
    hours: "7/5",
    june_2: "1/1/3\n1/1/3",
    august_1: "4/1/1",
    september_1: "6/1/1",
  }),
  createCommandThematicAccountRow({
    number: "13",
    topic: "Дене-тарбия даярдыгы (ФП)",
    hours: "4",
    june_1: "1/1/2",
    july_1: "1/2/1",
    september_2: "2/1/2",
  }),
  createCommandThematicAccountRow({
    number: "14",
    topic: "Аскердик жер-тартыма (ВТ)",
    hours: "1",
    june_2: "1/1/1",
    september_2: "5/1/2",
  }),
  createCommandThematicAccountRow({
    number: "15",
    topic: "Аскердик мыйзам чыгаруунун жана\nукуктун негиздери (ОВЗиП)",
    hours: "4",
    august_2: "4/1/2",
  }),
  createCommandThematicAccountRow({
    number: "16",
    topic: "Ыкмалык даярдык (МП) **",
    hours: "-",
    june_1: "-",
    june_2: "-",
    july_1: "-",
    july_2: "-",
    august_1: "-",
    august_2: "-",
    september_1: "-",
    september_2: "-",
  }),
  createCommandThematicAccountRow({
    number: "17",
    topic: "Жыйынтыгы",
    hours: "64",
    june_1: "16",
    july_1: "16",
    august_1: "16",
    september_1: "16",
    rowType: "total",
  }),
];

const buildThematicAccountLikePhoto = (table, isCommand = false, periodId) => {
  if (!table) {
    return table;
  }

  const months = isCommand ? getCommandThematicAccountMonths(periodId) : thematicAccountMonths;
  const scheduleColumns = isCommand ? buildCommandThematicAccountColumns(months) : thematicAccountWeekColumns;
  const columns = [
    {key: "number", label: "№\nк/м", readOnly: true, width: 42},
    {
      key: "topic",
      label: "Сабактардын\nаталышы",
      type: "textarea",
      rows: isCommand ? 2 : 4,
      width: isCommand ? 420 : 220,
    },
    {
      key: "hours",
      label: "Канча\nсаат",
      type: isCommand ? "textarea" : "number",
      rows: 2,
      width: isCommand ? 76 : 54,
    },
    ...scheduleColumns,
  ];
  const headerRows = isCommand
    ? [
        [
          {key: "number", label: "№\nк/м"},
          {key: "topic", label: "Сабактардын\nаталышы"},
          {key: "hours", label: "Канча\nсаат"},
          ...months.map((month) => ({
            key: month.key,
            label: month.label,
            defaultValue: month.label,
            editableKey: `${month.key}_label`,
            colSpan: month.slots.length,
          })),
        ],
      ]
    : [
        [
          {key: "number", label: "№\nк/м", rowSpan: 2},
          {key: "topic", label: "Сабактардын\nаталышы", rowSpan: 2},
          {key: "hours", label: "Канча\nсаат", rowSpan: 2},
      ...months.map((month) => ({
        key: month.key,
        label: month.label,
        defaultValue: month.label,
        editableKey: `${month.key}_label`,
        colSpan: (month.slots || month.weeks).length,
      })),
        ],
        months.flatMap((month) =>
          month.weeks.map((week) => ({
            key: `${month.key}_${week}`,
            label: week,
          }))
        ),
      ];
  const weekDefaults = thematicAccountWeekColumns.reduce((values, column, index) => {
    values[column.key] = "";
    if (index < thematicAccountTotalHours.length) {
      values[`total_${column.key}`] = thematicAccountTotalHours[index];
    }
    return values;
  }, {});
  const rows = thematicAccountSubjects.map((subject) => {
    const scheduleValues = thematicAccountWeekColumns.reduce((values, column) => {
      values[column.key] = subject.rowType === "total" ? weekDefaults[`total_${column.key}`] || "" : "";
      return values;
    }, {});

    return {
      ...scheduleValues,
      ...subject,
    };
  });
  const commandRows = commandThematicAccountSubjects.map((row) => ({...row}));
  const commandPeriodNumber = String(periodId || "").match(/^period-(\d+)$/)?.[1];

  return {
    ...table,
    columns,
    headerRows,
    rows: isCommand ? commandRows : rows,
    title: normalizeThematicAccountTitle(table.title, isCommand, commandPeriodNumber),
    variant: isCommand ? "command-thematic-account" : "thematic-account",
  };
};

const buildLessonScheduleLikePhoto = (table) => {
  if (!table || table.variant !== "lesson-schedule") {
    return table;
  }

  const columns = [
    {key: "time_marker", label: "Убактысы\nбашталышы\nаякташы", type: "line-list", inputType: "time", lines: 2, width: 56},
    {key: "activity", label: "Аткаруу иш-чарасы", type: "textarea", rows: 4, width: 150},
    ...lessonScheduleDays.flatMap(([dayKey]) => [
      {key: `${dayKey}_activity`, label: "", type: "line-list", lines: 1, maxLines: 20, canAddLines: true, width: 190},
      {key: `${dayKey}_instructor`, label: "Ким өткөрөт", width: 58},
      {key: `${dayKey}_place`, label: "Өткөрүү орду", width: 58},
    ]),
  ];

  const headerRows = [
    [
      {key: "time_marker", label: "Убактысы\nбашталышы\nаякташы", rowSpan: 2},
      {key: "activity", label: "Аткаруу\nиш-чарасы", rowSpan: 2},
      ...lessonScheduleDays.flatMap(([dayKey, label]) => [
        {
          key: `${dayKey}_activity`,
          label: `${label}\n20__ж. «__»____`,
          defaultValue: `${label}\n20__ж. «__»____`,
          editableKey: `${dayKey}_date`,
          rowSpan: 2,
        },
        {key: `${dayKey}_instructor`, label: "Ким өткөрөт", rowSpan: 2},
        {key: `${dayKey}_place`, label: "Өткөрүү орду", rowSpan: 2},
      ]),
    ],
  ];

  const visibleRows = lessonScheduleRows.filter(
    (label, index) =>
      label !== "Техниканы куралды тейлөө" &&
      !(label === "3-саат" && index === lessonScheduleRows.length - 1)
  );

  const rows = visibleRows.map((label) => {
    if (label === "Түнкү сабактар") {
      return {activity: label, rowType: "section"};
    }

    return {
      time_marker: ["", ""],
      activity: label,
      ...lessonScheduleDays.reduce(
        (values, [dayKey]) => ({
          ...values,
          [`${dayKey}_activity`]: "",
          [`${dayKey}_instructor`]: "",
          [`${dayKey}_place`]: "",
        }),
        {}
      ),
    };
  });

  return {
    ...table,
    columns,
    headerFields: [
      {key: "schedule_from_year", defaultValue: "20___"},
      {key: "schedule_from_year_suffix", defaultValue: "-ж."},
      {key: "schedule_from_quote_open", defaultValue: "“"},
      {key: "schedule_from_day", defaultValue: "___"},
      {key: "schedule_from_quote_close", defaultValue: "”"},
      {key: "schedule_from_month", defaultValue: "_______"},
      {key: "schedule_start_label", defaultValue: "баштап"},
      {key: "schedule_to_year", defaultValue: "20____"},
      {key: "schedule_to_year_suffix", defaultValue: "-ж."},
      {key: "schedule_to_quote_open", defaultValue: "“"},
      {key: "schedule_to_day", defaultValue: "___"},
      {key: "schedule_to_quote_close", defaultValue: "”"},
      {key: "schedule_to_month", defaultValue: "________"},
      {key: "schedule_end_label", defaultValue: "чейин"},
      {key: "schedule_unit_name", defaultValue: "______________________________________________"},
      {key: "schedule_unit_caption", defaultValue: "(бөлүкчөнүн аталышы)"},
    ],
    headerRows,
    rows,
    title: "САБАКТАРДЫН ЖҮГҮРТМӨСҮ",
    scheduleTitle: "САБАКТАРДЫН            ЖҮГҮРТМѲСҮ",
    variant: "lesson-schedule",
  };
};

export default function Library({ data, onBack, onRefresh, onSubmissionCreated }) {
  const currentUser = useSelector((state) => state.auth.user);
  const tableViewRef = useRef(null);
  const tableScrollRef = useRef(null);
  const topScrollRef = useRef(null);
  const isScrollSyncingRef = useRef(false);
  const migratedLessonPeriodsRef = useRef(new Set());
  const sections = data?.sections || [];
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedSubsectionId, setSelectedSubsectionId] = useState(null);
  const [selectedNestedSubsectionId, setSelectedNestedSubsectionId] = useState(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [selectedAdminUnitNumber, setSelectedAdminUnitNumber] = useState(null);
  const [selectedAdminOutpostName, setSelectedAdminOutpostName] = useState(null);
  const [customPeriods, setCustomPeriods] = useState([]);
  const [editableRows, setEditableRows] = useState([]);
  const [editableHeaderValues, setEditableHeaderValues] = useState({});
  const [editableTitle, setEditableTitle] = useState("");
  const [tableStatus, setTableStatus] = useState("editing");
  const [tableNotice, setTableNotice] = useState("");
  const [activeCellColor, setActiveCellColor] = useState("");
  const [cellColors, setCellColors] = useState({});
  const [tableScrollWidth, setTableScrollWidth] = useState(1200);
  const [lessonPeriodDraft, setLessonPeriodDraft] = useState(null);
  const [lessonPeriodMonth, setLessonPeriodMonth] = useState("");
  const [lessonPeriodWeek, setLessonPeriodWeek] = useState("");
  const [lessonPeriodError, setLessonPeriodError] = useState("");
  const [isCreatingLessonPeriod, setIsCreatingLessonPeriod] = useState(false);
  const [customTableDraft, setCustomTableDraft] = useState(null);
  const [customTableTitle, setCustomTableTitle] = useState("");
  const [customTableError, setCustomTableError] = useState("");
  const [thematicSubmissions, setThematicSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [submissionDialogOpen, setSubmissionDialogOpen] = useState(false);
  const [submissionDocumentTitle, setSubmissionDocumentTitle] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmittingThematicAccount, setIsSubmittingThematicAccount] = useState(false);
  const [deletingSubmissionId, setDeletingSubmissionId] = useState(null);
  const [forwardingSubmission, setForwardingSubmission] = useState(null);
  const [submissionListError, setSubmissionListError] = useState("");
  const [deletingLessonPeriodId, setDeletingLessonPeriodId] = useState(null);
  const directTable = data?.table;
  const selectedSection = sections.find((section) => section.id === selectedSectionId);
  const selectedSubsections = getNestedSections(selectedSection);
  const selectedSubsection = selectedSubsections.find((section) => section.id === selectedSubsectionId);
  const selectedNestedSubsections = getNestedSections(selectedSubsection);
  const selectedNestedSubsection = selectedNestedSubsections.find(
    (section) => section.id === selectedNestedSubsectionId
  );
  const activePeriodContainer = selectedNestedSubsection || selectedSubsection || selectedSection;
  const activePeriodContainerId = activePeriodContainer?.id;
  const basePeriods = activePeriodContainer?.periods || EMPTY_ARRAY;
  const isThematicAccountTable = THEMATIC_ACCOUNT_SECTION_IDS.has(activePeriodContainerId);
  const isCommandThematicAccountTable = activePeriodContainerId === COMMAND_THEMATIC_ACCOUNT_SECTION_ID;
  const isLessonSchedulePeriodList = LESSON_SCHEDULE_SECTION_IDS.has(activePeriodContainerId);
  const visibleBasePeriods = useMemo(
    () => (isThematicAccountTable ? getVisibleThematicPeriods(basePeriods, activePeriodContainerId) : basePeriods),
    [activePeriodContainerId, basePeriods, isThematicAccountTable]
  );
  const visibleCustomPeriods = useMemo(
    () => {
      if (isLessonSchedulePeriodList) {
        return EMPTY_ARRAY;
      }

      return isThematicAccountTable
        ? getVisibleThematicPeriods(customPeriods, activePeriodContainerId)
        : customPeriods;
    },
    [activePeriodContainerId, customPeriods, isLessonSchedulePeriodList, isThematicAccountTable]
  );
  const customPeriodsStorageKey = getCustomPeriodsStorageKey(
    data?.scope,
    selectedSection?.id,
    [selectedSubsection?.id, selectedNestedSubsection?.id].filter(Boolean).join(":")
  );
  const selectedPeriods = useMemo(
    () => [...visibleBasePeriods, ...visibleCustomPeriods],
    [visibleBasePeriods, visibleCustomPeriods]
  );
  const isRegionalCommandIncomingLocation =
    currentUser?.role === "regional" &&
    selectedSection?.id === "command-training" &&
    selectedSubsection?.id === "command-training-subunits";
  const isRegionalCommandMilitaryUnitLocation =
    currentUser?.role === "regional" &&
    selectedSection?.id === "command-training" &&
    selectedSubsection?.id === "command-training-military-unit";
  const isRegionalTypicalWeekIncomingLocation =
    currentUser?.role === "regional" &&
    selectedSection?.id === "typical-week" &&
    selectedSubsection?.id === "typical-week-subunits";
  const isRegionalTypicalWeekMilitaryUnitLocation =
    currentUser?.role === "regional" &&
    selectedSection?.id === "typical-week" &&
    selectedSubsection?.id === "typical-week-military-unit";
  const submissionSectionId = data?.submissionSectionId || (
    ["typical-week-subunits", "typical-week-military-unit"].includes(activePeriodContainerId)
      ? "typical-week"
      : activePeriodContainerId
  );
  const showsOutpostSubmissions =
    OUTPOST_SUBMISSION_SECTION_IDS.has(submissionSectionId) &&
    (
      currentUser?.role !== "regional" ||
      (
        COMMAND_SUBMISSION_SECTION_IDS.has(submissionSectionId)
          ? isRegionalCommandIncomingLocation
          : submissionSectionId === "typical-week"
            ? activePeriodContainerId === "typical-week" || isRegionalTypicalWeekIncomingLocation
            : true
      )
    );
  const isRegionalIncomingViewer =
    isRegionalCommandIncomingLocation || isRegionalTypicalWeekIncomingLocation;
  const displayedPeriods = isRegionalIncomingViewer ? EMPTY_ARRAY : selectedPeriods;
  const sectionSubmissions = thematicSubmissions.filter(
    (submission) => submission.sectionId === submissionSectionId
  );
  const isAdminGroupedSubmissionSection =
    currentUser?.role === "admin" &&
    ADMIN_GROUPED_SUBMISSION_SECTION_IDS.has(submissionSectionId);
  const adminUnitNumbers = useMemo(
    () => Array.from(new Set([
      ...(data?.unitNumbers || EMPTY_ARRAY),
      ...sectionSubmissions.map((submission) => submission.unitNumber),
    ].map((unitNumber) => String(unitNumber || "").trim()).filter(Boolean))),
    [data?.unitNumbers, sectionSubmissions]
  );
  const selectedAdminUnitSubmissions = isAdminGroupedSubmissionSection
    ? sectionSubmissions.filter(
        (submission) => String(submission.unitNumber) === String(selectedAdminUnitNumber)
      )
    : EMPTY_ARRAY;
  const adminMilitaryUnitSubmissions = selectedAdminUnitSubmissions.filter(
    (submission) => submission.senderRole === "regional"
  );
  const adminOutpostSubmissions = selectedAdminUnitSubmissions.filter(
    (submission) => submission.senderRole === "outpost"
  );
  const adminOutpostNames = useMemo(
    () => Array.from(new Set([
      ...(OUTPOSTS_BY_MILITARY_UNIT[selectedAdminUnitNumber] || []).map(([, name]) =>
        formatOutpostName(name)
      ),
      ...adminOutpostSubmissions.map((submission) => formatOutpostName(submission.outpostName)),
    ].filter(Boolean))),
    [adminOutpostSubmissions, selectedAdminUnitNumber]
  );
  const selectedAdminOutpostSubmissions = selectedAdminOutpostName
    ? adminOutpostSubmissions.filter(
        (submission) => formatOutpostName(submission.outpostName) === selectedAdminOutpostName
      )
    : EMPTY_ARRAY;
  const visibleSubmissions = currentUser?.role === "regional"
    ? sectionSubmissions.filter((submission) => submission.senderRole === "outpost")
    : currentUser?.role === "admin"
      ? ADMIN_GROUPED_SUBMISSION_SECTION_IDS.has(submissionSectionId)
        ? sectionSubmissions
        : sectionSubmissions.filter((submission) => submission.senderRole === "regional")
      : sectionSubmissions;
  const outgoingRegionalSubmissions = currentUser?.role === "regional"
    ? sectionSubmissions.filter((submission) => submission.senderRole === "regional")
    : EMPTY_ARRAY;
  const showsRegionalOutgoingSubmissions =
    currentUser?.role === "regional" &&
    OUTPOST_SUBMISSION_SECTION_IDS.has(submissionSectionId) &&
    (
      showsOutpostSubmissions ||
      isRegionalCommandMilitaryUnitLocation ||
      isRegionalTypicalWeekMilitaryUnitLocation
    );
  const selectedPeriod = selectedPeriods.find((period) => period.id === selectedPeriodId);
  const selectedPeriodNumber = getPeriodNumber(selectedPeriod);
  const sourceSelectedTable =
    selectedSubmission?.table ||
    directTable ||
    selectedPeriod?.table ||
    selectedNestedSubsection?.table ||
    selectedSubsection?.table ||
    selectedSection?.table;
  const shouldUseLessonSchedulePhotoLayout =
    activePeriodContainerId === "lesson-schedule" ||
    activePeriodContainerId === "command-lesson-schedule";
  const selectedTable = useMemo(
    () => {
      if (selectedSubmission) {
        return sourceSelectedTable;
      }

      if (isThematicAccountTable) {
        return buildThematicAccountLikePhoto(
          sourceSelectedTable,
          isCommandThematicAccountTable,
          selectedPeriod?.id,
        );
      }

      return shouldUseLessonSchedulePhotoLayout
        ? buildLessonScheduleLikePhoto(sourceSelectedTable)
        : sourceSelectedTable;
    },
    [
      isCommandThematicAccountTable,
      isThematicAccountTable,
      selectedSubmission,
      selectedPeriod?.id,
      activePeriodContainerId,
      shouldUseLessonSchedulePhotoLayout,
      sourceSelectedTable,
    ]
  );
  const tableColumns = selectedTable?.columns || EMPTY_ARRAY;
  const tableHeaderFields = selectedTable?.headerFields || EMPTY_ARRAY;
  const tableOwnerId = [
    selectedSection?.id,
    selectedSubsection?.id,
    selectedNestedSubsection?.id,
  ].filter(Boolean).join(":");
  const baseTableStorageKey = selectedTable
    ? data?.tableStorageKey ||
      getTableStorageKey(
        data?.scope,
        directTable ? data?.id || selectedTable?.id : tableOwnerId,
        selectedSubmission ? `submission-${selectedSubmission.id}` : selectedPeriod?.id
      )
    : null;
  const isThematicAccountPhotoTable =
    selectedTable?.variant === "thematic-account" ||
    selectedTable?.variant === "command-thematic-account";
  const isCommandThematicAccountPhotoTable = selectedTable?.variant === "command-thematic-account";
  const tableStorageKey =
    baseTableStorageKey && selectedTable?.variant === "lesson-schedule"
      ? `${baseTableStorageKey}:photo-layout-v10`
      : baseTableStorageKey && selectedTable?.variant === "command-thematic-account"
        ? `${baseTableStorageKey}:command-thematic-photo-v3`
      : baseTableStorageKey && isThematicAccountPhotoTable
        ? `${baseTableStorageKey}:thematic-photo-v1`
      : baseTableStorageKey;
  const headerStorageKey = data?.headerStorageKey || getHeaderStorageKey(tableStorageKey);
  const titleStorageKey = getTitleStorageKey(tableStorageKey);
  const tableActionStorageKey = data?.tableActionStorageKey || getActionStorageKey(tableStorageKey);
  const cellColorStorageKey = tableStorageKey ? `${tableStorageKey}:cell-colors` : null;
  const isViewingSubmission = Boolean(selectedSubmission) || Boolean(data?.readOnly);
  const isTableEditing = tableStatus === "editing" && !isViewingSubmission;
  const isSubmitDisabled = data?.disableSubmit || tableStatus === "submitted" || isViewingSubmission;
  const customPeriodConfig = customPeriodConfigs[activePeriodContainerId];
  const isAdmin = currentUser?.role === "admin";
  const canAddCustomPeriod = Boolean(
    customPeriodConfig &&
      (!customPeriodConfig.adminOnly || isAdmin) &&
      (isAdmin ||
        customPeriodConfig.usesServerCreate ||
        customPeriodConfig.createTable ||
        selectedPeriods.some((period) => period.table)) &&
      (!customPeriodConfig.maxPeriods || selectedPeriods.length < customPeriodConfig.maxPeriods)
  );
  const canManageCustomPeriods = Boolean(customPeriodConfig && isAdmin);

  useEffect(() => {
    setSelectedSectionId(null);
    setSelectedSubsectionId(null);
    setSelectedNestedSubsectionId(null);
    setSelectedPeriodId(null);
    setSelectedSubmission(null);
    setSelectedAdminUnitNumber(null);
    setSelectedAdminOutpostName(null);
  }, [data?.title, data?.scope]);

  useEffect(() => {
    if (
      !["outpost", "regional", "admin"].includes(currentUser?.role) ||
      !OUTPOST_SUBMISSION_SECTION_IDS.has(submissionSectionId)
    ) {
      setThematicSubmissions([]);
      return undefined;
    }

    let isActive = true;
    getThematicAccountSubmissions()
      .then((items) => {
        if (isActive) {
          setThematicSubmissions(Array.isArray(items) ? items : []);
        }
      })
      .catch(() => {
        if (isActive) {
          setThematicSubmissions([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [currentUser?.id, currentUser?.role, submissionSectionId]);

  useEffect(() => {
    setSelectedSubsectionId(null);
    setSelectedNestedSubsectionId(null);
    setSelectedPeriodId(null);
    setSelectedSubmission(null);
    setSelectedAdminUnitNumber(null);
    setSelectedAdminOutpostName(null);
  }, [selectedSectionId]);

  useEffect(() => {
    setSelectedNestedSubsectionId(null);
    setSelectedPeriodId(null);
    setSelectedSubmission(null);
    setSelectedAdminUnitNumber(null);
    setSelectedAdminOutpostName(null);
  }, [selectedSubsectionId]);

  useEffect(() => {
    setSelectedPeriodId(null);
    setSelectedSubmission(null);
    setSelectedAdminUnitNumber(null);
    setSelectedAdminOutpostName(null);
  }, [selectedNestedSubsectionId]);

  useEffect(() => {
    setLessonPeriodDraft(null);
    setLessonPeriodMonth("");
    setLessonPeriodWeek("");
    setLessonPeriodError("");
    setIsCreatingLessonPeriod(false);
    setCustomTableDraft(null);
    setCustomTableTitle("");
    setCustomTableError("");
  }, [
    data?.scope,
    data?.title,
    selectedSectionId,
    selectedSubsectionId,
    selectedNestedSubsectionId,
  ]);

  useEffect(() => {
    if (isLessonSchedulePeriodList) {
      const storedPeriods = getStoredCustomPeriods(customPeriodsStorageKey);
      setCustomPeriods([]);

      if (
        storedPeriods.length > 0 &&
        activePeriodContainerId &&
        !migratedLessonPeriodsRef.current.has(customPeriodsStorageKey)
      ) {
        migratedLessonPeriodsRef.current.add(customPeriodsStorageKey);

        const existingTitles = new Set(basePeriods.map((period) => period.title));
        const periodsToMigrate = storedPeriods.filter(
          (period) => period?.title && !existingTitles.has(period.title)
        );

        if (periodsToMigrate.length === 0) {
          saveCustomPeriods(customPeriodsStorageKey, []);
          return;
        }

        const migrateLessonPeriods = async () => {
          try {
            for (const period of periodsToMigrate) {
              const weekMatch = String(period.title || "").match(/(\d+)\s*жумасы/);
              await createLessonSchedulePeriod({
                section: activePeriodContainerId,
                title: period.title,
                weekNumber: weekMatch?.[1] || "",
              });
            }

            saveCustomPeriods(customPeriodsStorageKey, []);

            if (onRefresh) {
              await onRefresh();
            }
          } catch {
            migratedLessonPeriodsRef.current.delete(customPeriodsStorageKey);
          }
        };

        migrateLessonPeriods();
      }

      return;
    }

    const storedPeriods = getStoredCustomPeriods(customPeriodsStorageKey);
    const nextPeriods = isThematicAccountTable
      ? getVisibleThematicPeriods(storedPeriods, activePeriodContainerId)
      : storedPeriods;

    setCustomPeriods(nextPeriods);

    if (
      isThematicAccountTable &&
      JSON.stringify(nextPeriods) !== JSON.stringify(storedPeriods)
    ) {
      saveCustomPeriods(customPeriodsStorageKey, nextPeriods);
    }
  }, [
    basePeriods,
    customPeriodsStorageKey,
    activePeriodContainerId,
    isLessonSchedulePeriodList,
    isThematicAccountTable,
    onRefresh,
    activePeriodContainerId,
  ]);

  useEffect(() => {
    setEditableRows(selectedTable ? getStoredRows(selectedTable.rows || [], tableStorageKey) : []);
  }, [selectedTable, tableStorageKey]);

  useEffect(() => {
    setEditableHeaderValues(
      selectedTable ? getStoredHeaderValues(getEditableHeaderFields(selectedTable), headerStorageKey) : {}
    );
  }, [selectedTable, headerStorageKey]);

  useEffect(() => {
    const storedTitle = selectedTable
      ? getStoredTitle(selectedTable.scheduleTitle || selectedTable.title, titleStorageKey)
      : "";

    setEditableTitle(
      isThematicAccountTable
        ? normalizeThematicAccountTitle(storedTitle, isCommandThematicAccountTable, selectedPeriodNumber)
        : storedTitle
    );
  }, [
    isCommandThematicAccountTable,
    isThematicAccountTable,
    selectedPeriodNumber,
    selectedTable,
    titleStorageKey,
  ]);

  useEffect(() => {
    setTableStatus(selectedTable ? getStoredTableStatus(tableActionStorageKey) : "editing");
    setTableNotice("");
  }, [selectedTable, tableActionStorageKey]);

  useEffect(() => {
    setActiveCellColor("");
    if (!selectedTable?.enableCellColoring || !cellColorStorageKey || typeof window === "undefined") {
      setCellColors({});
      return;
    }

    if (selectedTable.cellColors && typeof selectedTable.cellColors === "object") {
      setCellColors(selectedTable.cellColors);
      return;
    }

    try {
      const storedColors = JSON.parse(window.localStorage.getItem(cellColorStorageKey) || "{}");
      setCellColors(storedColors && typeof storedColors === "object" ? storedColors : {});
    } catch {
      setCellColors({});
    }
  }, [cellColorStorageKey, selectedTable?.cellColors, selectedTable?.enableCellColoring]);

  useEffect(() => {
    const updateScrollWidth = () => {
      const table = tableScrollRef.current?.querySelector("table");
      const measuredWidth = table?.scrollWidth || tableScrollRef.current?.scrollWidth || 0;
      const fallbackWidth = Math.max(
        tableColumns.reduce((total, column) => total + (column.width || 120), 0),
        selectedTable?.variant === "combat-subject-journal" ? 2588 : 0,
        selectedTable?.variant === "command-thematic-account" ? 1500 : 0,
        selectedTable?.variant === "thematic-account" ? 1810 : 0,
        selectedTable?.variant === "lesson-schedule" ? 2664 : 1200
      );

      setTableScrollWidth(Math.max(measuredWidth, fallbackWidth));
    };

    updateScrollWidth();
    window.requestAnimationFrame(updateScrollWidth);
    window.addEventListener("resize", updateScrollWidth);

    return () => window.removeEventListener("resize", updateScrollWidth);
  }, [editableRows.length, selectedTable, tableColumns]);

  useEffect(() => {
    if (!tableStorageKey || editableRows.length === 0 || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(tableStorageKey, JSON.stringify(editableRows));
    } catch {
      // Editing should keep working even if browser storage is unavailable.
    }
  }, [editableRows, tableStorageKey]);

  useEffect(() => {
    if (
      !headerStorageKey ||
      getEditableHeaderFields(selectedTable).length === 0 ||
      typeof window === "undefined"
    ) {
      return;
    }

    try {
      window.localStorage.setItem(headerStorageKey, JSON.stringify(editableHeaderValues));
    } catch {
      // Editing should keep working even if browser storage is unavailable.
    }
  }, [editableHeaderValues, headerStorageKey, selectedTable]);

  useEffect(() => {
    if (!titleStorageKey || !selectedTable || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(titleStorageKey, editableTitle);
    } catch {
      // Editing should keep working even if browser storage is unavailable.
    }
  }, [editableTitle, selectedTable, titleStorageKey]);

  const handleCellChange = (rowIndex, columnKey, value) => {
    setEditableRows((currentRows) =>
      currentRows.map((row, index) => (index === rowIndex ? { ...row, [columnKey]: value } : row))
    );
  };

  const handlePaintJournalCell = (rowIndex, columnKey) => {
    if (
      !activeCellColor ||
      !selectedTable?.enableCellColoring ||
      !/^attendance_\d+$/.test(columnKey)
    ) {
      return;
    }

    const cellKey = `${rowIndex}:${columnKey}`;
    setCellColors((currentColors) => {
      const nextColors = { ...currentColors };
      if (nextColors[cellKey] === activeCellColor) {
        delete nextColors[cellKey];
      } else {
        nextColors[cellKey] = activeCellColor;
      }

      if (cellColorStorageKey && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(cellColorStorageKey, JSON.stringify(nextColors));
        } catch {
          // Coloring should continue to work if browser storage is unavailable.
        }
      }
      return nextColors;
    });
  };

  const handleCellLineChange = (rowIndex, column, lineIndex, value) => {
    setEditableRows((currentRows) =>
      currentRows.map((row, index) => {
        if (index !== rowIndex) {
          return row;
        }

        const currentValue = Array.isArray(row[column.key])
          ? row[column.key]
          : String(row[column.key] || "").split("\n");
        const minLines = column.lines || 1;
        const nextValue = Array.from(
          {length: Math.max(minLines, currentValue.length, lineIndex + 1)},
          (_, itemIndex) => currentValue[itemIndex] || ""
        );
        nextValue[lineIndex] = value;

        return {...row, [column.key]: nextValue};
      })
    );
  };

  const handleAddCellLine = (rowIndex, column) => {
    setEditableRows((currentRows) =>
      currentRows.map((row, index) => {
        if (index !== rowIndex) {
          return row;
        }

        const currentValue = Array.isArray(row[column.key])
          ? row[column.key]
          : String(row[column.key] || "").split("\n");
        const maxLines = column.maxLines || 20;

        if (currentValue.length >= maxLines) {
          return row;
        }

        return {...row, [column.key]: [...currentValue, ""]};
      })
    );
  };

  const handleRemoveCellLine = (rowIndex, column, lineIndex) => {
    setEditableRows((currentRows) =>
      currentRows.map((row, index) => {
        if (index !== rowIndex) {
          return row;
        }

        const currentValue = Array.isArray(row[column.key])
          ? row[column.key]
          : String(row[column.key] || "").split("\n");
        const minLines = column.lines || 1;

        if (currentValue.length <= minLines) {
          return row;
        }

        return {
          ...row,
          [column.key]: currentValue.filter((_, itemIndex) => itemIndex !== lineIndex),
        };
      })
    );
  };

  const handleHeaderFieldChange = (fieldKey, value) => {
    setEditableHeaderValues((currentValues) => ({
      ...currentValues,
      [fieldKey]: value,
    }));
  };

  const handleTitleChange = (event) => {
    setEditableTitle(event.target.value);
  };

  const handleEditableCellKeyDown = (event) => {
    if (event.key !== "Tab") {
      return;
    }

    const tableView = event.currentTarget.closest(".module-table-view");
    const editableCells = Array.from(
      tableView?.querySelectorAll('[data-table-cell="true"]') || []
    );
    const currentIndex = editableCells.indexOf(event.currentTarget);

    if (currentIndex === -1) {
      return;
    }

    event.preventDefault();
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex =
      (currentIndex + direction + editableCells.length) % editableCells.length;
    editableCells[nextIndex]?.focus();
  };

  const syncHorizontalScroll = (source, targetRef) => {
    const target = targetRef.current;

    if (!target || isScrollSyncingRef.current) {
      return;
    }

    isScrollSyncingRef.current = true;
    target.scrollLeft = source.scrollLeft;
    window.requestAnimationFrame(() => {
      isScrollSyncingRef.current = false;
    });
  };

  const handleAddTableRow = () => {
    if (!selectedTable) {
      return;
    }

    setEditableRows((currentRows) => [
      ...currentRows,
      createEmptyTableRow(
        selectedTable,
        currentRows.filter((row) => row.rowType !== "section").length + 1
      ),
    ]);
  };

  const handleAddTableSection = () => {
    setEditableRows((currentRows) => [
      ...currentRows,
      {rowType: "section", activity: "Секция"},
    ]);
  };

  const handleDeleteTableSection = () => {
    setEditableRows((currentRows) => {
      const lastSectionIndex = currentRows.reduce(
        (foundIndex, row, index) => (row.rowType === "section" ? index : foundIndex),
        -1
      );

      return lastSectionIndex === -1
        ? currentRows
        : currentRows.filter((_, index) => index !== lastSectionIndex);
    });
  };

  const handleDeleteTableRow = () => {
    setEditableRows((currentRows) => currentRows.slice(0, -1));
  };

  const addCustomPeriodFromTemplate = (title, templatePeriod) => {
    const periodId = `custom-${Date.now()}`;
    const table = customPeriodConfig.createTable
      ? customPeriodConfig.createTable(title)
      : JSON.parse(JSON.stringify(templatePeriod.table));
    table.title = title;

    const nextCustomPeriod = {
      id: periodId,
      title,
      table,
    };
    const nextCustomPeriods = [...customPeriods, nextCustomPeriod];

    setCustomPeriods(nextCustomPeriods);
    saveCustomPeriods(customPeriodsStorageKey, nextCustomPeriods);
    setSelectedPeriodId(periodId);
  };

  const handleAddCustomPeriod = async () => {
    if (typeof window === "undefined") {
      return;
    }

    const templatePeriod = basePeriods.find((period) => period.table);

    if (
      !templatePeriod &&
      !isAdmin &&
      !customPeriodConfig.usesServerCreate &&
      !customPeriodConfig.createTable
    ) {
      return;
    }

    const nextPeriodNumber = selectedPeriods.length + 1;

    if (customPeriodConfig.usesMonthDialog) {
      setLessonPeriodDraft({
        templatePeriod,
        weekNumber: nextPeriodNumber,
      });
      setLessonPeriodMonth(LESSON_SCHEDULE_MONTH_PLACEHOLDER);
      setLessonPeriodWeek(String(nextPeriodNumber));
      setLessonPeriodError("");
      return;
    }

    if (customPeriodConfig.usesTextDialog) {
      setCustomTableDraft({templatePeriod});
      setCustomTableTitle(customPeriodConfig.getDefaultTitle(nextPeriodNumber));
      setCustomTableError("");
      return;
    }

    const defaultTitle = customPeriodConfig.getDefaultTitle(nextPeriodNumber);
    const title = window.prompt(customPeriodConfig.promptLabel, defaultTitle)?.trim();

    if (!title) {
      return;
    }

    if (isAdmin) {
      try {
        await createLibraryPeriod({section: activePeriodContainerId, title});
        if (onRefresh) await onRefresh();
      } catch (error) {
        setTableNotice(getApiErrorMessage(error, "Не удалось добавить документ."));
      }
      return;
    }

    addCustomPeriodFromTemplate(title, templatePeriod);
  };

  const closeCustomTableDialog = () => {
    setCustomTableDraft(null);
    setCustomTableTitle("");
    setCustomTableError("");
  };

  const handleCreateCustomTable = async () => {
    const title = customTableTitle.trim();

    if (!title) {
      setCustomTableError("Введите название.");
      return;
    }

    if (isAdmin) {
      try {
        await createLibraryPeriod({
          section: activePeriodContainerId,
          title,
          table: customPeriodConfig.createTable?.(title),
        });
        if (onRefresh) await onRefresh();
        closeCustomTableDialog();
      } catch (error) {
        setCustomTableError(getApiErrorMessage(error, "Не удалось создать документ."));
      }
      return;
    }

    addCustomPeriodFromTemplate(title, customTableDraft?.templatePeriod);
    closeCustomTableDialog();
  };

  const closeLessonPeriodDialog = () => {
    setLessonPeriodDraft(null);
    setLessonPeriodMonth("");
    setLessonPeriodWeek("");
    setLessonPeriodError("");
    setIsCreatingLessonPeriod(false);
  };

  const handleCreateLessonPeriod = async () => {
    if (!lessonPeriodDraft) {
      return;
    }

    const weekNumber = lessonPeriodWeek.trim() || LESSON_SCHEDULE_WEEK_PLACEHOLDER;
    const title = buildLessonSchedulePeriodTitle(
      weekNumber,
      lessonPeriodMonth.trim() || "__________"
    );

    setIsCreatingLessonPeriod(true);
    setLessonPeriodError("");

    try {
      if (isAdmin) {
        await createLibraryPeriod({section: activePeriodContainerId, title});
      } else {
        await createLessonSchedulePeriod({
          section: activePeriodContainerId,
          title,
          weekNumber,
        });
      }

      if (onRefresh) {
        await onRefresh();
      }

      closeLessonPeriodDialog();
    } catch (error) {
      setLessonPeriodError(
        getApiErrorMessage(error, "Не удалось добавить неделю.")
      );
    } finally {
      setIsCreatingLessonPeriod(false);
    }
  };

  const handleRenameCustomPeriod = async (period) => {
    if (typeof window === "undefined" || !canManageCustomPeriods) {
      return;
    }

    const title = window.prompt("Таблицанын аталышы", period.title)?.trim();

    if (!title) {
      return;
    }

    if (period.canEdit) {
      try {
        await updateLibraryPeriod(activePeriodContainerId, period.id, {title});
        if (onRefresh) await onRefresh();
      } catch (error) {
        setTableNotice(getApiErrorMessage(error, "Не удалось изменить название."));
      }
      return;
    }

    const nextCustomPeriods = customPeriods.map((customPeriod) =>
      customPeriod.id === period.id
        ? {
            ...customPeriod,
            title,
            table: {
              ...customPeriod.table,
              title,
            },
          }
        : customPeriod
    );

    setCustomPeriods(nextCustomPeriods);
    saveCustomPeriods(customPeriodsStorageKey, nextCustomPeriods);
  };

  const handleDeleteCustomPeriod = async (period) => {
    if (typeof window === "undefined" || !canManageCustomPeriods) {
      return;
    }

    const shouldDelete = window.confirm(`"${period.title}" өчүрүлсүнбү?`);

    if (!shouldDelete) {
      return;
    }

    if (period.canDelete) {
      setDeletingLessonPeriodId(period.id);
      try {
        await deleteLibraryPeriod(activePeriodContainerId, period.id);
        if (selectedPeriodId === period.id) setSelectedPeriodId(null);
        if (onRefresh) await onRefresh();
      } catch (error) {
        setTableNotice(getApiErrorMessage(error, "Не удалось удалить документ."));
      } finally {
        setDeletingLessonPeriodId(null);
      }
      return;
    }

    const nextCustomPeriods = customPeriods.filter((customPeriod) => customPeriod.id !== period.id);

    setCustomPeriods(nextCustomPeriods);
    saveCustomPeriods(customPeriodsStorageKey, nextCustomPeriods);
    removeTableStorage(data?.scope, selectedSection?.id, period.id);

    if (selectedPeriodId === period.id) {
      setSelectedPeriodId(null);
    }
  };

  const persistCurrentTable = (nextStatus) => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      if (tableStorageKey) {
        window.localStorage.setItem(tableStorageKey, JSON.stringify(editableRows));
      }

      if (headerStorageKey) {
        window.localStorage.setItem(headerStorageKey, JSON.stringify(editableHeaderValues));
      }

      if (titleStorageKey) {
        window.localStorage.setItem(titleStorageKey, editableTitle);
      }

      if (tableActionStorageKey) {
        window.localStorage.setItem(tableActionStorageKey, nextStatus);
      }
    } catch {
      // Buttons should not break editing if browser storage is unavailable.
    }
  };

  const buildCurrentSubmissionTable = () => {
    const submittedHeaderFields = (selectedTable?.headerFields || []).map((field) => ({
      ...field,
      defaultValue: field.key
        ? editableHeaderValues[field.key] ?? field.defaultValue ?? ""
        : field.defaultValue,
    }));
    const submittedHeaderRows = (selectedTable?.headerRows || []).map((row) =>
      row.map((cell) => ({
        ...cell,
        defaultValue: cell.editableKey
          ? editableHeaderValues[cell.editableKey] ?? cell.defaultValue ?? cell.label ?? ""
          : cell.defaultValue,
      }))
    );

    return {
      ...selectedTable,
      title: editableTitle || selectedTable?.title || "",
      rows: editableRows,
      cellColors,
      headerFields: submittedHeaderFields,
      headerRows: submittedHeaderRows,
    };
  };

  const handleTableSave = async () => {
    persistCurrentTable("saved");
    upsertSavedTable({
      id: tableStorageKey,
      title: editableTitle || selectedTable?.title || selectedPeriod?.title || selectedSection?.title || data?.title,
      savedAt: new Date().toISOString(),
      scope: data?.scope,
      table: selectedTable ? {...selectedTable, title: editableTitle || selectedTable.title} : selectedTable,
      tableStorageKey,
      headerStorageKey,
      tableActionStorageKey,
    });
    setTableStatus("saved");
    setTableNotice("Таблица сохранена.");

    if (data?.autoSubmitOnSave && currentUser?.role === "outpost") {
      setIsSubmittingThematicAccount(true);
      try {
        const submission = await createThematicAccountSubmission({
          documentTitle:
            data?.submissionDocumentTitle || editableTitle || selectedTable?.title || data?.title,
          sectionId: submissionSectionId,
          periodId: data?.submissionPeriodId || "",
          table: buildCurrentSubmissionTable(),
        });
        setThematicSubmissions((items) => [
          submission,
          ...items.filter((item) => item.id !== submission.id),
        ]);
        setTableNotice("Заполнено. Журнал сохранён и отправлен.");
      } catch (error) {
        setTableNotice(
          getApiErrorMessage(error, "Журнал сохранён локально, но отправить его не удалось.")
        );
      } finally {
        setIsSubmittingThematicAccount(false);
      }
    }
  };

  const markCurrentTableSubmitted = () => {
    persistCurrentTable("submitted");
    setTableStatus("submitted");
    setTableNotice("Таблица отправлена.");
  };

  const resetCurrentTableToDefaults = () => {
    if (!selectedTable) {
      return;
    }

    if (typeof window !== "undefined") {
      try {
        [
          tableStorageKey,
          headerStorageKey,
          titleStorageKey,
          tableActionStorageKey,
          cellColorStorageKey,
        ].forEach((key) => {
          if (key) {
            window.localStorage.removeItem(key);
          }
        });

        const remainingSavedTables = getSavedTables().filter(
          (savedTable) => savedTable.id !== tableStorageKey
        );
        window.localStorage.setItem(
          SAVED_TABLES_STORAGE_KEY,
          JSON.stringify(remainingSavedTables)
        );
      } catch {
        // The in-memory reset below should still complete if storage is unavailable.
      }
    }

    setEditableRows((selectedTable.rows || []).map((row) => ({ ...row })));
    setEditableHeaderValues(
      getDefaultHeaderValues(getEditableHeaderFields(selectedTable))
    );
    setEditableTitle(selectedTable.scheduleTitle || selectedTable.title || "");
    setCellColors({});
    setActiveCellColor("");
    setTableStatus("editing");
    setTableNotice("Таблица отправлена и очищена.");
  };

  const completeCurrentTableSubmission = () => {
    if (selectedTable?.variant === "lesson-schedule") {
      resetCurrentTableToDefaults();
      return;
    }

    markCurrentTableSubmitted();
  };

  const handleTableSend = () => {
    const canCreateSubmission = ["outpost", "regional"].includes(currentUser?.role);

    if (canCreateSubmission && OUTPOST_SUBMISSION_SECTION_IDS.has(submissionSectionId) && !selectedSubmission) {
      setSubmissionDocumentTitle("");
      setSubmissionError("");
      setSubmissionDialogOpen(true);
      return;
    }

    completeCurrentTableSubmission();
  };

  const handleSubmitThematicAccount = async () => {
    const documentTitle = submissionDocumentTitle.trim();
    if (!documentTitle) {
      setSubmissionError("Иш кагаздардын аталышын жазыңыз.");
      return;
    }

    setIsSubmittingThematicAccount(true);
    setSubmissionError("");
    const shouldResetLessonSchedule = selectedTable?.variant === "lesson-schedule";
    try {
      const submission = await createThematicAccountSubmission({
        documentTitle,
        sectionId: submissionSectionId,
        periodId: data?.submissionPeriodId || selectedPeriod?.id || "",
        table: buildCurrentSubmissionTable(),
      });
      completeCurrentTableSubmission();
      setThematicSubmissions((items) => [
        submission,
        ...items.filter((item) => item.id !== submission.id),
      ]);
      if (shouldResetLessonSchedule) {
        setSelectedSubmission(null);
        setSelectedPeriodId(null);
      } else {
        setSelectedSubmission(submission);
      }
      setSubmissionDialogOpen(false);
      setSubmissionDocumentTitle("");
      onSubmissionCreated?.(submission);
    } catch (error) {
      setSubmissionError(
        getApiErrorMessage(error, "Таблицаны жөнөтүү мүмкүн болгон жок.")
      );
    } finally {
      setIsSubmittingThematicAccount(false);
    }
  };

  const handleDeleteSubmission = async (submission) => {
    if (!window.confirm(`"${submission.documentTitle}" өчүрүлсүнбү?`)) {
      return;
    }

    setDeletingSubmissionId(submission.id);
    setSubmissionListError("");
    try {
      await deleteThematicAccountSubmission(submission.id);
      setThematicSubmissions((items) =>
        items.filter((item) => item.id !== submission.id)
      );
      if (selectedSubmission?.id === submission.id) {
        setSelectedSubmission(null);
      }
    } catch (error) {
      setSubmissionListError(
        getApiErrorMessage(error, "Документти өчүрүү мүмкүн болгон жок.")
      );
    } finally {
      setDeletingSubmissionId(null);
    }
  };

  const handleForwardSubmission = async (submission, documentTitle) => {
    const forwarded = await forwardThematicAccountSubmission(submission.id, documentTitle);
    setThematicSubmissions((items) => [
      forwarded,
      ...items.filter((item) => item.id !== forwarded.id),
    ]);
  };

  const handleDeleteLessonPeriod = async (period) => {
    if (!window.confirm(`"${period.title}" өчүрүлсүнбү?`)) {
      return;
    }

    setDeletingLessonPeriodId(period.id);
    setSubmissionListError("");
    try {
      await deleteLessonSchedulePeriod(activePeriodContainerId, period.id);
      if (selectedPeriodId === period.id) {
        setSelectedPeriodId(null);
      }
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      setSubmissionListError(
        getApiErrorMessage(error, "Жуманы өчүрүү мүмкүн болгон жок.")
      );
    } finally {
      setDeletingLessonPeriodId(null);
    }
  };

  const handleTableEdit = () => {
    persistCurrentTable("editing");
    setTableStatus("editing");
    setTableNotice("Редактирование включено.");
  };

  const handleTableBack = () => {
    if (selectedSubmission) {
      setSelectedSubmission(null);
      return;
    }

    if (selectedPeriodId) {
      setSelectedPeriodId(null);
      return;
    }

    if (selectedNestedSubsectionId) {
      setSelectedNestedSubsectionId(null);
      return;
    }

    if (selectedSubsectionId) {
      setSelectedSubsectionId(null);
      return;
    }

    setSelectedSectionId(null);
  };

  const handlePeriodListBack = () => {
    if (selectedNestedSubsectionId) {
      setSelectedNestedSubsectionId(null);
      return;
    }

    if (selectedSubsectionId) {
      setSelectedSubsectionId(null);
      return;
    }

    setSelectedSectionId(null);
  };

  const renderTableHeader = () => {
    if (selectedTable?.headerRows?.length > 0) {
      return selectedTable.headerRows.map((headerRow, rowIndex) => (
        <tr key={`header-row-${rowIndex}`}>
          {headerRow.map((cell, cellIndex) => (
            <th
              className={cell.key ? `training-table-header--${cell.key}` : undefined}
              colSpan={cell.colSpan || undefined}
              key={cell.key || `${rowIndex}-${cellIndex}`}
              rowSpan={cell.rowSpan || undefined}
            >
              {cell.editableKey ? (
                selectedTable?.variant === "lesson-schedule" && cell.editableKey.endsWith("_date") ? (
                  <textarea
                    aria-label={cell.label}
                    className="training-table-header-input training-table-header-input--date"
                    disabled={!isTableEditing}
                    onChange={(event) => handleHeaderFieldChange(cell.editableKey, event.target.value)}
                    rows={2}
                    value={String(
                      editableHeaderValues[cell.editableKey] ?? cell.defaultValue ?? cell.label ?? ""
                    ).replace(/([^\n])(20__ж\.)/, "$1\n$2")}
                  />
                ) : (
                  <input
                    aria-label={cell.label}
                    className="training-table-header-input"
                    disabled={!isTableEditing}
                    onChange={(event) => handleHeaderFieldChange(cell.editableKey, event.target.value)}
                    type="text"
                    value={editableHeaderValues[cell.editableKey] ?? cell.defaultValue ?? cell.label ?? ""}
                  />
                )
              ) : (
                cell.vertical ? (
                  <span className="training-table-header-vertical">{cell.label}</span>
                ) : (
                  cell.label
                )
              )}
            </th>
          ))}
        </tr>
      ));
    }

    return (
      <tr>
        {tableColumns.map((column) => (
          <th key={column.key}>{column.label}</th>
        ))}
      </tr>
    );
  };

  const renderHeaderField = (field, index) => {
    if (field.text) {
      return (
        <span className="module-table-meta-text" key={`text-${index}`}>
          {field.text}
        </span>
      );
    }

    const fieldValue = editableHeaderValues[field.key] ?? field.defaultValue ?? "";
    const fieldClassName = [
      "module-inline-field",
      field.type === "select" ? "module-inline-field--select" : "",
      field.key === "outpost" ? "module-inline-field--outpost" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <label className={fieldClassName} key={field.key}>
        {field.prefix && <span>{field.prefix}</span>}
        {field.type === "select" ? (
          <select
            aria-label={field.label}
            disabled={!isTableEditing}
            onChange={(event) => handleHeaderFieldChange(field.key, event.target.value)}
            value={fieldValue}
          >
            <option value="">{field.placeholder || "__"}</option>
            {(field.options || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            aria-label={field.label}
            disabled={!isTableEditing}
            onChange={(event) => handleHeaderFieldChange(field.key, event.target.value)}
            type="text"
            value={fieldValue}
          />
        )}
        {field.suffix && <span>{field.suffix}</span>}
      </label>
    );
  };

  const renderLessonScheduleTopHeader = () => {
    const fieldValue = (key) => editableHeaderValues[key] ?? "";
    const renderInput = (key, className = "") => (
      <input
        aria-label={key}
        className={className}
        disabled={!isTableEditing}
        onChange={(event) => handleHeaderFieldChange(key, event.target.value)}
        type="text"
        value={fieldValue(key)}
      />
    );

    return (
      <div className="lesson-schedule-top-header">
        <div className="lesson-schedule-top-header__period">
          {renderInput("schedule_from_year", "lesson-schedule-top-header__year")}
          {renderInput("schedule_from_year_suffix", "lesson-schedule-top-header__literal")}
          {renderInput("schedule_from_quote_open", "lesson-schedule-top-header__quote")}
          {renderInput("schedule_from_day", "lesson-schedule-top-header__day")}
          {renderInput("schedule_from_quote_close", "lesson-schedule-top-header__quote")}
          {renderInput("schedule_from_month", "lesson-schedule-top-header__month")}
          {renderInput("schedule_start_label", "lesson-schedule-top-header__word")}
          {renderInput("schedule_to_year", "lesson-schedule-top-header__year")}
          {renderInput("schedule_to_year_suffix", "lesson-schedule-top-header__literal")}
          {renderInput("schedule_to_quote_open", "lesson-schedule-top-header__quote")}
          {renderInput("schedule_to_day", "lesson-schedule-top-header__day")}
          {renderInput("schedule_to_quote_close", "lesson-schedule-top-header__quote")}
          {renderInput("schedule_to_month", "lesson-schedule-top-header__month")}
          {renderInput("schedule_end_label", "lesson-schedule-top-header__word")}
          <div className="lesson-schedule-top-header__unit-group">
            {renderInput("schedule_unit_name", "lesson-schedule-top-header__unit")}
            {renderInput("schedule_unit_caption", "lesson-schedule-top-header__caption")}
          </div>
        </div>
      </div>
    );
  };

  const tableClassName = [
    "training-table",
    selectedTable?.variant === "lesson-schedule" ? "training-table--lesson-schedule" : "",
    isThematicAccountPhotoTable ? "training-table--thematic-account" : "",
    isCommandThematicAccountPhotoTable ? "training-table--command-thematic-account" : "",
    selectedTable?.variant === "combat-subject-journal"
      ? "training-table--combat-subject-journal"
      : "",
    selectedTable?.variant === "combat-subject-journal" && selectedTable?.hideDate
      ? "training-table--combat-subject-journal-no-date"
      : "",
  ]
    .filter(Boolean)
    .join(" ");
  const isLessonScheduleTable = selectedTable?.variant === "lesson-schedule";
  const isCombatSubjectJournalTable = selectedTable?.variant === "combat-subject-journal";
  const tableViewClassName = [
    "module-table-view",
    "module-table-view--word",
    isLessonScheduleTable || isThematicAccountPhotoTable ? "module-table-view--word-landscape" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const renderTableActions = () => (
    <div className="module-table-actions module-table-actions--top">
      <button disabled={!isTableEditing} onClick={handleAddTableRow} type="button">
        + Сап кошуу
      </button>
      {selectedTable?.variant === "typical-week" && (
        <>
          <button disabled={!isTableEditing} onClick={handleAddTableSection} type="button">
            + Секцияны кошуу
          </button>
          <button
            disabled={!isTableEditing || !editableRows.some((row) => row.rowType === "section")}
            onClick={handleDeleteTableSection}
            type="button"
          >
            Секцияны өчүрүү
          </button>
        </>
      )}
      <button disabled={!isTableEditing || editableRows.length === 0} onClick={handleDeleteTableRow} type="button">
        - удалить строку
      </button>
      <button disabled={!isTableEditing || isSubmittingThematicAccount} onClick={handleTableSave} type="button">
        Сохранить
      </button>
      {!data?.autoSubmitOnSave && (
        <button disabled={isSubmitDisabled} onClick={handleTableSend} type="button">
          Отправить
        </button>
      )}
      <button disabled={isTableEditing} onClick={handleTableEdit} type="button">
        Изменить
      </button>
    </div>
  );

  const renderAdminSubmissionRow = (submission) => (
    <div className="module-period-row" key={`admin-submission-${submission.id}`}>
      <button
        className="module-period-card module-period-card--document"
        onClick={() => setSelectedSubmission(submission)}
        type="button"
      >
        <span aria-hidden="true" className="module-document-icon" />
        <span className="module-submission-card__content">
          <strong>{submission.documentTitle}</strong>
          <small>{getSubmissionSenderLabel(submission)}</small>
        </span>
      </button>
      <div className="module-period-actions">
        <button
          disabled={deletingSubmissionId === submission.id}
          onClick={() => handleDeleteSubmission(submission)}
          type="button"
        >
          {deletingSubmissionId === submission.id ? "Өчүрүү..." : "Өчүрүү"}
        </button>
      </div>
    </div>
  );

  return (
    <section className="module-panel">
      <header>
        <h1>{data?.title || "Сабактардын тематикасынын эсеби жана жүгүртмөсү"}</h1>
        <p>{data?.description || `Доступные документы для ${data?.scope || "текущей роли"}.`}</p>
      </header>
      {selectedTable ? (
        <div
          className={tableViewClassName}
          onScroll={(event) => syncHorizontalScroll(event.currentTarget, topScrollRef)}
          ref={tableViewRef}
        >
          {(!directTable || onBack) && (
            <button
              className="module-back-button"
              onClick={directTable && onBack ? onBack : handleTableBack}
              type="button"
            >
              Артка
            </button>
          )}
          {isLessonScheduleTable && renderLessonScheduleTopHeader()}
          <textarea
            aria-label="Название таблицы"
            className="module-table-title module-table-title-input"
            disabled={!isTableEditing}
            onChange={handleTitleChange}
            rows={3}
            value={editableTitle}
          />
          {!isLessonScheduleTable && tableHeaderFields.length > 0 && (
            <div className="module-table-meta">
              {tableHeaderFields.map((field, index) => renderHeaderField(field, index))}
            </div>
          )}
          {!isViewingSubmission && renderTableActions()}
          {selectedTable?.enableCellColoring && (
            <div className="journal-cell-color-palette" aria-label="Таблицанын түсүн тандоо">
              <label>
                <button
                  aria-label="ай жыйынтыгын боё"
                  aria-pressed={activeCellColor === "green"}
                  className={`journal-cell-color-swatch journal-cell-color-swatch--green${
                    activeCellColor === "green" ? " is-active" : ""
                  }`}
                  onClick={() => setActiveCellColor("green")}
                  type="button"
                />
                <span>ай жыйынтыгын боё</span>
              </label>
              <label>
                <button
                  aria-label="жыл жыйынтыгын боё"
                  aria-pressed={activeCellColor === "red"}
                  className={`journal-cell-color-swatch journal-cell-color-swatch--red${
                    activeCellColor === "red" ? " is-active" : ""
                  }`}
                  onClick={() => setActiveCellColor("red")}
                  type="button"
                />
                <span>жыл жыйынтыгын боё</span>
              </label>
            </div>
          )}
          <div
            className="module-table-scroll-top"
            onScroll={(event) => syncHorizontalScroll(event.currentTarget, tableViewRef)}
            ref={topScrollRef}
          >
            <div style={{ width: `${tableScrollWidth}px` }} />
          </div>
          <div
            className="table-wrap"
            ref={tableScrollRef}
          >
            <table className={tableClassName}>
              {tableColumns.some((column) => column.width) && (
                <colgroup>
                  {tableColumns.map((column) => (
                    <col
                      key={column.key}
                      style={
                        column.width
                          ? {
                              minWidth: `${column.width}px`,
                              width: `${column.width}px`,
                            }
                          : undefined
                      }
                    />
                  ))}
                </colgroup>
              )}
              <thead>{renderTableHeader()}</thead>
              <tbody>
                {editableRows.map((row, rowIndex) => {
                  if (row.rowType === "section") {
                    return (
                      <tr className="training-table-section-row" key={row.id || row.number || rowIndex}>
                        <td colSpan={tableColumns.length}>
                          {selectedTable?.variant === "typical-week" ? (
                            <input
                              aria-label="Секциянын аталышы"
                              className="training-table-input"
                              data-table-cell={isTableEditing ? "true" : undefined}
                              disabled={!isTableEditing}
                              onChange={(event) => handleCellChange(rowIndex, "activity", event.target.value)}
                              onKeyDown={handleEditableCellKeyDown}
                              type="text"
                              value={row.activity || ""}
                            />
                          ) : row.activity}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      className={row.rowType ? `training-table-row--${row.rowType}` : undefined}
                      key={row.id || row.number || rowIndex}
                    >
                      {tableColumns.map((column) => {
                        const paintCellKey = `${rowIndex}:${column.key}`;
                        const paintedColor = cellColors[paintCellKey];
                        const cellClassName = [
                          `training-table-cell--${column.key}`,
                          column.type === "line-list" ? "training-table-cell--line-list" : "",
                          paintedColor ? "training-table-cell--painted" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return (
                          <td
                            className={cellClassName}
                            key={column.key}
                            onClick={() => handlePaintJournalCell(rowIndex, column.key)}
                            style={
                              paintedColor === "green"
                                ? { backgroundColor: "#55b86a" }
                                : paintedColor === "red"
                                  ? { backgroundColor: "#e25b56" }
                                  : undefined
                            }
                          >
                          {(column.key === "number" && !column.editable) || column.readOnly ? (
                            row[column.key]
                          ) : column.type === "line-list" ? (
                            <div className="training-table-line-list">
                              {(() => {
                                const cellValue = Array.isArray(row[column.key])
                                  ? row[column.key]
                                  : String(row[column.key] || "").split("\n");
                                const lineCount = Math.max(column.lines || 1, cellValue.length);

                                return Array.from({length: lineCount}, (_, lineIndex) => {
                                  const canRemoveLine = column.canAddLines && lineCount > (column.lines || 1);

                                  return (
                                    <div className="training-table-line-row" key={`${column.key}-${lineIndex}`}>
                                      <input
                                        aria-label={`${column.label || "line"} ${row.number || rowIndex + 1}.${lineIndex + 1}`}
                                        className="training-table-input training-table-line-input"
                                        data-table-cell={isTableEditing ? "true" : undefined}
                                        disabled={!isTableEditing}
                                        onChange={(event) =>
                                          handleCellLineChange(rowIndex, column, lineIndex, event.target.value)
                                        }
                                        onKeyDown={handleEditableCellKeyDown}
                                        tabIndex={isTableEditing ? 0 : -1}
                                        type={column.inputType || "text"}
                                        value={cellValue[lineIndex] || ""}
                                      />
                                      {canRemoveLine && (
                                        <button
                                          aria-label="Сапты өчүрүү"
                                          className="training-table-line-remove"
                                          disabled={!isTableEditing}
                                          onClick={() => handleRemoveCellLine(rowIndex, column, lineIndex)}
                                          type="button"
                                        >
                                          x
                                        </button>
                                      )}
                                    </div>
                                  );
                                });
                              })()}
                              {column.canAddLines && (
                                <button
                                  className="training-table-line-add"
                                  disabled={!isTableEditing || (Array.isArray(row[column.key]) ? row[column.key].length : String(row[column.key] || "").split("\n").length) >= (column.maxLines || 20)}
                                  onClick={() => handleAddCellLine(rowIndex, column)}
                                  type="button"
                                >
                                  + сап
                                </button>
                              )}
                            </div>
                          ) : isMultilineColumn(column) ? (
                            <textarea
                              aria-label={`${column.label} ${row.number || rowIndex + 1}`}
                              className="training-table-input training-table-input--textarea"
                              data-table-cell={isTableEditing ? "true" : undefined}
                              disabled={!isTableEditing}
                              onChange={(event) =>
                                handleCellChange(rowIndex, column.key, event.target.value)
                              }
                              onKeyDown={handleEditableCellKeyDown}
                              rows={row[`${column.key}Rows`] || column.rows || 3}
                              tabIndex={isTableEditing ? 0 : -1}
                              value={row[column.key] ?? ""}
                            />
                          ) : (
                            <input
                              aria-label={`${column.label} ${row.number || rowIndex + 1}`}
                              className="training-table-input"
                              data-table-cell={isTableEditing ? "true" : undefined}
                              disabled={!isTableEditing}
                              min={column.key === "hours" || column.type === "number" ? "0" : undefined}
                              onChange={(event) => handleCellChange(rowIndex, column.key, event.target.value)}
                              onKeyDown={handleEditableCellKeyDown}
                              step={column.type === "number" ? "1" : undefined}
                              type={column.type || (column.key === "hours" ? "number" : "text")}
                              tabIndex={isTableEditing ? 0 : -1}
                              value={row[column.key] ?? ""}
                            />
                          )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!isViewingSubmission && <div className="module-table-actions">
            <button disabled={!isTableEditing} onClick={handleAddTableRow} type="button">
              + Сап кошуу
            </button>
            {selectedTable?.variant === "typical-week" && (
              <>
                <button disabled={!isTableEditing} onClick={handleAddTableSection} type="button">
                  + Секцияны кошуу
                </button>
                <button
                  disabled={!isTableEditing || !editableRows.some((row) => row.rowType === "section")}
                  onClick={handleDeleteTableSection}
                  type="button"
                >
                  Секцияны өчүрүү
                </button>
              </>
            )}
            <button disabled={!isTableEditing || editableRows.length === 0} onClick={handleDeleteTableRow} type="button">
              - удалить строку
            </button>
            <button disabled={!isTableEditing || isSubmittingThematicAccount} onClick={handleTableSave} type="button">
              Сохранить
            </button>
            {!data?.autoSubmitOnSave && (
              <button disabled={isSubmitDisabled} onClick={handleTableSend} type="button">
                Отправить
              </button>
            )}
            <button disabled={isTableEditing} onClick={handleTableEdit} type="button">
              Изменить
            </button>
          </div>}
          {tableNotice && <p className="module-table-status">{tableNotice}</p>}
        </div>
      ) : selectedSubsections.length > 0 && !selectedSubsectionId ? (
        <div className="module-table-view">
          <button className="module-back-button" onClick={() => setSelectedSectionId(null)} type="button">
            Артка
          </button>
          <div className="module-document-list">
            {selectedSubsections.map((section) => (
              <button
                className="module-document-card"
                key={section.id || section.title}
                onClick={() => setSelectedSubsectionId(section.id)}
                type="button"
              >
                <span aria-hidden="true" className="module-document-icon" />
                <strong>{section.title}</strong>
              </button>
            ))}
            {(selectedSection?.periods || EMPTY_ARRAY).map((period) => (
              <button
                className="module-document-card"
                key={period.id || period.title}
                onClick={() => setSelectedPeriodId(period.id)}
                type="button"
              >
                <span aria-hidden="true" className="module-document-icon" />
                <strong>{period.title}</strong>
              </button>
            ))}
          </div>
        </div>
      ) : selectedNestedSubsections.length > 0 && !selectedNestedSubsectionId ? (
        <div className="module-table-view">
          <button className="module-back-button" onClick={() => setSelectedSubsectionId(null)} type="button">
            Артка
          </button>
          <div className="module-document-list">
            {selectedNestedSubsections.map((section) => (
              <button
                className="module-document-card"
                key={section.id || section.title}
                onClick={() => setSelectedNestedSubsectionId(section.id)}
                type="button"
              >
                <span aria-hidden="true" className="module-document-icon" />
                <strong>{section.title}</strong>
              </button>
            ))}
          </div>
        </div>
      ) : isAdminGroupedSubmissionSection ? (
        <div className="module-table-view">
          <button
            className="module-back-button"
            onClick={() => {
              if (selectedAdminOutpostName) {
                setSelectedAdminOutpostName(null);
              } else if (selectedAdminUnitNumber) {
                setSelectedAdminUnitNumber(null);
              } else {
                handlePeriodListBack();
              }
            }}
            type="button"
          >
            Артка
          </button>
          {selectedAdminOutpostName ? (
            <div className="module-period-list">
              <h2>{selectedAdminOutpostName}</h2>
              <div className="module-submission-list">
                <h3>Заставадан жөнөтүлгөн документтер</h3>
                {selectedAdminOutpostSubmissions.length > 0 ? (
                  selectedAdminOutpostSubmissions.map(renderAdminSubmissionRow)
                ) : (
                  <p className="module-submission-list__empty">
                    Бул заставадан жөнөтүлгөн документтер азырынча жок.
                  </p>
                )}
                {submissionListError && (
                  <p className="lesson-period-dialog__error">{submissionListError}</p>
                )}
              </div>
            </div>
          ) : selectedAdminUnitNumber ? (
            <div className="module-period-list">
              <h2>{selectedAdminUnitNumber} аскер бөлүгү</h2>
              <div className="module-submission-list">
                <h3>Аскер бөлүгүнөн жөнөтүлгөн документтер</h3>
                {adminMilitaryUnitSubmissions.length > 0 ? (
                  adminMilitaryUnitSubmissions.map(renderAdminSubmissionRow)
                ) : (
                  <p className="module-submission-list__empty">
                    Аскер бөлүгүнөн жөнөтүлгөн документтер азырынча жок.
                  </p>
                )}
                <h3>Заставалар</h3>
                {adminOutpostNames.length > 0 ? (
                  <div className="module-document-list">
                    {adminOutpostNames.map((outpostName) => (
                      <button
                        className="module-document-card"
                        key={outpostName}
                        onClick={() => setSelectedAdminOutpostName(outpostName)}
                        type="button"
                      >
                        <span aria-hidden="true" className="module-document-icon" />
                        <strong>{outpostName}</strong>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="module-submission-list__empty">
                    Бул аскер бөлүгүнө караштуу заставалар табылган жок.
                  </p>
                )}
                {submissionListError && (
                  <p className="lesson-period-dialog__error">{submissionListError}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="module-document-list">
              {adminUnitNumbers.length > 0 ? (
                adminUnitNumbers.map((unitNumber) => (
                  <button
                    className="module-document-card"
                    key={unitNumber}
                    onClick={() => {
                      setSelectedAdminUnitNumber(unitNumber);
                      setSelectedAdminOutpostName(null);
                    }}
                    type="button"
                  >
                    <span aria-hidden="true" className="module-document-icon" />
                    <strong>{unitNumber} аскер бөлүгү</strong>
                  </button>
                ))
              ) : (
                <p className="module-submission-list__empty">
                  Катталган аскер бөлүктөрү азырынча жок.
                </p>
              )}
            </div>
          )}
        </div>
      ) : displayedPeriods.length > 0 || canAddCustomPeriod || isRegionalIncomingViewer || showsOutpostSubmissions || showsRegionalOutgoingSubmissions ? (
        <div className="module-table-view">
          <button className="module-back-button" onClick={handlePeriodListBack} type="button">
            Артка
          </button>
          <div className="module-period-list">
            {displayedPeriods.map((period) => {
              const isCustomPeriod = customPeriods.some((customPeriod) => customPeriod.id === period.id);
              const showAdminPeriodActions = canManageCustomPeriods && (period.canEdit || isCustomPeriod);
              const showLessonPeriodDelete = !isAdmin && isLessonSchedulePeriodList && period.canDelete;
              const showPeriodActions = showAdminPeriodActions || showLessonPeriodDelete;

              return (
                <div className="module-period-row" key={period.id}>
                  <button
                    className="module-period-card module-period-card--document"
                    onClick={() => setSelectedPeriodId(period.id)}
                    type="button"
                  >
                    <span aria-hidden="true" className="module-document-icon" />
                    <strong>{period.title}</strong>
                  </button>
                  {showPeriodActions && (
                    <div className="module-period-actions">
                      {showAdminPeriodActions && (
                        <button onClick={() => handleRenameCustomPeriod(period)} type="button">
                          Өзгөртүү
                        </button>
                      )}
                      <button
                        disabled={deletingLessonPeriodId === period.id}
                        onClick={() =>
                          showLessonPeriodDelete
                            ? handleDeleteLessonPeriod(period)
                            : handleDeleteCustomPeriod(period)
                        }
                        type="button"
                      >
                        {deletingLessonPeriodId === period.id ? "Өчүрүү..." : "Өчүрүү"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {canAddCustomPeriod && !isRegionalIncomingViewer && (
              <button className="module-period-add-button" onClick={handleAddCustomPeriod} type="button">
                {customPeriodConfig.buttonLabel}
              </button>
            )}
            {(showsOutpostSubmissions || showsRegionalOutgoingSubmissions) && (
              <div className="module-submission-list">
                {showsOutpostSubmissions ? (
                  <><h3>{currentUser?.role === "outpost" ? "Чыгыш" : "Кириш"}</h3>
                {visibleSubmissions.length > 0 ? (
                  visibleSubmissions.map((submission) => (
                    <div className="module-period-row" key={`submission-${submission.id}`}>
                      <button
                        className="module-period-card module-period-card--document"
                        onClick={() => setSelectedSubmission(submission)}
                        type="button"
                      >
                        <span aria-hidden="true" className="module-document-icon" />
                        <span className="module-submission-card__content">
                          <strong>{submission.documentTitle}</strong>
                          <small>{getSubmissionSenderLabel(submission)}</small>
                        </span>
                      </button>
                      <div className="module-period-actions">
                          <SubmissionEditPermissionButton
                            onUpdated={(updated) => setThematicSubmissions((items) => items.map((item) => item.id === updated.id ? updated : item))}
                            submission={submission}
                          />
                          {currentUser?.role === "regional" && submission.senderRole === "outpost" ? (
                            <button onClick={() => setForwardingSubmission(submission)} type="button">
                              Отправить
                            </button>
                          ) : null}
                          <button
                            disabled={deletingSubmissionId === submission.id}
                            onClick={() => handleDeleteSubmission(submission)}
                            type="button"
                          >
                            {deletingSubmissionId === submission.id ? "Өчүрүү..." : "Өчүрүү"}
                          </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="module-submission-list__empty">Отправленных документов пока нет.</p>
                )}</>
                ) : null}
                {submissionListError && (
                  <p className="lesson-period-dialog__error">{submissionListError}</p>
                )}
                {showsRegionalOutgoingSubmissions ? (
                  <>
                    <h3>Чыгыш</h3>
                    {outgoingRegionalSubmissions.length > 0 ? (
                      outgoingRegionalSubmissions.map((submission) => (
                        <div className="module-period-row" key={`outgoing-${submission.id}`}>
                          <button
                            className="module-period-card module-period-card--document"
                            onClick={() => setSelectedSubmission(submission)}
                            type="button"
                          >
                            <span aria-hidden="true" className="module-document-icon" />
                            <strong>{submission.documentTitle}</strong>
                          </button>
                          <div className="module-period-actions">
                            <SubmissionEditPermissionButton
                              onUpdated={(updated) => setThematicSubmissions((items) => items.map((item) => item.id === updated.id ? updated : item))}
                              submission={submission}
                            />
                            <button disabled={deletingSubmissionId === submission.id} onClick={() => handleDeleteSubmission(submission)} type="button">
                              {deletingSubmissionId === submission.id ? "Өчүрүү..." : "Өчүрүү"}
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="module-submission-list__empty">Жөнөтүлгөн документтер азырынча жок.</p>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : sections.length > 0 ? (
        <div className="module-metric-grid module-section-grid">
          {sections.map((section) => (
            hasSectionContent(section) ? (
              <button
                className="module-metric module-section-card"
                key={section.id || section.title}
                onClick={() => setSelectedSectionId(section.id)}
                type="button"
              >
                <strong>{section.title}</strong>
              </button>
            ) : (
              <article className="module-metric module-section-card" key={section.id || section.title}>
                <strong>{section.title}</strong>
              </article>
            )
          ))}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Документ</th>
                <th>Тип</th>
                <th>Обновлен</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items || []).map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.type}</td>
                  <td>{item.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <SubmissionForwardDialog
        onClose={() => setForwardingSubmission(null)}
        onForward={handleForwardSubmission}
        submission={forwardingSubmission}
      />
      {submissionDialogOpen && (
        <div className="lesson-period-dialog" role="dialog" aria-modal="true" aria-labelledby="submission-dialog-title">
          <form
            className="lesson-period-dialog__panel"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmitThematicAccount();
            }}
          >
            <h2 id="submission-dialog-title">Таблицаны жөнөтүү</h2>
            <label className="module-inline-field">
              <span>Иш кагаздардын аталышы</span>
              <input
                autoFocus
                onChange={(event) => {
                  setSubmissionDocumentTitle(event.target.value);
                  setSubmissionError("");
                }}
                placeholder="Иш кагаздардын аталышы"
                type="text"
                value={submissionDocumentTitle}
              />
            </label>
            {submissionError && <p className="lesson-period-dialog__error">{submissionError}</p>}
            <div className="lesson-period-dialog__actions">
              <button
                disabled={isSubmittingThematicAccount}
                onClick={() => setSubmissionDialogOpen(false)}
                type="button"
              >
                Отмена
              </button>
              <button disabled={isSubmittingThematicAccount} type="submit">
                {isSubmittingThematicAccount ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </form>
        </div>
      )}
      {customTableDraft && (
        <div className="lesson-period-dialog" role="dialog" aria-modal="true" aria-labelledby="custom-table-dialog-title">
          <form className="lesson-period-dialog__panel" onSubmit={(event) => {
            event.preventDefault();
            handleCreateCustomTable();
          }}>
            <h2 id="custom-table-dialog-title">{customPeriodConfig?.promptLabel || "Название"}</h2>
            <label className="module-inline-field">
              <span>Название</span>
              <input
                autoFocus
                onChange={(event) => {
                  setCustomTableTitle(event.target.value);
                  setCustomTableError("");
                }}
                placeholder="Введите название"
                type="text"
                value={customTableTitle}
              />
            </label>
            {customTableError && <p className="lesson-period-dialog__error">{customTableError}</p>}
            <div className="lesson-period-dialog__actions">
              <button onClick={closeCustomTableDialog} type="button">
                Отмена
              </button>
              <button type="submit">
                Создать
              </button>
            </div>
          </form>
        </div>
      )}
      {lessonPeriodDraft && (
        <div className="lesson-period-dialog" role="dialog" aria-modal="true" aria-labelledby="lesson-period-dialog-title">
          <form className="lesson-period-dialog__panel" onSubmit={(event) => {
            event.preventDefault();
            handleCreateLessonPeriod();
          }}>
            <h2 id="lesson-period-dialog-title">{customPeriodConfig?.promptLabel || "Жуманын аталышы"}</h2>
            <div className="lesson-period-title-builder">
              <span>Сабактардын жүгүртмөсү "</span>
              <input
                aria-label="Айы"
                autoFocus
                className="lesson-period-title-builder__input lesson-period-title-builder__input--month"
                onChange={(event) => setLessonPeriodMonth(event.target.value)}
                placeholder={LESSON_SCHEDULE_MONTH_PLACEHOLDER}
                value={lessonPeriodMonth}
              />
              <span> "айынын </span>
              <input
                aria-label="Жуманын номери"
                className="lesson-period-title-builder__input lesson-period-title-builder__input--week"
                inputMode="numeric"
                onChange={(event) => setLessonPeriodWeek(event.target.value)}
                placeholder={LESSON_SCHEDULE_WEEK_PLACEHOLDER}
                value={lessonPeriodWeek}
              />
              <span> жумасы</span>
            </div>
            {lessonPeriodError && <p className="lesson-period-dialog__error">{lessonPeriodError}</p>}
            <div className="lesson-period-dialog__actions">
              <button disabled={isCreatingLessonPeriod} onClick={closeLessonPeriodDialog} type="button">
                Жокко чыгаруу
              </button>
              <button disabled={isCreatingLessonPeriod} type="submit">
                {isCreatingLessonPeriod ? "Кошулууда..." : "Кошуу"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
