import React, { useEffect, useState } from "react";

import { getOutpostRatings } from "../../api/dashboard.js";
import { getApiErrorMessage } from "../../api/errors.js";
import { getMedal, SECTION_LABELS } from "../admin/RegionalUnitRatingPage.jsx";

export default function OutpostRatingPage({ user }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("rating");
  const totalDocuments = ratings.reduce((sum, item) => sum + item.totalDocuments, 0);
  const chartData = ratings.map((item) => ({
    ...item,
    percentage: totalDocuments ? (item.totalDocuments / totalDocuments) * 100 : 0,
  }));
  const highestPercentage = Math.max(0, ...chartData.map((item) => item.percentage));
  const chartMaximum = Math.min(100, Math.max(10, Math.ceil(highestPercentage / 10) * 10));
  const chartTicks = Array.from(
    { length: chartMaximum / 10 + 1 },
    (_, index) => chartMaximum - index * 10
  );

  useEffect(() => {
    let mounted = true;
    getOutpostRatings()
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
  }, []);

  if (activeView === "chart") {
    return (
      <section className="module-panel regional-rating regional-rating-chart-page">
        <button className="module-back-button" onClick={() => setActiveView("rating")} type="button">
          Артка
        </button>
        <header className="module-header">
          <div>
            <p className="eyebrow">Аскер бөлүгү {user?.region}</p>
            <h1>График</h1>
            <p>Ар бир заставанын жалпы документтердин ичиндеги үлүшү.</p>
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
                    <div className="regional-rating-vertical-chart__column" key={item.outpostName}>
                      <div className="regional-rating-vertical-chart__bar-area">
                        <span
                          className="regional-rating-vertical-chart__bar"
                          style={{ height: `${(item.percentage / chartMaximum) * 300}px` }}
                          title={`${item.outpostName}: ${item.totalDocuments} документ`}
                        />
                      </div>
                      <strong>{item.outpostName}</strong>
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
          <p className="eyebrow">Аскер бөлүгү {user?.region}</p>
          <h1>Заставалардын рейтинги</h1>
          <p>Сиздин аскер бөлүгүңүзгө караган заставалар жөнөткөн документтердин саны.</p>
        </div>
        <button disabled={loading || ratings.length === 0} onClick={() => setActiveView("chart")} type="button">
          График
        </button>
      </header>

      {error ? <p className="dashboard-error">{error}</p> : null}
      {loading ? <p className="dashboard-state">Рейтинг жүктөлүүдө...</p> : null}
      {!loading && !error && ratings.length === 0 ? (
        <p className="dashboard-state">Заставалардын рейтинги үчүн маалымат азырынча жок.</p>
      ) : null}
      {!loading && ratings.length > 0 ? (
        <div className="regional-rating__list">
          {ratings.map((item) => (
            <article
              className={`regional-rating-card regional-rating-card--rank-${Math.min(item.rank, 4)}`}
              key={item.outpostName}
            >
              <div className="regional-rating-card__rank">{getMedal(item.rank)}</div>
              <div className="regional-rating-card__main">
                <h2>{item.outpostName}</h2>
                <div className="regional-rating-card__sections">
                  {item.sections.length ? item.sections.map((section) => (
                    <span key={section.sectionId}>
                      {SECTION_LABELS[section.sectionId] || section.sectionId}: <strong>{section.count}</strong>
                    </span>
                  )) : <span>Документтер жөнөтүлө элек</span>}
                </div>
              </div>
              <div className="regional-rating-card__score">
                <strong>{item.totalDocuments}</strong>
                <span>документ</span>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
