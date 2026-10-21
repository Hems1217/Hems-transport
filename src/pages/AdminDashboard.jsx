import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, money } from "../api";
import { useAuth } from "../AuthContext";
import Alert from "../components/Alert";

function StatusBadge({ value }) {
  const v = String(value || "").toUpperCase();
  let cls = "badge-future-blue";
  if (v === "CONFIRMED") cls = "badge-future-emerald";
  else if (v === "COMPLETED") cls = "badge-future-blue";
  else if (v === "CANCELLED" || v === "FAILED") cls = "badge-future-rose";
  else if (v === "PENDING") cls = "badge-future-amber";
  else if (v === "PAID") cls = "badge-future-emerald";

  return (
    <span className={`badge-future ${cls}`}>
      <span className="status-beacon" />
      {v}
    </span>
  );
}

export default function AdminDashboard() {
  const { firebaseUser, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("bookings"); // 'bookings', 'payments', 'schedules', 'users'
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewEvidence, setViewEvidence] = useState(null); // URL for modal

  async function loadAllData() {
    setLoading(true);
    setMessage("");
    try {
      const [dashRes, bookRes, payRes, schedRes, userRes] = await Promise.all([
        api("admin/dashboard").catch(() => ({ success: false })),
        api("admin/bookings").catch(() => ({ success: false })),
        api("admin/payments").catch(() => ({ success: false })),
        api("admin/schedules").catch(() => ({ success: false })),
        api("admin/users").catch(() => ({ success: false })),
      ]);

      if (dashRes.success) setStats(dashRes.stats);
      if (bookRes.success) setBookings(bookRes.bookings || []);
      if (payRes.success) setPayments(payRes.payments || []);
      if (schedRes.success) setSchedules(schedRes.schedules || []);
      if (userRes.success) setUsers(userRes.users || []);
    } catch (error) {
      setMessage(error.message || "Unable to refresh admin datasets.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, []);

  async function updateBookingStatus(id, status) {
    setBusy(`booking-${id}`);
    setMessage("");
    try {
      const result = await api(`admin/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!result.success) throw new Error(result.message || "Failed to update booking status.");
      await loadAllData();
    } catch (error) {
      setMessage(error.message || "Unable to update booking status.");
    } finally {
      setBusy(null);
    }
  }

  async function updatePaymentStatus(id, status) {
    setBusy(`payment-${id}`);
    setMessage("");
    try {
      const result = await api(`admin/payments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      if (!result.success) throw new Error(result.message || "Failed to update payment status.");
      await loadAllData();
    } catch (error) {
      setMessage(error.message || "Unable to update payment status.");
    } finally {
      setBusy(null);
    }
  }

  async function doLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  // Calculate live revenue from confirmed/completed bookings
  const totalRevenue = useMemo(() => {
    return bookings
      .filter((b) => b.booking_status !== "CANCELLED")
      .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
  }, [bookings]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchStatus =
        statusFilter === "ALL" ||
        String(b.booking_status || "").toUpperCase() === statusFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        b.booking_reference?.toLowerCase().includes(q) ||
        b.passenger_name?.toLowerCase().includes(q) ||
        b.origin?.toLowerCase().includes(q) ||
        b.destination?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [bookings, statusFilter, search]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = search.toLowerCase();
      return (
        !q ||
        p.booking_reference?.toLowerCase().includes(q) ||
        p.passenger_name?.toLowerCase().includes(q) ||
        p.payment_method?.toLowerCase().includes(q) ||
        p.transaction_reference?.toLowerCase().includes(q)
      );
    });
  }, [payments, search]);

  return (
    <main className="futuristic-bg min-vh-100 pb-5">
      {/* Top Futuristic Command Header */}
      <nav className="navbar future-navbar sticky-top">
        <div className="container py-1">
          <Link className="navbar-brand text-decoration-none" to="/admin">
            <div className="d-flex align-items-center">
              <div
                className="d-flex align-items-center justify-content-center me-2 rounded-3 text-white"
                style={{
                  width: 36,
                  height: 36,
                  background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                  boxShadow: "0 0 12px rgba(245, 158, 11, 0.4)",
                }}
              >
                <i className="bi bi-speedometer2 fs-5" />
              </div>
              <div>
                <span className="fw-bold fs-5 text-white tracking-tight">HEMS</span>
                <span className="brand-badge ms-2" style={{ background: "rgba(245, 158, 11, 0.15)", borderColor: "rgba(245, 158, 11, 0.3)", color: "#fbbf24" }}>
                  ADMIN CONTROL
                </span>
              </div>
            </div>
          </Link>

          <div className="d-flex align-items-center gap-2">
            <div
              className="d-none d-md-flex align-items-center gap-2 px-3 py-1 rounded-pill"
              style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid var(--border-subtle)" }}
            >
              <span className="status-beacon" />
              <span className="small text-white-50">{firebaseUser?.email}</span>
            </div>

            <button
              className="btn btn-sm btn-outline-danger d-inline-flex align-items-center gap-1 rounded-pill px-3"
              onClick={doLogout}
            >
              <i className="bi bi-box-arrow-right" />
              <span className="d-none d-sm-inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <section className="container py-4">
        {/* Title Bar */}
        <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
          <div>
            <div className="badge-future badge-future-amber mb-2">OPERATIONS DISPATCH CENTER</div>
            <h1 className="fw-extrabold text-white mb-1">Transit Network Management</h1>
            <p className="text-muted small mb-0">Oversee real-time passenger manifests, payment audits, fleet, and schedules.</p>
          </div>

          <button
            className="btn-future btn-future-primary py-2 px-3"
            onClick={loadAllData}
            disabled={loading}
          >
            <i className={`bi bi-arrow-clockwise ${loading ? "spin" : ""}`} />
            <span>Sync Data</span>
          </button>
        </div>

        <Alert message={message} onClose={() => setMessage("")} />

        {/* Executive Metrics Overview */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-3">
            <div className="future-card p-3 p-md-4 h-100">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="future-label mb-0">Total Bookings</span>
                <i className="bi bi-ticket-perforated text-cyan fs-5" />
              </div>
              <div className="fs-3 fw-extrabold text-white">{bookings.length}</div>
              <div className="small text-muted">All-time reservations</div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="future-card p-3 p-md-4 h-100">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="future-label mb-0">Pending Audits</span>
                <span className="status-beacon status-beacon-amber" />
              </div>
              <div className="fs-3 fw-extrabold text-amber">
                {payments.filter((p) => p.payment_status === "PENDING").length}
              </div>
              <div className="small text-muted">Awaiting receipt approval</div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="future-card p-3 p-md-4 h-100">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="future-label mb-0">Active Fleet</span>
                <i className="bi bi-bus-front text-cyan fs-5" />
              </div>
              <div className="fs-3 fw-extrabold text-white">{stats?.buses || schedules.length || 0}</div>
              <div className="small text-muted">Operating coaches</div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="future-card p-3 p-md-4 h-100">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="future-label mb-0">Total Revenue</span>
                <i className="bi bi-cash-stack text-emerald fs-5" />
              </div>
              <div className="fs-3 fw-extrabold text-emerald">{money(totalRevenue)}</div>
              <div className="small text-muted">Confirmed passenger fares</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div className="future-card future-card-glass p-2 mb-4">
          <div className="d-flex flex-wrap gap-2">
            {[
              { id: "bookings", label: `Bookings (${bookings.length})`, icon: "bi-ticket-detailed" },
              { id: "payments", label: `Payment Audits (${payments.length})`, icon: "bi-credit-card-2-front" },
              { id: "schedules", label: `Schedules & Fleet (${schedules.length})`, icon: "bi-calendar3" },
              { id: "users", label: `Registered Passengers (${users.length})`, icon: "bi-people" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`btn btn-sm ${
                  activeTab === tab.id
                    ? "btn-future btn-future-primary"
                    : "btn-future btn-future-outline text-white-50"
                } py-2 px-3`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`bi ${tab.icon} me-1`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Bookings Management */}
        {activeTab === "bookings" && (
          <div className="future-card p-3 p-md-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
              <div className="d-flex flex-wrap gap-2">
                {["ALL", "CONFIRMED", "COMPLETED", "CANCELLED"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`btn btn-sm ${statusFilter === st ? "btn-primary" : "btn-outline-secondary text-white-50"}`}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="position-relative" style={{ minWidth: 260 }}>
                <input
                  type="text"
                  placeholder="Filter reference or passenger..."
                  className="form-control form-control-sm future-input ps-4"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <i className="bi bi-search position-absolute text-muted" style={{ left: 10, top: 7, fontSize: "0.8rem" }} />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" />
              </div>
            ) : !filteredBookings.length ? (
              <div className="text-center py-5 text-muted">No bookings match the current filter.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0" style={{ background: "transparent" }}>
                  <thead>
                    <tr className="border-bottom border-white-10 text-muted small text-uppercase" style={{ fontSize: "0.75rem" }}>
                      <th>Reference</th>
                      <th>Passenger Manifest</th>
                      <th>Transit Route & Ro-Ro</th>
                      <th>Schedule</th>
                      <th>Fare</th>
                      <th>Status</th>
                      <th>Manage Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="border-bottom border-white-10">
                        <td>
                          <div className="font-monospace fw-bold text-cyan">{b.booking_reference}</div>
                          <div className="small text-muted" style={{ fontSize: "0.75rem" }}>
                            Coach: {b.bus_number}
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold text-white">{b.passenger_name}</div>
                          <div className="small text-muted">{b.contact_number}</div>
                        </td>
                        <td>
                          <div className="text-white small">
                            {b.origin} <i className="bi bi-arrow-right text-cyan mx-1" /> {b.destination}
                          </div>
                          <div className="small text-cyan" style={{ fontSize: "0.75rem" }}>
                            Via {b.via_port}
                          </div>
                        </td>
                        <td>
                          <div className="text-white small">{b.travel_date}</div>
                          <div className="small text-muted">{b.departure_time}</div>
                        </td>
                        <td>
                          <div className="fw-bold text-white">{money(b.total_amount)}</div>
                          <div className="small text-muted" style={{ fontSize: "0.75rem" }}>{b.payment_method}</div>
                        </td>
                        <td>
                          <StatusBadge value={b.booking_status} />
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm future-select py-1"
                            style={{ minWidth: 130, fontSize: "0.82rem" }}
                            value={b.booking_status}
                            disabled={busy === `booking-${b.id}`}
                            onChange={(e) => updateBookingStatus(b.id, e.target.value)}
                          >
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Payment Audits & Receipt Verification */}
        {activeTab === "payments" && (
          <div className="future-card p-3 p-md-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="fw-bold text-white mb-0">Payment Proof Audit Queue</h5>
                <p className="text-muted small mb-0">Inspect customer receipt screenshots and update status to PAID or FAILED.</p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" />
              </div>
            ) : !filteredPayments.length ? (
              <div className="text-center py-5 text-muted">No payments found.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0" style={{ background: "transparent" }}>
                  <thead>
                    <tr className="border-bottom border-white-10 text-muted small text-uppercase" style={{ fontSize: "0.75rem" }}>
                      <th>Reference</th>
                      <th>Passenger</th>
                      <th>Method & Trace</th>
                      <th>Amount</th>
                      <th>Receipt Evidence</th>
                      <th>Status</th>
                      <th>Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="border-bottom border-white-10">
                        <td className="font-monospace text-cyan fw-semibold">{p.booking_reference}</td>
                        <td>
                          <div className="fw-semibold text-white">{p.passenger_name}</div>
                          <div className="small text-muted">{p.email || ""}</div>
                        </td>
                        <td>
                          <div className="text-white small fw-bold">{p.payment_method}</div>
                          <div className="small text-muted font-monospace" style={{ fontSize: "0.75rem" }}>
                            {p.transaction_reference || "N/A"}
                          </div>
                        </td>
                        <td className="fw-bold text-white">{money(p.amount)}</td>
                        <td>
                          {p.receipt_evidence ? (
                            <button
                              type="button"
                              className="btn-future btn-future-outline btn-sm py-1 px-2"
                              onClick={() => setViewEvidence(p.receipt_evidence)}
                            >
                              <i className="bi bi-image me-1 text-cyan" />
                              <span>View Proof</span>
                            </button>
                          ) : (
                            <span className="text-muted small">None attached</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge value={p.payment_status} />
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-success py-1 px-2"
                              disabled={busy === `payment-${p.id}` || p.payment_status === "PAID"}
                              onClick={() => updatePaymentStatus(p.id, "PAID")}
                              title="Mark as PAID"
                            >
                              <i className="bi bi-check-lg" /> Approve
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger py-1 px-2"
                              disabled={busy === `payment-${p.id}` || p.payment_status === "FAILED"}
                              onClick={() => updatePaymentStatus(p.id, "FAILED")}
                              title="Mark as FAILED"
                            >
                              <i className="bi bi-x-lg" /> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Schedules & Fleet */}
        {activeTab === "schedules" && (
          <div className="future-card p-3 p-md-4">
            <h5 className="fw-bold text-white mb-3">Active Bus Schedules & Capacity</h5>
            {!schedules.length ? (
              <div className="text-center py-5 text-muted">No schedules found.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0" style={{ background: "transparent" }}>
                  <thead>
                    <tr className="border-bottom border-white-10 text-muted small text-uppercase" style={{ fontSize: "0.75rem" }}>
                      <th>Coach</th>
                      <th>Assigned Driver</th>
                      <th>Route & Port</th>
                      <th>Travel Date</th>
                      <th>Departure → Arrival</th>
                      <th>Available Seats</th>
                      <th>Standard Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s) => (
                      <tr key={s.id} className="border-bottom border-white-10">
                        <td>
                          <div className="fw-bold text-white">{s.bus_number}</div>
                          <div className="small text-muted">{s.bus_type} ({s.plate_number})</div>
                        </td>
                        <td className="text-white small">{s.driver_name}</td>
                        <td>
                          <div className="text-white small">{s.origin} → {s.destination}</div>
                          <div className="small text-cyan">Via {s.via_port}</div>
                        </td>
                        <td className="text-white small">{s.travel_date}</td>
                        <td>
                          <div className="text-white small">{s.departure_time} → {s.arrival_time}</div>
                        </td>
                        <td>
                          <span className="badge-future badge-future-emerald">
                            {s.available_seats} Seats Left
                          </span>
                        </td>
                        <td className="fw-bold text-white">{money(s.fare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Registered Users */}
        {activeTab === "users" && (
          <div className="future-card p-3 p-md-4">
            <h5 className="fw-bold text-white mb-3">Registered Passenger Accounts</h5>
            {!users.length ? (
              <div className="text-center py-5 text-muted">No registered users found.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0" style={{ background: "transparent" }}>
                  <thead>
                    <tr className="border-bottom border-white-10 text-muted small text-uppercase" style={{ fontSize: "0.75rem" }}>
                      <th>ID</th>
                      <th>Passenger Name</th>
                      <th>Email</th>
                      <th>Contact</th>
                      <th>Address</th>
                      <th>Age</th>
                      <th>Registered On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-bottom border-white-10">
                        <td className="font-monospace text-muted small">#{u.id}</td>
                        <td className="fw-bold text-white">{u.full_name}</td>
                        <td className="text-cyan small">{u.email}</td>
                        <td className="text-white small">{u.phone || "—"}</td>
                        <td className="text-white small">{u.address || "—"}</td>
                        <td className="text-white small">{u.age || "—"}</td>
                        <td className="text-muted small">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modal / Lightbox for Receipt Evidence Preview */}
      {viewEvidence && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(8px)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="future-card border-primary p-4 w-100">
              <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-white-10">
                <h5 className="fw-bold text-white mb-0">Payment Proof Inspection</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setViewEvidence(null)}
                />
              </div>

              <div className="text-center p-2 mb-3 rounded-2" style={{ background: "rgba(0, 0, 0, 0.5)", maxHeight: "70vh", overflow: "auto" }}>
                <img
                  src={viewEvidence}
                  alt="Uploaded receipt screenshot"
                  className="img-fluid rounded-2"
                  style={{ maxHeight: "65vh", objectFit: "contain" }}
                />
              </div>

              <div className="d-flex justify-content-between align-items-center">
                <a
                  href={viewEvidence}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-future btn-future-outline btn-sm"
                >
                  <i className="bi bi-box-arrow-up-right me-1" /> Open Full Image
                </a>
                <button
                  type="button"
                  className="btn-future btn-future-primary btn-sm px-4"
                  onClick={() => setViewEvidence(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
