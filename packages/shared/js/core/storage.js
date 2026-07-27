/* Safe JSON/localStorage primitives for repository adapters. */
window.TalentaStorage = Object.freeze({
  clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  },
  read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? this.clone(fallback) : JSON.parse(raw);
    } catch (_) {
      return this.clone(fallback);
    }
  },
  write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  },
  remove(key) {
    localStorage.removeItem(key);
  },
});
