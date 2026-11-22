import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="futuristic-bg min-vh-100 d-flex align-items-center justify-content-center py-5 px-3">
      <div className="future-card future-card-glass text-center p-4 p-md-5" style={{ maxWidth: 540 }}>
        <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
          style={{
            width: 80,
            height: 80,
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            boxShadow: "0 0 24px rgba(239, 68, 68, 0.3)"
          }}
        >
          <span className="fw-extrabold text-danger fs-2 font-monospace">404</span>
        </div>

        <div className="badge-future badge-future-rose mb-2">TRANSIT ERROR // PATH_NOT_FOUND</div>
        <h1 className="fw-extrabold text-white mb-2">Terminal Waypoint Unreachable</h1>
        <p className="text-white-50 small mb-4">
          The requested coordinate or URL path is not registered in the Hems Transit OS dispatch routing network.
        </p>

        <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
          <Link to="/" className="btn-future btn-future-primary py-2 px-4">
            <i className="bi bi-house-door" />
            <span>Return to Main Terminal</span>
          </Link>
          <Link to="/booking" className="btn-future btn-future-outline py-2 px-4">
            <i className="bi bi-calendar2-range" />
            <span>Explore Schedules</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
