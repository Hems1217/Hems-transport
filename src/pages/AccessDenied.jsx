import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function AccessDenied() {
  const { firebaseUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleSwitchAccount() {
    await logout();
    navigate("/login", { state: { from: "/admin" } });
  }

  return (
    <main className="futuristic-bg min-vh-100 d-flex align-items-center justify-content-center py-5 px-3">
      <div className="future-card future-card-glass text-center p-4 p-md-5" style={{ maxWidth: 540 }}>
        <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
          style={{
            width: 80,
            height: 80,
            background: "rgba(245, 158, 11, 0.15)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            boxShadow: "0 0 24px rgba(245, 158, 11, 0.3)"
          }}
        >
          <span className="fw-extrabold text-amber fs-2 font-monospace">403</span>
        </div>

        <div className="badge-future badge-future-amber mb-2">RESTRICTED DISPATCH ZONE // RBAC ENFORCED</div>
        <h1 className="fw-extrabold text-white mb-2">Access Restricted</h1>
        <p className="text-white-50 small mb-4">
          This dispatch console is reserved for verified administrators. Your current credentials ({firebaseUser?.email || "Guest"}) lack administrative authorization.
        </p>

        <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
          <Link to="/" className="btn-future btn-future-primary py-2 px-4">
            <i className="bi bi-house-door" />
            <span>Return to Passenger Terminal</span>
          </Link>
          <button
            type="button"
            className="btn-future btn-future-outline py-2 px-4"
            onClick={handleSwitchAccount}
          >
            <i className="bi bi-shield-lock" />
            <span>Switch to Admin Account</span>
          </button>
        </div>
      </div>
    </main>
  );
}
