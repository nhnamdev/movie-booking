const rawApiUrl = (import.meta.env.VITE_API_URL || "").trim();

const normalizeApiUrl = (value) => {
  if (!value) return "http://localhost:7000";

  // Handle values like ':7000' or 'localhost:7000'.
  if (value.startsWith(":")) {
    return `http://localhost${value}`;
  }

  if (value.startsWith("localhost:")) {
    return `http://${value}`;
  }

  if (!/^https?:\/\//i.test(value)) {
    return `http://${value}`;
  }

  return value;
};

export const API_URL = normalizeApiUrl(rawApiUrl).replace(/\/+$/, "");