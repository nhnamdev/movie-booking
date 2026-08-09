const apiUrl = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export const resolveMediaUrl = (value) => {
  const url = String(value || "");
  return url.startsWith("/media/") ? `${apiUrl}${url}` : url;
};
