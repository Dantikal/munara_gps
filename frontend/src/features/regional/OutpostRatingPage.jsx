import React, { useEffect, useState } from "react";

import { getOutpostRatings, getRegionalUnitRatings } from "../../api/dashboard.js";
import { getApiErrorMessage } from "../../api/errors.js";
import { getMedal, SECTION_LABELS } from "../admin/RegionalUnitRatingPage.jsx";

export default function OutpostRatingPage({ user }) {
  const [ratings, setRatings] = useState([]);
  const [unitRatings, setUnitRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("rating");
  const [ratingPeriod, setRatingPeriod] = useState("month");
  const [ratingYear, setRatingYear] = useState(new Date().getFullYear());
  const [ratingMonth, setRatingMonth] = useState(new Date().getMonth() + 1);
  const totalDocuments = ratings.reduce((sum, item) => sum + item.totalDocuments, 0);
  const chartData = ratings.map((item) => ({
    ...item,
    percentage: user?.role === "outpost"
      ? Number(item.score) || 0
      : totalDocuments ? (item.totalDocuments / totalDocuments) * 100 : 0,
  }));
  const highestPercentage = Math.max(0, ...chartData.map((item) => item.percentage));
  const chartMaximum = Math.min(100, Math.max(10, Math.ceil(highestPercentage / 10) * 10));
  const chartTicks = Array.from(
    { length: chartMaximum / 10 + 1 },
    (_, index) => chartMaximum - index * 10
  );
  const normalizeOutpostName = (value) => String(value || "")
    .replace(/\s+чек ара заставасы$/u, "")
    .trim()
    .toLocaleLowerCase("ky-KG");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const ratingsRequest = user?.role === "outpost"
      ? getRegionalUnitRatings({ period: ratingPeriod, year: ratingYear, month: ratingMonth }).then((items) => items.outposts || [])
      : getOutpostRatings({ period: ratingPeriod, year: ratingYear, month: ratingMonth });
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
  }, [ratingMonth, ratingPeriod, ratingYear, user?.role]);

  useEffect(() => {
    if (user?.role !== "regional") return undefined;
    let mounted = true;
    getRegionalUnitRatings({ period: ratingPeriod, year: ratingYear, month: ratingMonth })
      .then((items) => { if (mounted) setUnitRatings(items.units || []); })
      .catch((requestError) => {
        if (mounted) setError(getApiErrorMessage(requestError, "Аскер бөлүктөрүнүн рейтингин жүктөө мүмкүн болгон жок."));
      });
    return () => { mounted = false; };
  }, [ratingMonth, ratingPeriod, ratingYear, user?.role]);

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
            <p className="eyebrow">{user?.role === "outpost" ? "Бардык заставалар" : `Аскер бөлүгү ${user?.region}`}</p>
            <h1>{ratingPeriod === "month" ? "Айлык рейтинг" : "Жылдык рейтинг"}</h1>
            <p>Ар бир тилке заставанын ушул мезгилдеги документтеринин үлүшүн көрсөтөт.</p>
          </div>
        </header>
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
                  {chartData.map((item) => (
                    <div className="regional-rating-vertical-chart__column" key={`${item.unitNumber}-${item.outpostName}`}>
                      <div className="regional-rating-vertical-chart__bar-area">
                        <span
                          className="regional-rating-vertical-chart__bar"
                          style={{ height: `${(item.percentage / chartMaximum) * 300}px` }}
                          title={`${item.outpostName}: ${user?.role === "outpost" ? `${item.score}%` : `${item.totalDocuments} документ`}`}
                        />
                      </div>
                      <strong>{item.outpostName}{user?.role === "outpost" ? ` · ${item.unitNumber}` : ""}</strong>
                    </div>
                  ))}
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
          <p className="eyebrow">{user?.role === "outpost" ? "Жалпы система" : `Аскер бөлүгү ${user?.region}`}</p>
          <h1>Заставалардын рейтинги</h1>
          <p>{user?.role === "outpost" ? "Системадагы бардык заставалар. Сиздин заставаңыз өзгөчө түс менен белгиленген." : "Сиздин аскер бөлүгүңүзгө караган заставалар жөнөткөн документтердин саны."}</p>
        </div>
        <button disabled={loading || ratings.length === 0} onClick={() => setActiveView("chart")} type="button">
          График
        </button>
      </header>

      <div className="regional-rating-controls">
        {user?.role === "regional" ? <button onClick={() => setActiveView("units")} type="button">Аскер бөлүктөрдүн рейтинги</button> : null}
        <button className={ratingPeriod === "month" ? "is-active" : ""} onClick={() => { setRatingPeriod("month"); setActiveView("chart"); }} type="button">Айлык рейтинг</button>
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
            const isCurrent = user?.role === "outpost" &&
              String(item.unitNumber) === String(user?.region) &&
              normalizeOutpostName(item.outpostName) === normalizeOutpostName(user?.outpost_name);
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
