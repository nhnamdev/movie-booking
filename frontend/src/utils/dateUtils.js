const padDatePart = (value) => String(value).padStart(2, "0");

export const toDateKey = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      return `${match[1]}-${padDatePart(match[2])}-${padDatePart(match[3])}`;
    }
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
};

export const dateKeyToDate = (value) => {
  const dateKey = toDateKey(value);
  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) return new Date(value);

  return new Date(year, month - 1, day);
};

export const formatDateKey = (value, locale, options) =>
  dateKeyToDate(value).toLocaleDateString(locale, options);
