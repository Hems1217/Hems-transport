import React, { useEffect, useState } from "react";

export default function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online) return null;
  return (
    <div className="offline-banner" role="alert">
      <i className="bi bi-wifi-off me-2" />
      <span>Network Offline — Showing cached system data. Please reconnect to confirm live bookings.</span>
    </div>
  );
}
