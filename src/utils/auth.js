const AUTH_TOKEN_KEY = "token";
const AUTH_FLAG_KEY = "isAuthenticated";
const AUTH_EXPIRY_KEY = "sessionExpiresAt";
const SESSION_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

export const setAuthSessionExpiry = () => {
  sessionStorage.setItem(AUTH_EXPIRY_KEY, String(Date.now() + SESSION_DURATION_MS));
};

export const getAuthSessionExpiry = () => {
  return Number(sessionStorage.getItem(AUTH_EXPIRY_KEY)) || 0;
};

export const isSessionExpired = () => {
  const expiry = getAuthSessionExpiry();
  return !expiry || Date.now() >= expiry;
};

export const clearAuthSession = () => {
  sessionStorage.removeItem(AUTH_FLAG_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem("userName");
  sessionStorage.removeItem("userEmail");
  sessionStorage.removeItem("authProvider");
  sessionStorage.removeItem("role");
  sessionStorage.removeItem("activeSessionId");
  sessionStorage.removeItem(AUTH_EXPIRY_KEY);
};

export const isAuthSessionValid = () => {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);

  if (!token) {
    return false;
  }

  if (isSessionExpired()) {
    clearAuthSession();
    return false;
  }

  return true;
};

export const isAuthFlagSet = () => sessionStorage.getItem(AUTH_FLAG_KEY) === "true";
