import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api } from "../api";
import Alert from "../components/Alert";

export default function Profile() {
  const { firebaseUser, sessionUser, role, logout } = useAuth();
  const navigate = useNavigate();
  const [bookingsCount, setBookingsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await api("bookings/mine");
        if (res.success && Array.isArray(res.bookings)) {
          setBookingsCount(res.bookings.length);
        }
      } catch {
        // non-blocking
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const displayName = sessionUser?.full_name || firebaseUser?.displayName || firebaseUser?.email?.split("@")[0] || "Passenger";
  const email = firebaseUser?.email || sessionUser?.email || "N/A";
  const contact = sessionUser?.contact_number || "Not provided";
  const address = sessionUser?.address || "Not provided";
  const userInitials = displayName.slice(0, 2).toUpperCase();

  return (
    <main className="futuristic-bg min-vh-100 py-4 py-md-5">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="mb-4">
          <div className="badge-future badge-future-blue mb-2">PASSENGER PROFILE</div>
          <h1 className="fw-extrabold text-white mb-1">Transit OS Identity</h1>
          <p className="text-white-50 small mb-0">Manage your verified commuter credentials and booking activity.</p>
        </div>

        <Alert message={message} onClose={() => setMessage("")} />

        {/* Profile Card */}
        <div className="future-card future-card-glass p-4 mb-4">
          <div className="d-flex flex-column flex-sm-row align-items-center gap-4 pb-4 border-bottom border-white-10">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-lg"
              style={{
                width: 76,
                height: 76,
                fontSize: "1.8rem",
                background: "linear-gradient(135deg, #2563eb, #06b6d4)",
                boxShadow: "0 0 20px rgba(6, 182, 212, 0.4)",
              }}
            >
              {userInitials}
            </div>

            <div className="text-center text-sm-start flex-grow-1">
              <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-sm-start gap-2 mb-1">
                <h3 className="fw-bold text-white mb-0">{displayName}</h3>
                <span className="badge-future badge-future-emerald">
                  <span className="status-beacon status-beacon-emerald" />
                  {role ? role.toUpperCase() : "PASSENGER"}
                </span>
              </div>
              <p className="text-cyan small font-monospace mb-2">{email}</p>
              <div className="small text-white-50">
                <i className="bi bi-shield-check text-emerald me-1" />
                Firebase OAuth 2.0 Authenticated
              </div>
            </div>
          </div>

          <div className="row g-3 py-4 border-bottom border-white-10">
            <div className="col-sm-6">
              <div className="small text-white-50 mb-1">Contact Number</div>
              <div className="fw-semibold text-white">{contact}</div>
            </div>
            <div className="col-sm-6">
              <div className="small text-white-50 mb-1">Home / Billing Address</div>
              <div className="fw-semibold text-white">{address}</div>
            </div>
            <div className="col-sm-6">
              <div className="small text-white-50 mb-1">Account Role (RBAC)</div>
              <div className="fw-semibold text-cyan">{role || "user"}</div>
            </div>
            <div className="col-sm-6">
              <div className="small text-white-50 mb-1">Total Reservations</div>
              <div className="fw-semibold text-emerald">{loading ? "..." : `${bookingsCount} Trip(s)`}</div>
            </div>
          </div>

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 pt-4">
            <div className="d-flex gap-2">
              <Link to="/bookings" className="btn-future btn-future-primary py-2 px-3">
                <i className="bi bi-ticket-perforated" />
                <span>My Bookings</span>
              </Link>
              <Link to="/booking" className="btn-future btn-future-outline py-2 px-3">
                <i className="bi bi-plus-circle" />
                <span>Book New Trip</span>
              </Link>
            </div>

            <button
              type="button"
              className="btn btn-outline-danger d-inline-flex align-items-center gap-1 rounded-pill px-3 py-2"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
