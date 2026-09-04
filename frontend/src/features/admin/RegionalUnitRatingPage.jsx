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
const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const PIE_COLORS = ["#d8b84b", "#35b96b", "#46a5d8", "#9274d4", "#da765b", "#65c7ba", "#cf6090", "#8ca64b"];

function ScoreMetrics({ item }) {
  return <div className="regional-rating-metrics">
    <span>Жалпы рейтинг <strong>{item.score}%</strong></span>
    {item.unitBonus ? <span>Аскер бөлүгүнүн үстөк пайызы <strong>+{item.unitBonus}%</strong></span> : null}
    {item.criteriaPenalty ? <span>Аткарылбаган критерийлер үчүн <strong>−{item.criteriaPenalty}%</strong></span> : null}
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

function RatingPieChart({ items, type }) {
  const slices = items.slice(0, 8);
  const total = slices.reduce((sum, item) => sum + Math.max(0, Number(item.score) || 0), 0);
  const circleLength = 2 * Math.PI * 72;
  let offset = 0;

  return <section className="regional-rating-pie">
    <div className="regional-rating-pie__chart" aria-label="Круговая диаграмма рейтинга" role="img">
      <svg viewBox="0 0 180 180">
        <circle className="regional-rating-pie__track" cx="90" cy="90" r="72" />
        {slices.map((item, index) => {
          const value = Math.max(0, Number(item.score) || 0);
          const length = total ? (value / total) * circleLength : 0;
          const sliceOffset = offset;
          offset += length;
          return <circle
            className="regional-rating-pie__slice"
            cx="90"
            cy="90"
            key={`${item.unitNumber}-${item.outpostName || index}`}
            r="72"
            stroke={PIE_COLORS[index % PIE_COLORS.length]}
            strokeDasharray={`${length} ${circleLength - length}`}
            strokeDashoffset={-sliceOffset}
            style={{ "--slice-delay": `${index * 110}ms` }}
          />;
        })}
      </svg>
      <div className="regional-rating-pie__total"><strong>{total.toFixed(1)}%</strong><span>жалпы көрсөткүч</span></div>
    </div>
    <div className="regional-rating-pie__legend">
      {slices.map((item, index) => <div key={`${item.unitNumber}-${item.outpostName || index}`}>
        <i style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
        <span>{type === "units" ? `${item.unitNumber} аскер бөлүгү` : item.outpostName}</span>
        <strong>{item.score}%</strong>
      </div>)}
    </div>
  </section>;
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
  const [ratingPeriod, setRatingPeriod] = useState("all");
  const [periodPage, setPeriodPage] = useState(null);
  const [periodSelectedItem, setPeriodSelectedItem] = useState(null);
  const currentYear = new Date().getFullYear();
  const [ratingYear, setRatingYear] = useState(currentYear);
  const [ratingMonth, setRatingMonth] = useState(new Date().getMonth() + 1);
  const [selectedUnitNumber, setSelectedUnitNumber] = useState(null);
  const selectedUnit = data.units.find((item) => item.unitNumber === selectedUnitNumber);
  const displayedItems = useMemo(() => entityType === "units" ? data.units : data.outposts, [data, entityType]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getRegionalUnitRatings({ period: ratingPeriod, year: ratingYear, month: ratingMonth }).then((items) => { if (mounted) setData(items); })
      .catch((requestError) => { if (mounted) setError(getApiErrorMessage(requestError, "Рейтингди жүктөө мүмкүн болгон жок.")); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [ratingMonth, ratingPeriod, ratingYear]);

  if (periodPage && periodSelectedItem) {
    const { item, type } = periodSelectedItem;
    const title = type === "units" ? `${item.unitNumber} аскер бөлүгү` : item.outpostName;
    return <section className="module-panel regional-rating regional-rating-detail-page">
      <button className="module-back-button" onClick={() => setPeriodSelectedItem(null)} type="button">Артка</button>
      <header className="module-header">
        <div>
          <p className="eyebrow">{periodPage === "month" ? "Айлык рейтинг" : periodPage === "year" ? "Жылдык рейтинг" : "Бардык жөнөтүлгөн документтер"}</p>
          <h1>{title}</h1>
          {type === "outposts" ? <p>Аскер бөлүгү: {item.unitNumber}</p> : null}
        </div>
      </header>
      <div className="regional-rating-detail-criteria">
        <span>Жалпы рейтинг <strong>{item.score}%</strong></span>
        <span>Документтер <strong>{item.totalDocuments}</strong></span>
        <span>Өз убагында <strong>{item.onTimeDocuments}</strong></span>
        {type === "units" ? <><span>Аскер бөлүгүнөн <strong>{item.regionalDocuments}</strong></span><span>Заставалардан <strong>{item.outpostDocuments}</strong></span></> : null}
        <span>Колдонуучулар <strong>{item.userCount}</strong></span>
        <span>Активдүү колдонуучулар <strong>{item.activeUserCount}</strong></span>
      </div>
      <h2 className="regional-rating-detail-page__subtitle">Рейтингдин критерийлери</h2>
      <ScoreMetrics item={item} />
      <div className="regional-rating-detail-page__formula">
        <span>Дедлайн — 50%</span><span>Документтердин көлөмү — 30%</span><span>Активдүүлүк — 20%</span><span>Ар бир аткарылбаган критерий — −20%</span>{type === "units" ? <span>Аскер бөлүгүнө — +2%</span> : null}
      </div>
      <h2 className="regional-rating-detail-page__subtitle">Документтердин бөлүмдөрү</h2>
      <div className="regional-rating-card__sections regional-rating-detail-page__sections">
        {item.sections?.length ? item.sections.map((section) => <span key={section.sectionId}>{SECTION_LABELS[section.sectionId] || section.sectionId}: <strong>{section.count}</strong></span>) : <span>Бул мезгилде документтер жок.</span>}
      </div>
      <ActivityLog actions={item.actions} />
    </section>;
  }

  if (periodPage) return <section className="module-panel regional-rating regional-rating-chart-page">
    <button className="module-back-button" onClick={() => setPeriodPage(null)} type="button">Артка</button>
    <header className="module-header">
      <div>
        <p className="eyebrow">Рейтингдин аналитикасы</p>
        <h1>{periodPage === "month" ? "Айлык рейтинг" : periodPage === "year" ? "Жылдык рейтинг" : "Жалпы рейтинг"}</h1>
        <p>Ар бир тилке жалпы рейтингди көрсөтөт. Тизмени аскер бөлүктөрү же заставалар боюнча ачыңыз.</p>
      </div>
    </header>
    <div className="regional-rating-controls">
      <button className={entityType === "units" ? "is-active" : ""} onClick={() => setEntityType("units")} type="button">Аскер бөлүктөрү</button>
      <button className={entityType === "outposts" ? "is-active" : ""} onClick={() => setEntityType("outposts")} type="button">Заставалар</button>
    </div>
    <div className="regional-rating-period-picker">
      {periodPage !== "all" ? <label>Жыл<select onChange={(event) => setRatingYear(Number(event.target.value))} value={ratingYear}>{Array.from({ length: 6 }, (_, index) => currentYear - index).map((year) => <option key={year} value={year}>{year}</option>)}</select></label> : null}
      {periodPage === "month" ? <label>Ай<select onChange={(event) => setRatingMonth(Number(event.target.value))} value={ratingMonth}>{MONTH_NAMES.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label> : null}
    </div>
    {error ? <p className="dashboard-error">{error}</p> : null}
    {loading ? <p className="dashboard-state">Рейтинг жүктөлүүдө...</p> : null}
    {!loading && !error && displayedItems.length > 0 ? <>
      <RatingPieChart items={displayedItems} type={entityType} />
      <h2 className="regional-rating-chart-page__list-title">Бардык {entityType === "units" ? "аскер бөлүктөрү" : "заставалар"}</h2>
      <div className="regional-rating__list">
        {displayedItems.map((item) => <RatingCard item={item} key={`${item.unitNumber}-${item.outpostName || "unit"}`} onOpen={() => setPeriodSelectedItem({ item, type: entityType })} type={entityType} />)}
      </div>
    </> : null}
    {!loading && !error && !displayedItems.length ? <p className="dashboard-state">Бул мезгил үчүн маалымат азырынча жок.</p> : null}
  </section>;

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
    <header className="module-header"><div><p className="eyebrow">Документтер, дедлайндар жана платформадагы активдүүлүк</p><h1>Жалпы рейтинг</h1><p>Аскер бөлүгүнүн көрсөткүчү ага катталган заставалар менен чогуу эсептелет жана жыйынтыгына 2% кошулат.</p></div></header>
    <div className="regional-rating-controls">
      <button className={ratingPeriod === "all" ? "is-active" : ""} onClick={() => { setRatingPeriod("all"); setPeriodSelectedItem(null); setPeriodPage("all"); setDisplayMode("rating"); }} type="button">Бардык рейтинг</button>
      <button className={ratingPeriod === "month" ? "is-active" : ""} onClick={() => { setRatingPeriod("month"); setPeriodSelectedItem(null); setPeriodPage("month"); setDisplayMode("rating"); }} type="button">Айлык рейтинг</button>
      <button className={ratingPeriod === "year" ? "is-active" : ""} onClick={() => { setRatingPeriod("year"); setPeriodSelectedItem(null); setPeriodPage("year"); setDisplayMode("rating"); }} type="button">Жылдык рейтинг</button>
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
