import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../api";
import RequireAuth from "../components/RequireAuth";
import Alert from "../components/Alert";

function Inner() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [copiedRef, setCopiedRef] = useState(null);

  useEffect(() => {
    let alive = true;
    api("bookings/mine")
      .then((r) => {
        if (!alive) return;
        setLoading(false);
        if (r.success && Array.isArray(r.bookings)) {
          setRows(r.bookings);
        } else {
          setRows([]);
          if (r.message && !r.message.includes("401") && !r.message.includes("log in")) {
            setMsg(r.message);
          }
        }
      })
      .catch(() => {
        if (!alive) return;
        setLoading(false);
        setRows([]);
      });

    return () => {
      alive = false;
    };
  }, []);

  function handleCopy(ref) {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  }

  const filteredBookings = useMemo(() => {
    if (!rows) return [];
    return rows.filter((b) => {
      const matchStatus =
        statusFilter === "ALL" ||
        String(b.booking_status || "").toUpperCase() === statusFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        b.booking_reference?.toLowerCase().includes(q) ||
        b.origin?.toLowerCase().includes(q) ||
        b.destination?.toLowerCase().includes(q) ||
        b.passenger_name?.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [rows, statusFilter, search]);

  if (loading) {
    return (
      <main className="futuristic-bg min-vh-100 d-flex align-items-center justify-content-center py-5">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: "3rem", height: "3rem" }} />
          <div className="text-muted small">Loading transit manifest...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="futuristic-bg min-vh-100 py-4 py-md-5">
      <div className="container">
        {/* Header */}
        <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
          <div>
            <div className="badge-future badge-future-blue mb-2">PASSENGER PORTAL</div>
            <h1 className="fw-extrabold text-white mb-1">My Transit Bookings</h1>
            <p className="text-muted mb-0">View your active trips, digital boarding passes, and verified receipts.</p>
          </div>
          <Link to="/booking" className="btn-future btn-future-primary py-2 px-3">
            <i className="bi bi-plus-lg" />
            <span>Book New Trip</span>
          </Link>
        </div>

        {/* Filter and Search Bar */}
        <div className="future-card future-card-glass p-3 mb-4">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-6">
              <div className="btn-group w-100" role="group">
                {["ALL", "CONFIRMED", "COMPLETED", "CANCELLED"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`btn btn-sm ${
                      statusFilter === st
                        ? "btn-primary"
                        : "btn-outline-secondary text-white-50"
                    }`}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st === "ALL" ? `All (${rows.length})` : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="position-relative">
                <input
                  type="text"
                  placeholder="Search reference, destination, or passenger..."
                  className="form-control form-control-sm future-input ps-4"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <i className="bi bi-search position-absolute text-muted" style={{ left: 10, top: 7, fontSize: "0.8rem" }} />
              </div>
            </div>
          </div>
        </div>

        <Alert message={msg} onClose={() => setMsg("")} />

        {/* Bookings List */}
        {!filteredBookings.length ? (
          <div className="future-card p-5 text-center">
            <div
              className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: 64, height: 64, background: "rgba(59, 130, 246, 0.1)" }}
            >
              <i className="bi bi-ticket-perforated fs-1 text-cyan" />
            </div>
            <h4 className="fw-bold text-white mb-2">No Bookings Found</h4>
            <p className="text-muted small mb-4" style={{ maxWidth: 420, margin: "0 auto" }}>
              {search || statusFilter !== "ALL"
                ? "No trips matched your search or status filter. Try clearing the filters."
                : "You don't have any bus bookings recorded yet. Browse schedules and reserve your seat today."}
            </p>
            <Link to="/booking" className="btn-future btn-future-primary py-2 px-4">
              <i className="bi bi-calendar2-plus me-1" /> Find Trips
            </Link>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {filteredBookings.map((b) => {
              const isConfirmed = b.booking_status === "CONFIRMED";
              const isCompleted = b.booking_status === "COMPLETED";
              const isCancelled = b.booking_status === "CANCELLED";

              return (
                <div key={b.id} className="boarding-pass-card future-card-interactive">
                  {/* Ticket Header */}
                  <div className="ticket-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge-future badge-future-cyan">HEMS TRANSIT PASS</span>
                      <span className="text-muted small">|</span>
                      <span className="small text-muted font-monospace">{b.bus_number}</span>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <span
                        className={`badge-future ${
                          isCompleted
                            ? "badge-future-blue"
                            : isConfirmed
                            ? "badge-future-emerald"
                            : "badge-future-rose"
                        }`}
                      >
                        <span className="status-beacon" />
                        {b.booking_status}
                      </span>
                      <span className="badge-future badge-future-amber">
                        PAYMENT: {b.payment_status}
                      </span>
                    </div>
                  </div>

                  {/* Ticket Body */}
                  <div className="p-3 p-md-4">
                    <div className="row align-items-center g-3">
                      {/* Left: Reference and Route */}
                      <div className="col-lg-8">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className="small text-muted text-uppercase" style={{ fontSize: "0.75rem" }}>
                            Reference:
                          </span>
                          <span className="font-monospace fw-bold text-cyan">{b.booking_reference}</span>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-muted p-0 ms-1 text-decoration-none"
                            onClick={() => handleCopy(b.booking_reference)}
                            title="Copy booking reference"
                          >
                            <i className={`bi ${copiedRef === b.booking_reference ? "bi-check-lg text-emerald" : "bi-clipboard"}`} />
                            {copiedRef === b.booking_reference && (
                              <span className="text-emerald small ms-1" style={{ fontSize: "0.7rem" }}>Copied!</span>
                            )}
                          </button>
                        </div>

                        {/* Transit Timeline */}
                        <div className="transit-timeline my-3">
                          <div className="transit-point">
                            <div className="fw-bold text-white fs-5">{b.departure_time}</div>
                            <div className="small text-muted">{b.origin}</div>
                          </div>
                          <div className="transit-track">
                            <span className="transit-track-icon">
                              <i className="bi bi-water me-1" />
                              Via {b.via_port}
                            </span>
                          </div>
                          <div className="transit-point-end">
                            <div className="fw-bold text-white fs-5">{b.arrival_time}</div>
                            <div className="small text-muted">{b.destination}</div>
                          </div>
                        </div>

                        <div className="d-flex flex-wrap gap-3 small text-muted mt-2 pt-2 border-top border-white-10">
                          <div>
                            <i className="bi bi-calendar3 me-1 text-cyan" />
                            <span>Travel Date: <strong className="text-white">{b.travel_date}</strong></span>
                          </div>
                          <div>
                            <i className="bi bi-person me-1 text-cyan" />
                            <span>Passenger: <strong className="text-white">{b.passenger_name}</strong></span>
                          </div>
                          <div>
                            <i className="bi bi-credit-card me-1 text-cyan" />
                            <span>Payment: <strong className="text-white">{b.payment_method}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Fare & Action Buttons */}
                      <div className="col-lg-4 text-lg-end border-start-lg ps-lg-4">
                        <div className="small text-muted">Total Fare Paid</div>
                        <div className="fs-3 fw-extrabold text-white mb-3">{money(b.total_amount)}</div>

                        <div className="d-flex flex-column flex-sm-row flex-lg-column gap-2 justify-content-lg-end">
                          <Link
                            className="btn-future btn-future-primary py-2 px-3 text-center"
                            to={`/receipt?ref=${encodeURIComponent(b.booking_reference)}`}
                          >
                            <i className="bi bi-file-earmark-text" />
                            <span>View Boarding Pass</span>
                          </Link>
                          <Link
                            className="btn-future btn-future-outline py-2 px-3 text-center"
                            to={`/verify?ref=${encodeURIComponent(b.booking_reference)}`}
                          >
                            <i className="bi bi-shield-check" />
                            <span>Verify Ticket</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default function Bookings() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
