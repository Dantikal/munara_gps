import React, { useEffect, useMemo, useState } from "react";

import { getRegionalUnitRatings } from "../../api/dashboard.js";
import { getApiErrorMessage } from "../../api/errors.js";

export const SECTION_LABELS = {
  "thematic-account": "Тематикалык эсеп",
  "lesson-schedule": "Сабактардын жүгүртмөсү",
  "command-thematic-account": "Командирдик даярдоонун тематикалык эсеби",
  "command-lesson-schedule": "Командирдик даярдоонун сабактар жүгүртмөсү",
  "typical-week": "Типтүү жума",
  "combat-training-personnel-journal": "Жеке курамдын даярдык журналы",
  "combat-training-command-journal": "Командирдик даярдык журналы",
  "combat-training-results-observation": "Көзөмөл сабактары",
  "combat-training-results-inspection": "Көзөмөл текшерүү сабактары",
  "combat-training-analysis": "Күжүрмөн даярдоонун талдоосу",
  "combat-training-analysis-regional": "Аскер бөлүгүнүн талдоосу",
  "meetings-thematic-account": "Жыйындардын тематикалык эсеби",
  "meetings-lesson-schedule": "Жыйындардын сабактар жүгүртмөсү",
  "meetings-combat-training-journal": "Жыйындардын даярдык журналы",
  "meetings-observation": "Жыйындардын көзөмөл сабактары",
  "meetings-analysis": "Жыйындардын талдоосу",
  "young-soldier-thematic-account": "Жаш жоокерлердин тематикалык эсеби",
  "young-soldier-lesson-schedule": "Жаш жоокерлердин сабактар жүгүртмөсү",
  "young-soldier-combat-training-journal": "Жаш жоокерлердин даярдык журналы",
  "young-soldier-observation": "Жаш жоокерлердин көзөмөл сабактары",
  "young-soldier-analysis": "Жаш жоокерлердин талдоосу",
  "memo-letter": "Билдирме кат",
};

export const getMedal = (rank) => ({ 1: "🥇", 2: "🥈", 3: "🥉" }[rank] || `№ ${rank}`);
const formatDateTime = (value) => value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "Кире элек";

function ScoreMetrics({ item }) {
  return <div className="regional-rating-metrics">
    <span>Жалпы рейтинг <strong>{item.score}%</strong></span>
    <span>Дедлайн <strong>{item.deadlineScore}%</strong></span>
    <span>Документтер <strong>{item.documentScore}%</strong></span>
    <span>Активдүүлүк <strong>{item.activityScore}%</strong></span>
  </div>;
}

function RatingChart({ items, type }) {
  if (type === "units") {
    const chartMaximum = 100;
    const ticks = [100, 80, 60, 40, 20, 0];
    return <div className="regional-rating-vertical-chart regional-rating-vertical-chart--score">
      <h2>Аскер бөлүктөрүнүн графиги</h2>
      <div className="regional-rating-vertical-chart__scroll">
        <div className="regional-rating-vertical-chart__canvas" style={{ minWidth: `${Math.max(620, items.length * 92)}px` }}>
          <div className="regional-rating-vertical-chart__axis">{ticks.map((tick) => <span key={tick} style={{ top: `${((chartMaximum - tick) / chartMaximum) * 300}px` }}>{tick}%</span>)}</div>
          <div className="regional-rating-vertical-chart__plot">
            <div className="regional-rating-vertical-chart__grid">{ticks.map((tick) => <span key={tick} style={{ top: `${((chartMaximum - tick) / chartMaximum) * 300}px` }} />)}</div>
            <div className="regional-rating-vertical-chart__columns">{items.map((item) => <div className="regional-rating-vertical-chart__column" key={item.unitNumber}>
              <div className="regional-rating-vertical-chart__bar-area"><span className="regional-rating-vertical-chart__bar" style={{ height: `${Math.max(2, ((item.score || 0) / chartMaximum) * 300)}px` }} title={`Аскер бөлүгү ${item.unitNumber}: ${item.score}%`}><i>{item.score}%</i></span></div>
              <strong>Аскер бөлүгү<br />{item.unitNumber}</strong>
            </div>)}</div>
          </div>
        </div>
      </div>
    </div>;
  }

  return <div className="regional-rating-score-chart">
    <div className="regional-rating-score-chart__axis" aria-hidden="true">
      {[0, 20, 40, 60, 80, 100].map((tick) => <span key={tick}>{tick}%</span>)}
    </div>
    {items.map((item) => {
    const label = type === "units" ? `Аскер бөлүгү ${item.unitNumber}` : `${item.outpostName} · ${item.unitNumber}`;
    return <div className="regional-rating-score-chart__row" key={`${item.unitNumber}-${item.outpostName || "unit"}`}>
      <strong>{label}</strong>
      <div className="regional-rating-score-chart__track"><span style={{ width: `${Math.max(0, Math.min(100, item.score || 0))}%` }}><i>{item.score}%</i></span></div>
      <b>{item.score}%</b>
    </div>;
  })}</div>;
}

function ActivityLog({ actions }) {
  return <div className="regional-rating-actions"><h3>Акыркы аракеттер</h3>
    {actions?.length ? actions.map((action, index) => <div className="regional-rating-action" key={`${action.at}-${index}`}>
      <span className={`regional-rating-action__type regional-rating-action__type--${action.type}`}>{action.type === "login" ? "Кирүү" : action.onTime ? "Өз убагында" : "Кечикти"}</span>
      <div><strong>{action.title}</strong>{action.sectionId ? <small>{SECTION_LABELS[action.sectionId] || action.sectionId} · дедлайн: айдын {action.deadlineDay}-күнү</small> : null}</div>
      <time>{formatDateTime(action.at)}</time>
    </div>) : <p className="dashboard-state">Аракеттер азырынча жок.</p>}
  </div>;
}

function RatingCard({ item, type, onOpen }) {
  return <article
    className={`regional-rating-card regional-rating-card--rank-${Math.min(item.rank, 4)}${onOpen ? " regional-rating-card--clickable" : ""}`}
    onClick={onOpen}
    onKeyDown={onOpen ? (event) => { if (["Enter", " "].includes(event.key)) onOpen(); } : undefined}
    role={onOpen ? "button" : undefined}
    tabIndex={onOpen ? 0 : undefined}
  >
    <div className="regional-rating-card__rank">{getMedal(item.rank)}</div>
    <div className="regional-rating-card__main">
      <h2>{type === "units" ? `Аскер бөлүгү ${item.unitNumber}` : item.outpostName}</h2>
      {type === "outposts" ? <p>Аскер бөлүгү {item.unitNumber}</p> : null}
      <div className="regional-rating-card__sources">
        {type === "units" ? <><span>Аскер бөлүгү: <strong>{item.regionalDocuments}</strong></span><span>Заставалар: <strong>{item.outpostDocuments}</strong></span></> : <span>Документтер: <strong>{item.totalDocuments}</strong></span>}
      </div>
      <ScoreMetrics item={item} />
      <div className="regional-rating-card__sections">{item.sections.length ? item.sections.map((section) => <span key={section.sectionId}>{SECTION_LABELS[section.sectionId] || section.sectionId}: <strong>{section.count}</strong></span>) : <span>Документтер жөнөтүлө элек</span>}</div>
    </div>
    <div className="regional-rating-card__score"><strong>{item.score}%</strong><span>рейтинг</span></div>
  </article>;
}

export default function RegionalUnitRatingPage() {
  const [data, setData] = useState({ units: [], outposts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entityType, setEntityType] = useState("units");
  const [displayMode, setDisplayMode] = useState("rating");
  const [selectedUnitNumber, setSelectedUnitNumber] = useState(null);
  const selectedUnit = data.units.find((item) => item.unitNumber === selectedUnitNumber);
  const displayedItems = useMemo(() => entityType === "units" ? data.units : data.outposts, [data, entityType]);

  useEffect(() => {
    let mounted = true;
    getRegionalUnitRatings().then((items) => { if (mounted) setData(items); })
      .catch((requestError) => { if (mounted) setError(getApiErrorMessage(requestError, "Рейтингди жүктөө мүмкүн болгон жок.")); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (selectedUnit) return <section className="module-panel regional-rating">
    <button className="module-back-button" onClick={() => { setSelectedUnitNumber(null); setDisplayMode("rating"); }} type="button">Артка</button>
    <header className="module-header"><div><p className="eyebrow">Аскер бөлүгүнүн толук маалыматы</p><h1>Аскер бөлүгү {selectedUnit.unitNumber}</h1><p>Акыркы кирүү: {formatDateTime(selectedUnit.lastSeen)}</p></div>
      <button onClick={() => setDisplayMode((mode) => mode === "detail-chart" ? "rating" : "detail-chart")} type="button">{displayMode === "detail-chart" ? "Заставалар" : "Заставалардын графиги"}</button>
    </header>
    <ScoreMetrics item={selectedUnit} />
    {displayMode === "detail-chart" ? <RatingChart items={selectedUnit.outposts || []} type="outposts" /> : <div className="regional-rating__list">{(selectedUnit.outposts || []).map((outpost) => <RatingCard item={outpost} key={outpost.outpostName} type="outposts" />)}</div>}
    <ActivityLog actions={selectedUnit.actions} />
  </section>;

  return <section className="module-panel regional-rating">
    <header className="module-header"><div><p className="eyebrow">Документтер, дедлайндар жана платформадагы активдүүлүк</p><h1>Жалпы рейтинг</h1><p>Дедлайн — 50%, документтердин көлөмү — 30%, акыркы 30 күндөгү активдүүлүк — 20%.</p></div></header>
    <div className="regional-rating-controls">
      <button className={entityType === "units" ? "is-active" : ""} onClick={() => { setEntityType("units"); setDisplayMode("rating"); }} type="button">Аскер бөлүктөрүнүн жалпы рейтинги жана графиги</button>
      <button className={entityType === "outposts" ? "is-active" : ""} onClick={() => { setEntityType("outposts"); setDisplayMode("rating"); }} type="button">Заставалардын жалпы рейтинги жана графиги</button>
      <button disabled={!displayedItems.length} onClick={() => setDisplayMode((mode) => mode === "chart" ? "rating" : "chart")} type="button">{displayMode === "chart" ? "Рейтингге кайтуу" : entityType === "units" ? "Аскер бөлүктөрүнүн графиги" : "Заставалардын графиги"}</button>
    </div>
    {error ? <p className="dashboard-error">{error}</p> : null}
    {loading ? <p className="dashboard-state">Рейтинг жүктөлүүдө...</p> : null}
    {!loading && !error && !displayedItems.length ? <p className="dashboard-state">Рейтинг үчүн маалымат азырынча жок.</p> : null}
    {!loading && displayedItems.length > 0 && displayMode === "chart" ? <RatingChart items={displayedItems} type={entityType} /> : null}
    {!loading && displayedItems.length > 0 && displayMode !== "chart" ? <div className="regional-rating__list">{displayedItems.map((item) => <RatingCard item={item} key={`${item.unitNumber}-${item.outpostName || "unit"}`} onOpen={entityType === "units" ? () => setSelectedUnitNumber(item.unitNumber) : undefined} type={entityType} />)}</div> : null}
  </section>;
}
