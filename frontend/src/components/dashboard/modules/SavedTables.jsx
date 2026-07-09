import React, { useEffect, useState } from "react";

import Library, { SAVED_TABLES_STORAGE_KEY } from "./Library.jsx";

const getSavedTables = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const savedTables = JSON.parse(window.localStorage.getItem(SAVED_TABLES_STORAGE_KEY) || "[]");
    return Array.isArray(savedTables) ? savedTables : [];
  } catch {
    return [];
  }
};

const formatSavedAt = (savedAt) => {
  if (!savedAt) {
    return "Дата сохранения не указана";
  }

  const date = new Date(savedAt);

  if (Number.isNaN(date.getTime())) {
    return "Дата сохранения не указана";
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function SavedTables() {
  const [savedTables, setSavedTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);

  const refreshSavedTables = () => {
    setSavedTables(getSavedTables());
  };

  useEffect(() => {
    refreshSavedTables();
  }, []);

  if (selectedTable) {
    return (
      <Library
        data={{
          description: "Сохраненная таблица. В этом разделе можно изменить таблицу, отправка недоступна.",
          disableSubmit: true,
          headerStorageKey: selectedTable.headerStorageKey,
          id: selectedTable.id,
          scope: selectedTable.scope,
          table: selectedTable.table,
          tableActionStorageKey: selectedTable.tableActionStorageKey,
          tableStorageKey: selectedTable.tableStorageKey,
          title: "Сохранение",
        }}
        onBack={() => {
          setSelectedTable(null);
          refreshSavedTables();
        }}
      />
    );
  }

  return (
    <section className="module-panel">
      <header>
        <h1>Сохранение</h1>
        <p>Сохраненные таблицы с датой последнего сохранения.</p>
      </header>
      {savedTables.length > 0 ? (
        <div className="saved-table-list">
          {savedTables.map((table) => (
            <button
              className="saved-table-card"
              key={table.id}
              onClick={() => setSelectedTable(table)}
              type="button"
            >
              <strong>{table.title || "Таблица"}</strong>
              <span>Сохранено: {formatSavedAt(table.savedAt)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="dashboard-state">Сохраненных таблиц пока нет.</p>
      )}
    </section>
  );
}
