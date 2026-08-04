const registerDebugEnabled = process.env.DEBUG_REGISTER === "true";

const maskEmail = (email = "") => {
  if (!email || !email.includes("@")) return email;
  const [name, domain] = email.split("@");
  if (!name) return `***@${domain}`;
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
};

const logRegisterDebug = (label, payload) => {
  if (!registerDebugEnabled) return;
  console.log(`[REGISTER DEBUG] ${label}:`, payload);
};

module.exports = { maskEmail, logRegisterDebug };
