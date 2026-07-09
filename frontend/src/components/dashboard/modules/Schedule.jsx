import React from "react";

export default function Schedule({ data }) {
  return (
    <section className="module-panel">
      <header>
        <h1>{data?.title || "Пландоо"}</h1>
        <p>План смен, нарядов и дежурств.</p>
      </header>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Время</th>
              <th>Наряд</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items || []).map((item) => (
              <tr key={`${item.date}-${item.name}`}>
                <td>{item.date}</td>
                <td>{item.time}</td>
                <td>{item.name}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
