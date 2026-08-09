const registerDebugEnabled = process.env.DEBUG_REGISTER === "true";

// Che một phần email trước khi ghi log đăng ký.
const maskEmail = (email = "") => {
  if (!email || !email.includes("@")) return email;
  const [name, domain] = email.split("@");
  if (!name) return `***@${domain}`;
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
};

// Chỉ ghi log đăng ký khi DEBUG_REGISTER được bật.
const logRegisterDebug = (label, payload) => {
  if (!registerDebugEnabled) return;
  console.log(`[REGISTER DEBUG] ${label}:`, payload);
};

module.exports = { maskEmail, logRegisterDebug };
