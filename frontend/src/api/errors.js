const fallbackMessage = "Не удалось выполнить запрос.";

const normalizeApiMessage = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeApiMessage).filter(Boolean).join(" ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([field, message]) => {
        const text = normalizeApiMessage(message);
        return field === "non_field_errors" || field === "detail"
          ? text
          : `${field}: ${text}`;
      })
      .filter(Boolean)
      .join(" ");
  }

  return "";
};

export const getApiErrorMessage = (error, fallback = fallbackMessage) => {
  return normalizeApiMessage(error.response?.data) || error.message || fallback;
};
