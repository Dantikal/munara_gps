import React from "react";

export default function Journal({ data }) {
  return (
    <section className="module-panel">
      <header>
        <h1>{data?.title || "Уюштуруу"}</h1>
        <p>Оперативные записи и события службы.</p>
      </header>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Событие</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {(data?.entries || []).map((entry) => (
              <tr key={`${entry.date}-${entry.event}`}>
                <td>{entry.date}</td>
                <td>{entry.event}</td>
                <td>{entry.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
