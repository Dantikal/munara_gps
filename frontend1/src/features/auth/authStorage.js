const AUTH_STORAGE_KEYS = [
  "access",
  "refresh",
  "access_token",
  "refresh_token",
  "user",
];

export const authStorage = window.sessionStorage;

// Older versions stored the active account for the whole localhost origin.
// Move that session into the current tab once, then stop sharing it with other tabs.
AUTH_STORAGE_KEYS.forEach((key) => {
  const legacyValue = window.localStorage.getItem(key);

  if (authStorage.getItem(key) === null && legacyValue !== null) {
    authStorage.setItem(key, legacyValue);
  }

  window.localStorage.removeItem(key);
});

export const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => authStorage.removeItem(key));
};
