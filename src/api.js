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

  const res = await fetch(`/api/${path}`, {
    credentials: "include",
    ...options,
    headers
  });

  let data = { success: false, message: "Invalid server response" };
  try { data = await res.json(); } catch {}
  if (!res.ok && !data.message) data.message = `Request failed (${res.status})`;
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
