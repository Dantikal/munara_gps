import React, { useEffect, useState } from "react";
import { getThematicAccountSubmissions, getCombatTrainingJournalOutposts, markThematicAccountSubmissionRead, forwardThematicAccountSubmission } from "../../../api/dashboard.js";
import { getApiErrorMessage } from "../../../api/errors.js";
import Library from "./Library.jsx";
import Analytics from "./Analytics.jsx";
import CombatTrainingResults from "./CombatTrainingResults.jsx";
import SubmissionForwardDialog from "./SubmissionForwardDialog.jsx";

export default function TrainingDocumentInbox({ children, user, moduleId }) {
  const [directory, setDirectory] = useState([]);
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [forwarding, setForwarding] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const isCenter = user?.unit_type === "training_center_head";
  useEffect(() => {
    let mounted = true;
    const refresh = () => Promise.all([getThematicAccountSubmissions(), getCombatTrainingJournalOutposts()]).then(([data, users]) => {
      if (!mounted) return;
      setError("");
      setDirectory(users.filter((item) => item.unitType === (isCenter ? "training_platoon_commander" : "training_center_head")));
      setItems(data.filter((item) =>
        item.senderUnitType === (isCenter ? "training_platoon_commander" : "training_center_head") &&
        (moduleId === "youngSoldierTrainingCourse" ? item.sectionId.startsWith("young-soldier-")
          : item.sectionId === (moduleId === "shootingStatements" ? "shooting-statements" : "memo-letter"))
      ));
    }).catch((err) => { if (mounted) setError(getApiErrorMessage(err, "Документтер жүктөлгөн жок.")); })
      .finally(() => { if (mounted) setLoading(false); });
    setLoading(true);
    refresh();
    const timer = window.setInterval(refresh, 30000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [moduleId, user?.id, isCenter]);
  const open = async (item) => {
    setSelected(item);
    if (!item.isRead) {
      try {
        await markThematicAccountSubmissionRead(item.id);
        setItems((current) => current.map((value) => value.id === item.id ? { ...value, isRead: true } : value));
      } catch (err) { setError(getApiErrorMessage(err, "Документти окулган деп белгилөө мүмкүн болгон жок.")); }
    }
  };
  if (selected) {
    const back = () => setSelected(null);
    if (selected.sectionId === "memo-letter" || selected.sectionId.endsWith("-analysis")) {
      return <Analytics user={user} data={{ directEditor: true, directSubmission: selected, initialSectionId: "monthly-analysis", onBack: back, simpleLetterEditor: selected.sectionId === "memo-letter", storageNamespace: `training-incoming:${selected.id}` }} />;
    }
    if (selected.sectionId === "shooting-statements" || selected.sectionId.endsWith("-observation")) {
      return <CombatTrainingResults user={user} data={{ directEditor: true, directSingleSubmission: true, initialResultSubmission: selected, onBack: back, sections: [] }} />;
    }
    return <Library onBack={back} data={{ id: `training-incoming:${selected.id}`, title: selected.documentTitle, table: selected.table, readOnly: true, registrationCode: selected.registrationCode }} />;
  }
  const groups = Array.from(new Set([...directory.map((item) => item.id), ...items.map((item) => item.senderId)]));
  return <>
    {children}
    <section className="module-panel">
      <header className="module-header"><h2>{isCenter ? "Окуу взводдору" : "Окуу борбору"}</h2></header>
      {notice ? <p className="dashboard-notice">{notice}</p> : null}
      {loading ? <p className="dashboard-state">Документтер жүктөлүүдө...</p> : null}
      {error ? <p className="dashboard-error">{error}</p> : null}
      {!loading && !error && !groups.length ? <p className="dashboard-state">Кириш документтер азырынча жок.</p> : null}
      {groups.map((senderId) => <div className="module-submission-list" key={senderId}>
        <h3>{directory.find((item) => item.id === senderId)?.name || items.find((item) => item.senderId === senderId)?.outpostName}</h3>
        {items.filter((item) => item.senderId === senderId).map((item) => <div className="module-period-row" key={item.id}>
          <button className="module-period-card" onClick={() => open(item)} type="button">{item.documentTitle}{!item.isRead ? " •" : ""}</button>
          <button type="button" onClick={() => setForwarding(item)}>{isCenter ? "Аскер бөлүгүнө жөнөтүү" : "Администраторго жөнөтүү"}</button>
        </div>)}
      </div>)}
    </section>
    <SubmissionForwardDialog submission={forwarding} onClose={() => setForwarding(null)} titleLabel={isCenter ? "Документти аскер бөлүгүнө жөнөтүү" : "Документти администраторго жөнөтүү"} onForward={async (item, title) => {
      await forwardThematicAccountSubmission(item.id, title);
      setNotice(isCenter ? "Документ аскер бөлүгүнө жөнөтүлдү." : "Документ администраторго жөнөтүлдү.");
    }} />
  </>;
}
