import React, { useEffect, useState } from "react";

import {
  getThematicAccountSubmissions,
  hideThematicAccountSubmission,
} from "../../../api/dashboard.js";
import { getApiErrorMessage } from "../../../api/errors.js";
import ModuleBanners from "./ModuleBanners.jsx";

const sectionLabels = {
  "combat-training-analysis": "Күжүрмөн даярдоонун талдоосу",
  "combat-training-analysis-regional": "Күжүрмөн даярдоонун талдоосу",
  "combat-training-command-journal": "Командирдик даярдоону каттоо журналы",
  "combat-training-personnel-journal": "Күжүрмөн даярдоону каттоо журналы",
  "combat-training-results-inspection": "Көзөмөл текшерүү сабактары",
  "combat-training-results-observation": "Көзөмөл сабактары",
  "command-lesson-schedule": "Командирдик даярдоонун сабактар жүгүртмөсү",
  "command-thematic-account": "Командирдик даярдоонун тематикалык эсеби",
  "lesson-schedule": "Сабактардын жүгүртмөсү",
  "meetings-analysis": "Жыйындардын талдоосу",
  "meetings-combat-training-journal": "Жыйындардын каттоо журналы",
  "meetings-lesson-schedule": "Жыйындардын сабактар жүгүртмөсү",
  "meetings-observation": "Жыйындардын көзөмөл сабактары",
  "meetings-thematic-account": "Жыйындардын тематикалык эсеби",
  "memo-letter": "Билдирме кат",
  "thematic-account": "Сабактардын тематикалык эсеби",
  "typical-week": "Типтүү жума",
  "young-soldier-analysis": "Жаш жоокерлерди даярдоонун талдоосу",
  "young-soldier-combat-training-journal": "Жаш жоокерлерди даярдоо журналы",
  "young-soldier-lesson-schedule": "Жаш жоокерлердин сабактар жүгүртмөсү",
  "young-soldier-observation": "Жаш жоокерлердин көзөмөл сабактары",
  "young-soldier-thematic-account": "Жаш жоокерлердин тематикалык эсеби",
};

const commonLinks = [
  { id: "library", icon: "▤", label: "Сабактардын тематикасынын эсеби" },
  { id: "combatTrainingJournal", icon: "▦", label: "Күжүрмөн даярдоону каттоо журналы" },
  { id: "combatTrainingResults", icon: "✓", label: "Күжүрмөн даярдоонун жыйынтыктары" },
  { id: "combatTrainingAnalytics", icon: "⌁", label: "Күжүрмөн даярдоонун талдоолору" },
  { id: "smr", icon: "◇", label: "Усулдук колдонмолор" },
  { id: "combatTrainingPlan", icon: "□", label: "Пландалган иш-чаралар" },
  { id: "combatTrainingReport", icon: "◫", label: "Күжүрмөн даярдоонун маалыматтары" },
  { id: "contactAdmin", icon: "✉", label: "Байланыш" },
  { id: "memoLetter", icon: "✎", label: "Билдирме кат" },
];

const adminLinks = [
  ...commonLinks.slice(0, 3),
  { id: "meetings", icon: "◉", label: "Жыйындар" },
  { id: "youngSoldierTrainingCourse", icon: "★", label: "Жаш жоокерлерди даярдоо курсу" },
  ...commonLinks.slice(3),
  { id: "users", icon: "♙", label: "Колдонуучулар" },
  { id: "requests", icon: "⌛", label: "Өтүнмөлөр" },
  { id: "submissionEditRequests", icon: "☑", label: "Уруксат сурамдары" },
  { id: "documents", icon: "▧", label: "Документтер" },
  { id: "regionalUnitRating", icon: "♜", label: "Рейтинг" },
];

const regionalLinks = [
  ...commonLinks.slice(0, 3),
  { id: "meetings", icon: "◉", label: "Жыйындар" },
  { id: "youngSoldierTrainingCourse", icon: "★", label: "Жаш жоокерлерди даярдоо курсу" },
  ...commonLinks.slice(3),
  { id: "regionalUsers", icon: "♙", label: "Колдонуучулар" },
  { id: "outpostRating", icon: "♜", label: "Заставалардын рейтинги" },
];

const formatMonth = (value) => {
  const [year, month] = String(value || "").split("-").map(Number);
  const date = year && month ? new Date(year, month - 1, 1) : new Date();
  const label = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export default function DashboardHome({ data, modules, onNavigate, user }) {
  const [sentDocuments, setSentDocuments] = useState([]);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [isDocumentsLoading, setIsDocumentsLoading] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState(null);
  const [documentsError, setDocumentsError] = useState("");
  const [monthlyCount, setMonthlyCount] = useState(data?.sentDocuments || 0);
  const role = user?.role;
  const links = role === "admin" ? adminLinks : role === "regional" ? regionalLinks : commonLinks;
  const contactLabel = role === "outpost"
    ? "Аскер бөлүк менен байланыш"
    : "Колдонуучулар менен байланыш";
  const visibleLinks = links
    .filter((item) => item.id !== "combatTrainingJournal" || modules?.combatTrainingJournal)
    .map((item) => (item.id === "contactAdmin" ? { ...item, label: contactLabel } : item));
  const notifications = Array.isArray(data?.notifications) ? data.notifications : [];

  useEffect(() => {
    setMonthlyCount(data?.sentDocuments || 0);
  }, [data?.sentDocuments]);

  const openSentDocuments = async () => {
    setIsDocumentsOpen(true);
    setIsDocumentsLoading(true);
    setDocumentsError("");
    try {
      const items = await getThematicAccountSubmissions();
      setSentDocuments(
        (Array.isArray(items) ? items : [])
          .filter((item) => String(item.senderId) === String(user?.id))
          .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      );
    } catch (requestError) {
      setDocumentsError(
        getApiErrorMessage(requestError, "Жөнөтүлгөн документтерди жүктөө мүмкүн болгон жок.")
      );
    } finally {
      setIsDocumentsLoading(false);
    }
  };

  const removeSentDocument = async (document) => {
    if (!window.confirm(`«${document.documentTitle || "Документ"}» документин өз тизмеңизден өчүрөсүзбү? Документ алуучуларда сакталат.`)) {
      return;
    }
    setDeletingDocumentId(document.id);
    setDocumentsError("");
    try {
      await hideThematicAccountSubmission(document.id);
      setSentDocuments((items) => items.filter((item) => item.id !== document.id));

      const documentDate = new Date(document.createdAt);
      const [currentYear, currentMonth] = String(data?.month || "").split("-").map(Number);
      if (
        currentYear &&
        currentMonth &&
        documentDate.getFullYear() === currentYear &&
        documentDate.getMonth() + 1 === currentMonth
      ) {
        setMonthlyCount((count) => Math.max(0, count - 1));
      }
    } catch (requestError) {
      setDocumentsError(
        getApiErrorMessage(requestError, "Документти өчүрүү мүмкүн болгон жок.")
      );
    } finally {
      setDeletingDocumentId(null);
    }
  };

  return (
    <div className="dashboard-home">
      <ModuleBanners moduleKey="home" user={user} />

      {role === "admin" ? (
        <section className="dashboard-home__section">
          <div className="dashboard-home__heading">
            <div>
              <span>Башкаруу панели</span>
              <h1>Билдирүүлөр</h1>
            </div>
            <strong className="dashboard-home__notification-total">
              {notifications.reduce((total, item) => total + Number(item.count || 0), 0)}
            </strong>
          </div>
          <div className="dashboard-home__notifications">
            {notifications.map((item) => (
              <button key={item.id} onClick={() => onNavigate?.(item.target)} type="button">
                <span className="dashboard-home__notification-icon">!</span>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <button className="dashboard-home__monthly-stat" onClick={openSentDocuments} type="button">
          <div className="dashboard-home__monthly-icon">▧</div>
          <div>
            <span>{formatMonth(data?.month)}</span>
            <h1>Жөнөтүлгөн документтер</h1>
          </div>
          <strong>{monthlyCount}</strong>
        </button>
      )}

      <section className="dashboard-home__section">
        <div className="dashboard-home__heading">
          <div>
            <span>Навигация</span>
            <h2>Тез жетүү</h2>
          </div>
        </div>
        <div className="dashboard-home__quick-grid">
          {visibleLinks.map((item) => (
            <button key={item.id} onClick={() => onNavigate?.(item.id)} type="button">
              <span className="dashboard-home__quick-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              <small aria-hidden="true">→</small>
            </button>
          ))}
        </div>
      </section>

      {isDocumentsOpen ? (
        <div className="dashboard-home-documents" role="dialog" aria-modal="true" aria-labelledby="sent-documents-title">
          <section className="dashboard-home-documents__panel">
            <header>
              <div>
                <span>Бардыгы: {sentDocuments.length}</span>
                <h2 id="sent-documents-title">Жөнөтүлгөн документтер</h2>
              </div>
              <button aria-label="Жабуу" onClick={() => setIsDocumentsOpen(false)} type="button">×</button>
            </header>

            {isDocumentsLoading ? <p className="dashboard-home-documents__state">Жүктөлүүдө...</p> : null}
            {documentsError ? <p className="dashboard-error">{documentsError}</p> : null}
            {!isDocumentsLoading && !documentsError && sentDocuments.length === 0 ? (
              <p className="dashboard-home-documents__state">Азырынча жөнөтүлгөн документтер жок.</p>
            ) : null}
            {!isDocumentsLoading && sentDocuments.length ? (
              <div className="dashboard-home-documents__list">
                {sentDocuments.map((document) => (
                  <article key={document.id}>
                    <div className="dashboard-home-documents__document-icon">▧</div>
                    <div>
                      <h3>{document.documentTitle || "Аталышы жок документ"}</h3>
                      <p>{sectionLabels[document.sectionId] || document.sectionId || "Документ"}</p>
                      <small>
                        {document.registrationCode ? `№ ${document.registrationCode} · ` : ""}
                        {document.createdAt ? new Date(document.createdAt).toLocaleString("ky-KG") : ""}
                      </small>
                    </div>
                    <button
                      className="dashboard-home-documents__delete"
                      disabled={deletingDocumentId === document.id}
                      onClick={() => removeSentDocument(document)}
                      type="button"
                    >
                      {deletingDocumentId === document.id ? "Өчүрүлүүдө..." : "Өчүрүү"}
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
