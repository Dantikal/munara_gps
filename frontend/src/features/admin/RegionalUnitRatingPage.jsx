import React, { useEffect, useState } from "react";

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

export default function RegionalUnitRatingPage() {
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
    getRegionalUnitRatings()
      .then((items) => {
        if (mounted) setRatings(items);
      })
      .catch((requestError) => {
        if (mounted) {
          setError(getApiErrorMessage(requestError, "Рейтингди жүктөө мүмкүн болгон жок."));
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
            <p className="eyebrow">Аскер бөлүктөрүнүн активдүүлүгү</p>
            <h1>График</h1>
            <p>Аскер бөлүгү жана ага караган заставалар жөнөткөн документтердин жалпы үлүшү.</p>
          </div>
        </header>

        <div className="regional-rating-vertical-chart">
          <div className="regional-rating-vertical-chart__scroll">
            <div
              className="regional-rating-vertical-chart__canvas"
              style={{ minWidth: `${Math.max(620, chartData.length * 112)}px` }}
            >
              <div className="regional-rating-vertical-chart__axis">
                {chartTicks.map((tick) => (
                  <span
                    key={tick}
                    style={{ top: `${((chartMaximum - tick) / chartMaximum) * 300}px` }}
                  >
                    {tick}%
                  </span>
                ))}
              </div>
              <div className="regional-rating-vertical-chart__plot">
                <div className="regional-rating-vertical-chart__grid">
                  {chartTicks.map((tick) => (
                    <span
                      key={tick}
                      style={{ top: `${((chartMaximum - tick) / chartMaximum) * 300}px` }}
                    />
                  ))}
                </div>
                <div className="regional-rating-vertical-chart__columns">
                  {chartData.map((item) => (
                    <div className="regional-rating-vertical-chart__column" key={item.unitNumber}>
                      <div className="regional-rating-vertical-chart__bar-area">
                        <span
                          className="regional-rating-vertical-chart__bar"
                          style={{ height: `${(item.percentage / chartMaximum) * 300}px` }}
                          title={`Аскер бөлүгү ${item.unitNumber}: ${item.totalDocuments} документ`}
                        />
                      </div>
                      <strong>Аскер бөлүгү<br />{item.unitNumber}</strong>
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
          <p className="eyebrow">Аскер бөлүктөрүнүн активдүүлүгү</p>
          <h1>Рейтинг</h1>
          <p>Аскер бөлүгү жана ага караган бардык заставалар жөнөткөн документтердин жалпы саны.</p>
        </div>
        <button disabled={loading || ratings.length === 0} onClick={() => setActiveView("chart")} type="button">
          График
        </button>
      </header>

      {error ? <p className="dashboard-error">{error}</p> : null}
      {loading ? <p className="dashboard-state">Рейтинг жүктөлүүдө...</p> : null}
      {!loading && !error && ratings.length === 0 ? (
        <p className="dashboard-state">Рейтинг үчүн маалымат азырынча жок.</p>
      ) : null}
      {!loading && ratings.length > 0 ? (
        <div className="regional-rating__list">
          {ratings.map((item) => (
            <article
              className={`regional-rating-card regional-rating-card--rank-${Math.min(item.rank, 4)}`}
              key={item.unitNumber}
            >
              <div className="regional-rating-card__rank">{getMedal(item.rank)}</div>
              <div className="regional-rating-card__main">
                <h2>Аскер бөлүгү {item.unitNumber}</h2>
                <div className="regional-rating-card__sources">
                  <span>Аскер бөлүгү: <strong>{item.regionalDocuments}</strong></span>
                  <span>Заставалар: <strong>{item.outpostDocuments}</strong></span>
                </div>
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
