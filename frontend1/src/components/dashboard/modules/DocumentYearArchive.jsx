import React, { useEffect, useMemo, useState } from "react";

import { getSubmissionArchive } from "../../../api/dashboard.js";
import { getApiErrorMessage } from "../../../api/errors.js";
import Analytics from "./Analytics.jsx";
import CombatTrainingResults from "./CombatTrainingResults.jsx";
import Library from "./Library.jsx";

export const ARCHIVE_MODULES = {
  library: {
    title: "Сабактардын тематикасынын эсеби жана жүгүртмөсү",
    folders: [
      { title: "Өздүк курамдын даярдыгы", sectionIds: ["thematic-account", "lesson-schedule"] },
      { title: "Командирдик даярдоо", sectionIds: ["command-thematic-account", "command-lesson-schedule"] },
      { title: "Типтүү жумасы", sectionIds: ["typical-week"] },
    ],
  },
  combatTrainingJournal: {
    title: "Күжүрмөн даярдоону каттоо журналы",
    folders: [
      { title: "Өздүк курамдын даярдыгы", sectionIds: ["combat-training-personnel-journal"] },
      { title: "Командирдик даярдоо", sectionIds: ["combat-training-command-journal"] },
    ],
  },
  combatTrainingResults: {
    title: "Күжүрмөн даярдоонун жыйынтыктары",
    folders: [
      { title: "Көзөмөл сабактары", sectionIds: ["combat-training-results-observation"] },
      { title: "Көзөмөл текшерүү сабактары", sectionIds: ["combat-training-results-inspection"] },
    ],
  },
  combatTrainingAnalytics: {
    title: "Күжүрмөн даярдоонун талдоолору",
    folders: [
      { title: "Айдын талдоосу", analysisType: "monthly-analysis", sectionIds: ["combat-training-analysis", "combat-training-analysis-regional"] },
      { title: "Окуу жылынын жарым жылдык талдоосу", analysisType: "period-analysis", sectionIds: ["combat-training-analysis", "combat-training-analysis-regional"] },
      { title: "Окуу жылынын жылдык талдоосу", analysisType: "year-analysis", sectionIds: ["combat-training-analysis", "combat-training-analysis-regional"] },
    ],
  },
  meetings: {
    title: "Жыйындар",
    folders: [
      { title: "Тематикалык эсеп", sectionIds: ["meetings-thematic-account"] },
      { title: "Сабактар жүгүртмөсү", sectionIds: ["meetings-lesson-schedule"] },
      { title: "Каттоо журналы", sectionIds: ["meetings-combat-training-journal"] },
      { title: "Көзөмөл сабактары", sectionIds: ["meetings-observation"] },
      { title: "Талдоо", sectionIds: ["meetings-analysis"] },
    ],
  },
  youngSoldierTrainingCourse: {
    title: "Жаш жоокерлерди даярдоо курсу",
    folders: [
      { title: "Тематикалык эсеп", sectionIds: ["young-soldier-thematic-account"] },
      { title: "Сабактар жүгүртмөсү", sectionIds: ["young-soldier-lesson-schedule"] },
      { title: "Каттоо журналы", sectionIds: ["young-soldier-combat-training-journal"] },
      { title: "Көзөмөл сабактары", sectionIds: ["young-soldier-observation"] },
      { title: "Талдоо", sectionIds: ["young-soldier-analysis"] },
    ],
  },
  memoLetter: { title: "Билдирме кат", folders: [{ title: "Билдирме кат", sectionIds: ["memo-letter"] }] },
  shootingStatements: { title: "Ок атуунун ведомосттору", folders: [{ title: "Ок атуунун ведомосттору", sectionIds: ["shooting-statements"] }] },
};

const formatDate = (value) => new Date(value).toLocaleString("ky-KG");

const findRenderableTable = (value, depth = 0) => {
  if (!value || typeof value !== "object" || depth > 5) return null;
  if (Array.isArray(value.columns) && Array.isArray(value.rows)) return value;
  for (const nestedValue of Object.values(value)) {
    const found = findRenderableTable(nestedValue, depth + 1);
    if (found) return found;
  }
  return null;
};

function ArchiveValue({ value, label }) {
  if (value == null || value === "") return null;
  if (typeof value === "string" && value.startsWith("data:image/")) {
    return <img alt={label || "Документтин сүрөтү"} className="document-year-archive__image" src={value} />;
  }
  if (typeof value === "string" && value.startsWith("data:application/pdf")) {
    return <iframe className="document-year-archive__media" src={value} title={label || "PDF документ"} />;
  }
  if (typeof value === "string" && value.startsWith("data:video/")) {
    return <video className="document-year-archive__media" controls src={value} />;
  }
  if (typeof value === "string" && value.startsWith("data:audio/")) {
    return <audio className="document-year-archive__media" controls src={value} />;
  }
  if (typeof value === "string" && value.startsWith("data:")) {
    return <p><strong>{label}: </strong>Файл архивде сакталган.</p>;
  }
  if (typeof value !== "object") {
    return <p><strong>{label ? `${label}: ` : ""}</strong>{String(value)}</p>;
  }
  if (Array.isArray(value.columns) && Array.isArray(value.rows)) {
    return (
      <section className="document-year-archive__table-wrap">
        {label ? <h3>{label}</h3> : null}
        <table>
          <thead><tr>{value.columns.map((column, index) => <th key={index}>{column.label || column.title || column.key || ""}</th>)}</tr></thead>
          <tbody>{value.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>{value.columns.map((column, columnIndex) => (
              <td key={columnIndex}>{String(row?.[column.key] ?? row?.[column.id] ?? "")}</td>
            ))}</tr>
          ))}</tbody>
        </table>
      </section>
    );
  }
  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index + 1), item])
    : Object.entries(value);
  return (
    <section className="document-year-archive__group">
      {label ? <h3>{label}</h3> : null}
      {entries.map(([key, item]) => <ArchiveValue key={key} label={key} value={item} />)}
    </section>
  );
}

export function ArchivedDocumentView({ copy, onBack, user }) {
  const submission = {
    ...copy,
    id: copy.sourceSubmissionId,
    registrationNumber: copy.sourceSubmissionId,
    createdAt: copy.archivedAt,
  };

  if (copy.table?.document) {
    return <Analytics
      data={{
        archiveReadOnly: true,
        directEditor: true,
        directSubmission: submission,
        initialSectionId: copy.table.sectionId || copy.periodId || "monthly-analysis",
        onBack,
        simpleLetterEditor: true,
        storageNamespace: `archive:${copy.id}`,
      }}
      key={copy.id}
      user={user}
    />;
  }

  if (copy.sectionId === "combat-training-results-inspection" && copy.table?.table) {
    return <CombatTrainingResults
      data={{ directSingleSubmission: true, initialResultSubmission: submission, onBack, sections: [] }}
      key={copy.id}
      user={user}
    />;
  }

  const table = copy.table?.subjects ? null : findRenderableTable(copy.table);
  if (table) {
    return <Library
      data={{ id: `archive-${copy.id}`, readOnly: true, table, title: copy.documentTitle }}
      key={copy.id}
      onBack={onBack}
    />;
  }

  return <section className="module-panel document-year-archive__viewer">
    <button className="module-back-button" onClick={onBack} type="button">Артка</button>
    <div className="document-year-archive__document">
      <h1>{copy.documentTitle}</h1>
      <p>{formatDate(copy.archivedAt)} · {copy.unitNumber}</p>
      <ArchiveValue value={copy.table} />
    </div>
  </section>;
}

export function ArchivedModuleContent({ children, className, moduleId, user }) {
  const [openedCopy, setOpenedCopy] = useState(null);
  return <>
    <div className={className} style={openedCopy ? { display: "none" } : undefined}>
      {children}
      <DocumentYearArchive moduleId={moduleId} onOpenDocument={setOpenedCopy} user={user} />
    </div>
    {openedCopy ? <ArchivedDocumentView copy={openedCopy} onBack={() => setOpenedCopy(null)} user={user} /> : null}
  </>;
}

export default function DocumentYearArchive({ moduleId, onOpenDocument, user }) {
  const archiveModule = ARCHIVE_MODULES[moduleId];
  const [copies, setCopies] = useState([]);
  const [openYear, setOpenYear] = useState(null);
  const [openFolder, setOpenFolder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!archiveModule || !["outpost", "regional"].includes(user?.role)) return undefined;
    let active = true;
    const sectionIds = [...new Set(archiveModule.folders.flatMap((folder) => folder.sectionIds))];
    const refresh = () => getSubmissionArchive(sectionIds)
      .then((items) => { if (active) { setCopies(items); setError(""); } })
      .catch((requestError) => { if (active) setError(getApiErrorMessage(requestError, "Архивди жүктөө мүмкүн болгон жок.")); })
      .finally(() => { if (active) setLoading(false); });
    refresh();
    window.addEventListener("submission-archived", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("submission-archived", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [moduleId, user?.id]);

  const years = useMemo(() => Array.from(new Set([
    new Date().getFullYear(),
    ...copies.map((copy) => copy.year),
  ])).sort((left, right) => right - left), [copies]);

  if (!archiveModule || !["outpost", "regional"].includes(user?.role)) return null;

  return (
    <section className="module-panel document-year-archive">
      <header className="module-header"><h2>Документтердин архиви</h2></header>
      {loading ? <p className="dashboard-state">Архив жүктөлүүдө...</p> : null}
      {error ? <p className="dashboard-error">{error}</p> : null}
      {!loading && years.map((year) => (
        <div className="document-year-archive__year" key={year}>
          <button aria-expanded={openYear === year} onClick={() => { setOpenYear(openYear === year ? null : year); setOpenFolder(null); }} type="button">
            📁 {year} {archiveModule.title} <span>{copies.filter((copy) => copy.year === year).length}</span>
          </button>
          {openYear === year ? (
            <div className="document-year-archive__contents">
              {archiveModule.folders.map((folder) => {
                const folderKey = `${year}:${folder.analysisType || folder.sectionIds[0]}`;
                const folderCopies = copies.filter((copy) =>
                  copy.year === year && folder.sectionIds.includes(copy.sectionId) &&
                  (!folder.analysisType || (copy.table?.sectionId || copy.periodId || "monthly-analysis") === folder.analysisType)
                );
                return <div className="document-year-archive__folder" key={folderKey}>
                  <button aria-expanded={openFolder === folderKey} onClick={() => setOpenFolder(openFolder === folderKey ? null : folderKey)} type="button">
                    📁 {typeof folder.title === "function" ? folder.title(year) : folder.title} <span>{folderCopies.length}</span>
                  </button>
                  {openFolder === folderKey ? <div className="document-year-archive__files">
                    {folderCopies.length === 0 ? <p>Бул папкада документ жок.</p> : null}
                    {folderCopies.map((copy) => <React.Fragment key={copy.id}>
                      <button onClick={() => onOpenDocument?.(copy)} type="button">
                        📄 {copy.documentTitle} <small>{formatDate(copy.archivedAt)}</small>
                      </button>
                    </React.Fragment>)}
                  </div> : null}
                </div>;
              })}
            </div>
          ) : null}
        </div>
      ))}
    </section>
  );
}
