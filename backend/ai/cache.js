// Cache in-memory đơn giản với TTL - dùng cho recommendations để giảm chi phí OpenAI
const store = new Map();

const set = (key, value, ttlMs = 60 * 60 * 1000) => {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

const get = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

const clear = (key) => {
  if (key) store.delete(key);
  else store.clear();
};

module.exports = { set, get, clear };
