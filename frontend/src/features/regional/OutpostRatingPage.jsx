import React, { useEffect, useState } from "react";

import { getOutpostRatings, getRegionalUnitRatings } from "../../api/dashboard.js";
import { getApiErrorMessage } from "../../api/errors.js";
import { getMedal, SECTION_LABELS } from "../admin/RegionalUnitRatingPage.jsx";

const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const LAST_COMPLETED_MONTH = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);

export default function OutpostRatingPage({ user }) {
  const [ratings, setRatings] = useState([]);
  const [unitRatings, setUnitRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("rating");
  const [ratingPeriod, setRatingPeriod] = useState("month");
  const [ratingYear, setRatingYear] = useState(LAST_COMPLETED_MONTH.getFullYear());
  const [ratingMonth, setRatingMonth] = useState(LAST_COMPLETED_MONTH.getMonth() + 1);
  const [ratingHalf, setRatingHalf] = useState(new Date().getMonth() < 6 ? 1 : 2);
  const totalDocuments = ratings.reduce((sum, item) => sum + item.totalDocuments, 0);
  const chartData = ratings.map((item) => ({
    ...item,
    percentage: user?.role === "outpost"
      ? Number(item.score) || 0
      : totalDocuments ? (item.totalDocuments / totalDocuments) * 100 : 0,
  }));
  const hasRatingData = chartData.some((item) => item.totalDocuments > 0 || item.percentage > 0);
  const chartMaximum = 100;
  const chartTicks = Array.from(
    { length: chartMaximum / 10 + 1 },
    (_, index) => chartMaximum - index * 10
  );
  const normalizeOutpostName = (value) => String(value || "")
    .replace(/\s+чек ара заставасы$/u, "")
    .trim()
    .toLocaleLowerCase("ky-KG");
  const isCurrentOutpost = (item) => user?.role === "outpost" &&
    String(item.unitNumber) === String(user?.region) &&
    normalizeOutpostName(item.outpostName) === normalizeOutpostName(user?.outpost_name);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const ratingsRequest = user?.role === "outpost"
      ? getRegionalUnitRatings({ period: ratingPeriod, year: ratingYear, month: ratingMonth, half: ratingHalf }).then((items) => items.outposts || [])
      : getOutpostRatings({ period: ratingPeriod, year: ratingYear, month: ratingMonth, half: ratingHalf });
    ratingsRequest
      .then((items) => {
        if (mounted) setRatings(items);
      })
      .catch((requestError) => {
        if (mounted) {
          setError(getApiErrorMessage(requestError, "Заставалардын рейтингин жүктөө мүмкүн болгон жок."));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [ratingHalf, ratingMonth, ratingPeriod, ratingYear, user?.role]);

  useEffect(() => {
    if (user?.role !== "regional") return undefined;
    let mounted = true;
    getRegionalUnitRatings({ period: ratingPeriod, year: ratingYear, month: ratingMonth, half: ratingHalf })
      .then((items) => { if (mounted) setUnitRatings(items.units || []); })
      .catch((requestError) => {
        if (mounted) setError(getApiErrorMessage(requestError, "Аскер бөлүктөрүнүн рейтингин жүктөө мүмкүн болгон жок."));
      });
    return () => { mounted = false; };
  }, [ratingHalf, ratingMonth, ratingPeriod, ratingYear, user?.role]);

  if (activeView === "units") {
    return (
      <section className="module-panel regional-rating">
        <button className="module-back-button" onClick={() => setActiveView("rating")} type="button">Артка</button>
        <header className="module-header"><div><p className="eyebrow">Жалпы система</p><h1>Аскер бөлүктөрдүн рейтинги</h1><p>Сиздин аскер бөлүгүңүз тизмеде өзгөчө түс менен белгиленген.</p></div></header>
        <div className="regional-rating__list">
          {unitRatings.map((item) => {
            const isCurrent = String(item.unitNumber) === String(user?.region);
            return <article className={`regional-rating-card regional-rating-card--rank-${Math.min(item.rank, 4)}${isCurrent ? " regional-rating-card--current" : ""}`} key={item.unitNumber}>
              <div className="regional-rating-card__rank">{getMedal(item.rank)}</div>
              <div className="regional-rating-card__main"><h2>{item.unitNumber} аскер бөлүгү</h2>{isCurrent ? <strong className="regional-rating-card__current-label">Сиздин аскер бөлүгүңүз</strong> : null}</div>
              <div className="regional-rating-card__score"><strong>{item.score}%</strong><span>рейтинг</span></div>
            </article>;
          })}
        </div>
      </section>
    );
  }

  if (activeView === "chart") {
    return (
      <section className="module-panel regional-rating regional-rating-chart-page">
        <button className="module-back-button" onClick={() => setActiveView("rating")} type="button">
          Артка
        </button>
        <header className="module-header">
          <div>
            <p className="eyebrow">{`Аскер бөлүгү ${user?.region}`}</p>
            <h1>{ratingPeriod === "month" ? "Айлык рейтинг" : ratingPeriod === "half-year" ? "Жарым жылдык рейтинг" : "Жылдык рейтинг"}</h1>
            <p>{user?.role === "outpost" ? "Ар бир тилке заставанын ушул мезгилдеги реалдуу рейтингин көрсөтөт. Сиздин заставаңыз алтын түс менен белгиленген." : "Ар бир тилке заставанын ушул мезгилдеги документтеринин үлүшүн көрсөтөт."}</p>
          </div>
        </header>
        <div className="regional-rating-period-picker">
          <label>Жыл<select onChange={(event) => setRatingYear(Number(event.target.value))} value={ratingYear}>{Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - index).map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
          {ratingPeriod === "month" ? <label>Ай<select onChange={(event) => setRatingMonth(Number(event.target.value))} value={ratingMonth}>{MONTH_NAMES.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label> : null}
          {ratingPeriod === "half-year" ? <label>Жарым жылдык<select onChange={(event) => setRatingHalf(Number(event.target.value))} value={ratingHalf}><option value={1}>I жарым жылдык</option><option value={2}>II жарым жылдык</option></select></label> : null}
        </div>
        {!loading && !error && !hasRatingData ? <p className="dashboard-state">Бул мезгилде документтер жөнөтүлгөн эмес. Башка айды же мезгилди тандаңыз.</p> : null}
        <div className="regional-rating-vertical-chart">
          <div className="regional-rating-vertical-chart__scroll">
            <div
              className="regional-rating-vertical-chart__canvas"
              style={{ minWidth: `${Math.max(620, chartData.length * 140)}px` }}
            >
              <div className="regional-rating-vertical-chart__axis">
                {chartTicks.map((tick) => (
                  <span key={tick} style={{ top: `${((chartMaximum - tick) / chartMaximum) * 300}px` }}>
                    {tick}%
                  </span>
                ))}
              </div>
              <div className="regional-rating-vertical-chart__plot">
                <div className="regional-rating-vertical-chart__grid">
                  {chartTicks.map((tick) => (
                    <span key={tick} style={{ top: `${((chartMaximum - tick) / chartMaximum) * 300}px` }} />
                  ))}
                </div>
                <div className="regional-rating-vertical-chart__columns">
                  {chartData.map((item) => {
                    const isCurrent = isCurrentOutpost(item);
                    return (
                    <div className={`regional-rating-vertical-chart__column${isCurrent ? " regional-rating-vertical-chart__column--current" : ""}`} key={`${item.unitNumber}-${item.outpostName}`}>
                      <div className="regional-rating-vertical-chart__bar-area">
                        <span
                          aria-label={`${item.outpostName}: ${item.percentage.toFixed(1)}%`}
                          className={`regional-rating-vertical-chart__bar${isCurrent ? " regional-rating-vertical-chart__bar--current" : ""}`}
                          style={{ height: `${(item.percentage / chartMaximum) * 300}px` }}
                          title={`${item.outpostName}: ${user?.role === "outpost" ? `${item.score}%` : `${item.totalDocuments} документ`}`}
                        ><i>{item.percentage.toFixed(1)}%</i></span>
                      </div>
                      <strong>{item.outpostName}{user?.role === "outpost" ? ` · ${item.unitNumber}` : ""}{isCurrent ? <small>Сиздин заставаңыз</small> : null}</strong>
                    </div>
                  );})}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="module-panel regional-rating">
      <header className="module-header">
        <div>
          <p className="eyebrow">{`Аскер бөлүгү ${user?.region}`}</p>
          <h1>Заставалардын рейтинги</h1>
          <p>{user?.role === "outpost" ? "Сиздин аскер бөлүгүңүзгө караган бардык заставалар. Сиздин заставаңыз өзгөчө түс менен белгиленген." : "Сиздин аскер бөлүгүңүзгө караган заставалар жөнөткөн документтердин саны."}</p>
        </div>
        <button disabled={loading || ratings.length === 0} onClick={() => setActiveView("chart")} type="button">
          График
        </button>
      </header>

      <div className="regional-rating-controls">
        {user?.role === "regional" ? <button onClick={() => setActiveView("units")} type="button">Аскер бөлүктөрдүн рейтинги</button> : null}
        <button className={ratingPeriod === "month" ? "is-active" : ""} onClick={() => { setRatingPeriod("month"); setActiveView("chart"); }} type="button">Айлык рейтинг</button>
        <button className={ratingPeriod === "half-year" ? "is-active" : ""} onClick={() => { setRatingPeriod("half-year"); setActiveView("chart"); }} type="button">Жарым жылдык рейтинг</button>
        <button className={ratingPeriod === "year" ? "is-active" : ""} onClick={() => { setRatingPeriod("year"); setActiveView("chart"); }} type="button">Жылдык рейтинг</button>
      </div>

      {error ? <p className="dashboard-error">{error}</p> : null}
      {loading ? <p className="dashboard-state">Рейтинг жүктөлүүдө...</p> : null}
      {!loading && !error && ratings.length === 0 ? (
        <p className="dashboard-state">Заставалардын рейтинги үчүн маалымат азырынча жок.</p>
      ) : null}
      {!loading && ratings.length > 0 ? (
        <div className="regional-rating__list">
          {ratings.map((item) => {
            const isCurrent = isCurrentOutpost(item);
            return (
            <article
              className={`regional-rating-card regional-rating-card--rank-${Math.min(item.rank, 4)}${isCurrent ? " regional-rating-card--current" : ""}`}
              key={`${item.unitNumber}-${item.outpostName}`}
            >
              <div className="regional-rating-card__rank">{getMedal(item.rank)}</div>
              <div className="regional-rating-card__main">
                <h2>{item.outpostName}</h2>
                {user?.role === "outpost" ? <span>Аскер бөлүгү: {item.unitNumber}</span> : null}
                {isCurrent ? <strong className="regional-rating-card__current-label">Сиздин заставаңыз</strong> : null}
                <div className="regional-rating-card__sections">
                  {item.sections.length ? item.sections.map((section) => (
                    <span key={section.sectionId}>
                      {SECTION_LABELS[section.sectionId] || section.sectionId}: <strong>{section.count}</strong>
                    </span>
                  )) : <span>Документтер жөнөтүлө элек</span>}
                  {user?.role === "outpost" ? <>
                    <span>Дедлайн: <strong>{item.deadlineScore}%</strong></span>
                    <span>Критерийлер үчүн айып: <strong>−{item.criteriaPenalty}%</strong></span>
                  </> : null}
                </div>
              </div>
              <div className="regional-rating-card__score">
                <strong>{user?.role === "outpost" ? `${item.score}%` : item.totalDocuments}</strong>
                <span>{user?.role === "outpost" ? "рейтинг" : "документ"}</span>
              </div>
            </article>
          );})}
        </div>
      ) : null}
    </section>
  );
}
