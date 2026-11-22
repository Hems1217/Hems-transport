import { auth } from "./firebase";

export async function api(path, options = {}) {
  const isForm = options.body instanceof FormData;
  const headers = isForm
    ? { ...(options.headers || {}) }
    : { "Content-Type": "application/json", ...(options.headers || {}) };

  // Firebase is the authentication authority. Attach the current Firebase ID
  // token to API requests so Express can establish/restore the MySQL session.
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (!headers.Authorization) headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn("Unable to attach Firebase token:", error);
  }

  const baseUrl = import.meta.env.VITE_API_URL ? String(import.meta.env.VITE_API_URL).replace(/\/$/, "") : "";
  const res = await fetch(`${baseUrl}/api/${path}`, {
    credentials: "include",
    ...options,
    headers
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = {
      success: false,
      message: res.status === 502 || res.status === 503 || res.status === 504
        ? "Render backend is waking up from sleep. Please wait 15-30 seconds and refresh."
        : res.status === 404
        ? `API endpoint '/api/${path}' not found (404).`
        : !res.ok
        ? `Server returned HTTP ${res.status}.`
        : "Invalid server response"
    };
  }
  if (!res.ok && data && !data.message) {
    data.message = `Request failed (${res.status})`;
  }
  return data;
}

export const money = n => `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
export async function currentUser() {
  const r = await api("me");
  return r.success ? r.user : null;
}
export function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
}
