import React, { useEffect, useState } from "react";

import { getSubmissionArchive } from "../../api/dashboard.js";
import { getApiErrorMessage } from "../../api/errors.js";
import { ARCHIVE_MODULES, ArchivedDocumentView } from "../../components/dashboard/modules/DocumentYearArchive.jsx";
import { MILITARY_UNIT_OPTIONS, OUTPOSTS_BY_MILITARY_UNIT, formatOutpostName } from "../../data/militaryUnits.js";

const outpostKey = (name) => String(name || "").trim().replace(/\s+чек ара заставасы$/, "").toLocaleLowerCase();
const isOutpostCopy = (copy) => copy.senderRole === "outpost" || (!copy.senderRole && Boolean(copy.outpostName));
const matchesFolder = (copy, folder) => folder.sectionIds.includes(copy.sectionId) &&
  (!folder.analysisType || (copy.table?.sectionId || copy.periodId || "monthly-analysis") === folder.analysisType);

export default function AdminArchivePage({ user }) {
  const [copies, setCopies] = useState([]);
  const [path, setPath] = useState([]);
  const [openedCopy, setOpenedCopy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getSubmissionArchive([], "admin")
      .then((items) => { if (active) setCopies(items); })
      .catch((requestError) => { if (active) setError(getApiErrorMessage(requestError, "Архивди жүктөө мүмкүн болгон жок.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  const [year, unit, branch, ...rest] = path;
  const outpost = branch === "outposts" ? rest[0] : null;
  const moduleId = branch === "outposts" ? rest[1] : rest[0];
  const folderIndex = branch === "outposts" ? rest[2] : rest[1];
  const archiveModule = ARCHIVE_MODULES[moduleId];
  const unitCopies = copies.filter((copy) => copy.year === year && copy.unitNumber === unit);
  const selectedCopies = unitCopies.filter((copy) => branch === "outposts"
    ? isOutpostCopy(copy) && outpostKey(copy.outpostName) === outpost
    : !isOutpostCopy(copy));
  const years = [...new Set([2026, new Date().getFullYear(), ...copies.map((copy) => copy.year)])].sort((a, b) => b - a);
  const units = [...new Set([...MILITARY_UNIT_OPTIONS, ...copies.filter((copy) => copy.year === year).map((copy) => copy.unitNumber).filter(Boolean)])];
  const outposts = new Map((OUTPOSTS_BY_MILITARY_UNIT[unit] || []).map(([number, name]) => [outpostKey(name), `${number}. ${formatOutpostName(name)}`]));
  unitCopies.filter(isOutpostCopy).forEach((copy) => {
    const key = outpostKey(copy.outpostName);
    if (key && !outposts.has(key)) outposts.set(key, copy.outpostName);
  });
  const enter = (value) => setPath([...path, value]);
  const folderButton = (key, title, count) => <button key={key} onClick={() => enter(key)} type="button">
    📁 {title}{count != null ? <span>{count}</span> : null}
  </button>;
  const title = !year ? "Архив" : !unit ? `${year} ж Архиви` : !branch ? `${unit} Аскер бөлүгү`
    : branch === "outposts" && !outpost ? "Заставалар"
      : !moduleId ? (outpost ? outposts.get(outpost) : "Аскер бөлүгү")
        : folderIndex == null ? archiveModule.title : archiveModule.folders[folderIndex].title;

  if (openedCopy) return <ArchivedDocumentView copy={openedCopy} onBack={() => setOpenedCopy(null)} user={user} />;

  return <section className="module-panel document-year-archive">
    <header className="module-header"><h1>{title}</h1></header>
    {year ? <p>{year} ж Архиви{unit ? ` / ${unit} Аскер бөлүгү` : ""}{outpost ? ` / ${outposts.get(outpost)}` : ""}</p> : null}
    {path.length ? <button className="module-back-button" onClick={() => setPath(path.slice(0, -1))} type="button">Артка</button> : null}
    <button className="module-back-button" onClick={() => setRefreshKey((value) => value + 1)} type="button">Жаңыртуу</button>
    {loading ? <p className="dashboard-state">Архив жүктөлүүдө...</p> : error ? <p className="dashboard-error">{error}</p> :
      <div className="document-year-archive__folder">
        {!year ? years.map((value) => folderButton(value, `${value} ж Архиви`))
          : !unit ? units.map((value) => folderButton(value, `${value} Аскер бөлүгү`))
            : !branch ? [folderButton("unit", "Аскер бөлүгү"), folderButton("outposts", "Заставалар")]
              : branch === "outposts" && !outpost ? <>
                {[...outposts].map(([key, label]) => folderButton(key, label))}
                {!outposts.size ? <p>Бул аскер бөлүгүндө застава жок.</p> : null}
              </>
                : !moduleId ? Object.entries(ARCHIVE_MODULES).map(([key, module]) => folderButton(key, module.title,
                  selectedCopies.filter((copy) => module.folders.some((folder) => matchesFolder(copy, folder))).length))
                  : folderIndex == null ? archiveModule.folders.map((folder, index) => folderButton(index, folder.title,
                    selectedCopies.filter((copy) => matchesFolder(copy, folder)).length))
                    : <div className="document-year-archive__files">
                      {selectedCopies.filter((copy) => matchesFolder(copy, archiveModule.folders[folderIndex])).map((copy) =>
                        <button key={copy.id} onClick={() => setOpenedCopy(copy)} type="button">
                          📄 {copy.documentTitle}<small>{copy.senderName} · {new Date(copy.archivedAt).toLocaleString("ky-KG")}</small>
                        </button>)}
                      {!selectedCopies.some((copy) => matchesFolder(copy, archiveModule.folders[folderIndex])) ? <p>Бул папкада документ жок.</p> : null}
                    </div>}
      </div>}
  </section>;
}
