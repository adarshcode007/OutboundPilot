/**
 * Centralized API Client with automatic credentials and silent JWT token refresh.
 */

export const API_URL = typeof window !== 'undefined' && window.location.port === "5173" ? "" : "http://localhost:8000";

let onUnauthorizedCallback = null;

export const setOnUnauthorized = (cb) => {
  onUnauthorizedCallback = cb;
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

  // If 401 Unauthorized, attempt a silent token refresh
  if (res.status === 401 && !url.includes("/api/auth/")) {
    try {
      const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (refreshRes.ok) {
        // Retry original request once with fresh access token cookie
        res = await fetch(finalUrl, opts);
      } else {
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
      }
    } catch (e) {
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
  }

  return res;
};

