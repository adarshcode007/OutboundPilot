/**
 * Centralized API Client with automatic credentials and mutex-locked silent JWT token refresh.
 */

export const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ? import.meta.env.VITE_API_URL : "";

let onUnauthorizedCallback = null;
let isRefreshing = false;
let refreshPromise = null;

export const setOnUnauthorized = (cb) => {
  onUnauthorizedCallback = cb;
};

/**
 * Shared in-flight promise mutex to prevent concurrent refresh token rotation races.
 * If multiple API calls return 401 simultaneously (e.g. on initial page load),
 * only ONE call triggers /api/auth/refresh. The other requests latch onto the same
 * promise, waiting for the single rotation to complete before retrying.
 */
const silentRefreshToken = async () => {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const apiFetch = async (url, options = {}) => {
  const finalUrl = url.startsWith("http") ? url : `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;

  const opts = {
    ...options,
    credentials: "include", // Automatically passes httpOnly access_token & refresh_token cookies
    headers: {
      ...(options.body && typeof options.body === "string" && !options.headers?.["Content-Type"]
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.headers || {}),
    },
  };

  let res = await fetch(finalUrl, opts);

  // If 401 Unauthorized, queue behind or trigger the single in-flight silent token refresh
  if (res.status === 401 && !url.includes("/api/auth/")) {
    const success = await silentRefreshToken();
    if (success) {
      // Retry original request with freshly issued access token cookie
      res = await fetch(finalUrl, opts);
    } else {
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
  }

  return res;
};
