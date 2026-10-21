import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const { firebaseUser, sessionUser, isAdmin, logout } = useAuth();

  async function doLogout() {
    await logout();
    nav("/login");
  }

  const loggedIn = !!firebaseUser;
  const displayName = sessionUser?.full_name || firebaseUser?.displayName || firebaseUser?.email?.split("@")[0] || "Passenger";
  const userInitials = displayName.slice(0, 2).toUpperCase();

  const closeMenu = () => setOpen(false);

  return (
    <nav className="navbar navbar-expand-lg future-navbar sticky-top">
      <div className="container py-1">
        {/* Brand */}
        <Link className="navbar-brand text-decoration-none" to="/" onClick={closeMenu}>
          <div className="d-flex align-items-center">
            <div
              className="d-flex align-items-center justify-content-center me-2 rounded-3 text-white"
              style={{
                width: 36,
                height: 36,
                background: "linear-gradient(135deg, #2563eb, #06b6d4)",
                boxShadow: "0 0 12px rgba(6, 182, 212, 0.4)",
              }}
            >
              <i className="bi bi-bus-front fs-5" />
            </div>
            <div>
              <span className="fw-bold fs-5 text-white tracking-tight">HEMS</span>
              <span className="brand-badge ms-2">TRANSIT OS</span>
            </div>
          </div>
        </Link>

        {/* Mobile Toggler */}
        <button
          className="navbar-toggler border-0 p-2 text-white"
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
          style={{ background: "rgba(255, 255, 255, 0.08)", borderRadius: 8 }}
        >
          <i className={`bi ${open ? "bi-x-lg" : "bi-list"} fs-4 text-white`} />
        </button>

        {/* Navigation Links */}
        <div className={`collapse navbar-collapse ${open ? "show mt-3 mt-lg-0" : ""}`}>
          <ul className="navbar-nav ms-auto align-items-lg-center gap-1 gap-lg-2">
            <li className="nav-item">
              <NavLink className="future-nav-link" to="/" onClick={closeMenu} end>
                <i className="bi bi-house-door" />
                <span>Home</span>
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink className="future-nav-link" to="/booking" onClick={closeMenu}>
                <i className="bi bi-calendar2-range" />
                <span>Schedules & Book</span>
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink className="future-nav-link" to="/verify" onClick={closeMenu}>
                <i className="bi bi-shield-check" />
                <span>Verify Ticket</span>
              </NavLink>
            </li>

            {loggedIn && (
              <li className="nav-item">
                <NavLink className="future-nav-link" to="/bookings" onClick={closeMenu}>
                  <i className="bi bi-ticket-perforated" />
                  <span>My Bookings</span>
                </NavLink>
              </li>
            )}

            {/* User status & Auth CTA */}
            {loggedIn ? (
              <li className="nav-item ms-lg-3 mt-2 mt-lg-0 pt-2 pt-lg-0 border-top border-lg-0 border-white-10">
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill"
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                    }}
                  >
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                      style={{
                        width: 28,
                        height: 28,
                        fontSize: "0.75rem",
                        background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                      }}
                    >
                      {userInitials}
                    </div>
                    <span className="small text-white fw-medium text-truncate" style={{ maxWidth: 140 }}>
                      {displayName}
                    </span>
                  </div>

                  <button
                    className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1 rounded-pill px-3"
                    onClick={() => {
                      closeMenu();
                      doLogout();
                    }}
                    title="Sign Out"
                  >
                    <i className="bi bi-box-arrow-right" />
                    <span className="d-none d-sm-inline">Logout</span>
                  </button>
                </div>
              </li>
            ) : (
              <li className="nav-item ms-lg-3 mt-2 mt-lg-0">
                <Link
                  className="btn-future btn-future-primary py-2 px-3 text-nowrap"
                  to="/login"
                  onClick={closeMenu}
                >
                  <i className="bi bi-person-fill" />
                  <span>Sign In</span>
                </Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
