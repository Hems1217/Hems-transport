import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import Alert from "../components/Alert";

function getLocalDateString(offsetDays = 0) {
  const d = new Date();
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function Home() {
  const navigate = useNavigate();
  const today = getLocalDateString(0);
  const tomorrow = getLocalDateString(1);

  const [terminals, setTerminals] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [terminalTab, setTerminalTab] = useState("all"); // 'all', 'mindoro', 'manila'
  const [quickVerifyRef, setQuickVerifyRef] = useState("");

  useEffect(() => {
    api("terminals").then((r) => {
      if (r.success) {
        setTerminals(r.terminals || []);
      } else {
        setError(r.message || "Unable to load terminals.");
      }
    });
  }, []);

  const orderedMindoro = [
    "Puerto Galera", "San Teodoro", "Baco", "Calapan City", "Naujan", "Victoria",
    "Socorro", "Pola", "Pinamalayan", "Gloria", "Bansud", "Bongabong", "Roxas",
    "Mansalay", "Bulalacao", "San Jose", "Magsaysay", "Abra de Ilog", "Paluan",
    "Mamburao", "Looc", "Lubang", "Santa Cruz", "Sablayan", "Calintaan", "Rizal"
  ];

  const mindoro = useMemo(
    () =>
      orderedMindoro
        .map((name) =>
          terminals.find((t) => t.terminal_name === `${name} Terminal`)
        )
        .filter(Boolean),
    [terminals]
  );

  const manila = useMemo(
    () => terminals.filter((t) => t.terminal_type === "Manila"),
    [terminals]
  );

  const allTerminals = useMemo(
    () => [...manila, ...mindoro],
    [manila, mindoro]
  );

  const filteredTerminals = useMemo(() => {
    let list = allTerminals;
    if (terminalTab === "mindoro") list = mindoro;
    if (terminalTab === "manila") list = manila;

    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    return list.filter(
      (t) =>
        t.terminal_name.toLowerCase().includes(q) ||
        (t.location && t.location.toLowerCase().includes(q))
    );
  }, [allTerminals, mindoro, manila, terminalTab, searchTerm]);

  // Swap terminals smoothly
  function handleSwap() {
    const prevFrom = from;
    setFrom(to);
    setTo(prevFrom);
  }

  const bookingQuery =
    from && to && from !== to
      ? `/booking?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}`
      : "/booking";

  function handleQuickVerify(e) {
    e.preventDefault();
    if (quickVerifyRef.trim()) {
      navigate(`/verify?ref=${encodeURIComponent(quickVerifyRef.trim())}`);
    }
  }

  return (
    <main className="futuristic-bg min-vh-100">
      {/* ================= HERO SECTION ================= */}
      <section className="position-relative pt-5 pb-5 overflow-hidden border-bottom border-white-10">
        <div className="container position-relative py-lg-4" style={{ zIndex: 2 }}>
          <div className="row align-items-center g-5">
            <div className="col-lg-7">
              {/* Status Badge */}
              <div className="d-inline-flex align-items-center gap-2 mb-3 px-3 py-1 rounded-pill badge-future-blue">
                <span className="status-beacon" />
                <span className="fw-semibold">INTER-ISLAND TRANSIT NETWORK • MINDORO ↔ MANILA</span>
              </div>

              <h1 className="display-4 fw-extrabold text-white mb-3" style={{ letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                Next-Gen Inter-Island Travel Engineered for <span style={{ background: "linear-gradient(135deg, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Speed & Comfort</span>
              </h1>

              <p className="lead text-secondary mb-4" style={{ fontSize: "1.1rem", maxWidth: "600px" }}>
                Experience seamless, synchronized Ro-Ro ferry and express coach transit connecting Mindoro’s 26 municipalities directly with Manila hubs. Fast, reliable, and 100% digital ticketing.
              </p>

              <div className="d-flex flex-wrap gap-3 align-items-center">
                <a href="#trip-finder" className="btn-future btn-future-primary py-3 px-4">
                  <i className="bi bi-calendar2-check" />
                  <span>Find Available Trips</span>
                </a>
                <a href="#routes-section" className="btn-future btn-future-outline py-3 px-4">
                  <i className="bi bi-map" />
                  <span>Explore 26 Terminals</span>
                </a>
              </div>

              {/* Quick Trust Badges */}
              <div className="d-flex flex-wrap gap-4 mt-4 pt-3 border-top border-white-10">
                <div className="d-flex align-items-center gap-2 text-white-50 small">
                  <i className="bi bi-shield-check text-cyan fs-5" />
                  <span>Verified E-Tickets</span>
                </div>
                <div className="d-flex align-items-center gap-2 text-white-50 small">
                  <i className="bi bi-water text-cyan fs-5" />
                  <span>Synchronized Ro-Ro</span>
                </div>
                <div className="d-flex align-items-center gap-2 text-white-50 small">
                  <i className="bi bi-lightning-charge text-cyan fs-5" />
                  <span>Instant GCash / Card</span>
                </div>
              </div>
            </div>

            {/* Hero Bus Visual Showcase */}
            <div className="col-lg-5 text-center">
              <div className="position-relative">
                <div
                  className="future-card-glass p-3 p-md-4 position-relative"
                  style={{
                    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(59, 130, 246, 0.2)",
                  }}
                >
                  <img
                    src="/images/hems-bus-hero.png"
                    alt="Hems Transport Modern Coach"
                    className="img-fluid rounded-3"
                    style={{ maxHeight: 290, objectFit: "contain", filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.5))" }}
                  />

                  {/* Telemetry Chips */}
                  <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-white-10 text-start">
                    <div>
                      <div className="small text-muted text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>Fleet Type</div>
                      <div className="fw-bold text-white small">Executive Express Aircon</div>
                    </div>
                    <div className="text-end">
                      <div className="small text-muted text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>Ferry Transfer</div>
                      <div className="badge-future badge-future-cyan">Batangas & Calapan</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRIP FINDER CONSOLE ================= */}
      <section id="trip-finder" className="container py-4 position-relative" style={{ marginTop: "-30px", zIndex: 10 }}>
        <div className="future-card future-card-glass p-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-compass text-cyan fs-5" />
              <h4 className="fw-bold text-white mb-0">Book Transit Route</h4>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className={`btn btn-sm ${date === today ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setDate(today)}
                style={{ borderRadius: "20px", fontSize: "0.75rem" }}
              >
                Today
              </button>
              <button
                type="button"
                className={`btn btn-sm ${date === tomorrow ? "btn-primary" : "btn-outline-secondary"}`}
                onClick={() => setDate(tomorrow)}
                style={{ borderRadius: "20px", fontSize: "0.75rem" }}
              >
                Tomorrow
              </button>
            </div>
          </div>

          <div className="row g-3 align-items-end">
            {/* Origin Terminal */}
            <div className="col-lg-4 col-md-5">
              <label className="future-label">Traveling From</label>
              <div className="position-relative">
                <select
                  className="form-select future-select"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                >
                  <option value="">Select departure terminal...</option>
                  <optgroup label="Manila Terminals">
                    {manila.map((t) => (
                      <option key={t.id} value={t.terminal_name}>
                        {t.terminal_name} ({t.location})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Mindoro Terminals (26 Municipalities)">
                    {mindoro.map((t) => (
                      <option key={t.id} value={t.terminal_name}>
                        {t.terminal_name} ({t.location})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Swap Button */}
            <div className="col-lg-1 col-md-2 text-center">
              <button
                type="button"
                className="btn btn-outline-light border-white-10 rounded-circle p-2"
                onClick={handleSwap}
                title="Swap departure and destination"
                style={{ width: 44, height: 44, background: "rgba(255, 255, 255, 0.05)" }}
              >
                <i className="bi bi-arrow-left-right text-cyan" />
              </button>
            </div>

            {/* Destination Terminal */}
            <div className="col-lg-4 col-md-5">
              <label className="future-label">Going To</label>
              <select
                className="form-select future-select"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              >
                <option value="">Select destination terminal...</option>
                <optgroup label="Manila Terminals">
                  {manila.map((t) => (
                    <option key={t.id} value={t.terminal_name}>
                      {t.terminal_name} ({t.location})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Mindoro Terminals (26 Municipalities)">
                  {mindoro.map((t) => (
                    <option key={t.id} value={t.terminal_name}>
                      {t.terminal_name} ({t.location})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Date Picker */}
            <div className="col-lg-2 col-md-6">
              <label className="future-label">Travel Date</label>
              <input
                type="date"
                min={today}
                className="form-control future-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Action CTA */}
            <div className="col-lg-1 col-md-6">
              <Link
                className={`btn-future btn-future-primary w-100 py-2 ${
                  !from || !to || from === to ? "disabled opacity-50" : ""
                }`}
                to={bookingQuery}
                style={{ height: "46px" }}
              >
                <i className="bi bi-search" />
              </Link>
            </div>
          </div>

          {/* Dynamic route status preview hint */}
          {from && to && (
            <div className="mt-3 pt-3 border-top border-white-10 d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="small text-muted">
                Selected Route:{" "}
                <span className="text-white fw-bold">{from}</span>
                <i className="bi bi-arrow-right mx-2 text-cyan" />
                <span className="text-white fw-bold">{to}</span>
              </div>
              {from === to ? (
                <span className="badge text-bg-warning">Please select two distinct terminals</span>
              ) : (
                <span className="badge-future badge-future-cyan">
                  <i className="bi bi-check2-circle me-1" />
                  Direct Inter-Island Ro-Ro Route Ready
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ================= METRIC HIGHLIGHTS ================= */}
      <section className="container py-4">
        <div className="row g-3">
          {[
            { label: "Active Hubs", val: "26 Terminals", icon: "bi-geo-alt", desc: "Every Mindoro municipality + Manila" },
            { label: "Ro-Ro Integration", val: "100% Seamless", icon: "bi-water", desc: "Guaranteed bus-ferry connection" },
            { label: "E-Ticketing", val: "Instant QR Pass", icon: "bi-qr-code-scan", desc: "Real-time verified boarding pass" },
            { label: "Service Hours", val: "24/7 Operations", icon: "bi-clock-history", desc: "Reliable daily scheduled trips" },
          ].map((m, idx) => (
            <div className="col-6 col-lg-3" key={idx}>
              <div className="future-card p-3 p-md-4 h-100">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="future-label mb-0">{m.label}</span>
                  <div
                    className="rounded-2 d-flex align-items-center justify-content-center text-cyan"
                    style={{ width: 32, height: 32, background: "rgba(6, 182, 212, 0.1)" }}
                  >
                    <i className={`bi ${m.icon}`} />
                  </div>
                </div>
                <div className="fs-4 fw-extrabold text-white">{m.val}</div>
                <div className="text-muted small mt-1">{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= INTERACTIVE TERMINAL & ROUTE DIRECTORY ================= */}
      <section id="routes-section" className="container py-5">
        <div className="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4">
          <div>
            <div className="badge-future badge-future-blue mb-2">NETWORK COVERAGE</div>
            <h2 className="fw-bold text-white mb-1">Explore Terminals & Routes</h2>
            <p className="text-muted mb-0">Browse through Hems Transport hubs across Oriental Mindoro, Occidental Mindoro, and Metro Manila.</p>
          </div>

          {/* Filter tabs & search input */}
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <div className="btn-group" role="group">
              <button
                type="button"
                className={`btn btn-sm ${terminalTab === "all" ? "btn-primary" : "btn-outline-secondary text-white-50"}`}
                onClick={() => setTerminalTab("all")}
              >
                All ({allTerminals.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${terminalTab === "mindoro" ? "btn-primary" : "btn-outline-secondary text-white-50"}`}
                onClick={() => setTerminalTab("mindoro")}
              >
                Mindoro ({mindoro.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${terminalTab === "manila" ? "btn-primary" : "btn-outline-secondary text-white-50"}`}
                onClick={() => setTerminalTab("manila")}
              >
                Manila ({manila.length})
              </button>
            </div>

            <div className="position-relative" style={{ minWidth: 200 }}>
              <input
                type="text"
                placeholder="Search terminal..."
                className="form-control form-control-sm future-input ps-4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <i className="bi bi-search position-absolute text-muted" style={{ left: 10, top: 7, fontSize: "0.8rem" }} />
            </div>
          </div>
        </div>

        {error && <Alert message={error} />}

        {/* Terminals Grid */}
        <div className="row g-3">
          {filteredTerminals.map((t) => (
            <div className="col-12 col-md-6 col-lg-4" key={t.id}>
              <div className="future-card future-card-interactive p-3 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="badge-future badge-future-blue">{t.terminal_type} Hub</span>
                    <span className="status-beacon" />
                  </div>
                  <h5 className="fw-bold text-white mb-1">{t.terminal_name}</h5>
                  <div className="small text-muted d-flex align-items-center gap-1 mb-2">
                    <i className="bi bi-geo-alt-fill text-cyan" />
                    <span>{t.location || t.address || "Terminal Location"}</span>
                  </div>
                </div>

                <div className="d-flex gap-2 mt-3 pt-2 border-top border-white-10">
                  <button
                    className="btn btn-sm btn-future-outline flex-grow-1"
                    onClick={() => {
                      setFrom(t.terminal_name);
                      window.scrollTo({ top: document.getElementById("trip-finder")?.offsetTop - 80, behavior: "smooth" });
                    }}
                  >
                    Depart From Here
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary text-cyan"
                    onClick={() => {
                      setTo(t.terminal_name);
                      window.scrollTo({ top: document.getElementById("trip-finder")?.offsetTop - 80, behavior: "smooth" });
                    }}
                    title="Set as destination"
                  >
                    <i className="bi bi-arrow-right" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= QUICK VERIFY BOOKING BAR ================= */}
      <section className="container py-4">
        <div className="future-card future-card-glass p-4">
          <div className="row align-items-center g-3">
            <div className="col-lg-6">
              <div className="d-flex align-items-center gap-2 mb-1">
                <i className="bi bi-shield-check text-cyan fs-4" />
                <h4 className="fw-bold text-white mb-0">Quick Ticket Verification</h4>
              </div>
              <p className="text-muted small mb-0">
                Traveling or conducting boarding inspections? Enter your booking reference code to confirm validity.
              </p>
            </div>
            <div className="col-lg-6">
              <form onSubmit={handleQuickVerify} className="d-flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. HMS-20261021-ABC123"
                  className="form-control future-input"
                  value={quickVerifyRef}
                  onChange={(e) => setQuickVerifyRef(e.target.value)}
                  required
                />
                <button type="submit" className="btn-future btn-future-cyan text-nowrap px-4">
                  <i className="bi bi-check2-circle" />
                  <span>Verify</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="mt-5 py-4 border-top border-white-10" style={{ background: "rgba(9, 13, 22, 0.95)" }}>
        <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <div
              className="rounded-2 d-flex align-items-center justify-content-center text-white"
              style={{ width: 28, height: 28, background: "linear-gradient(135deg, #2563eb, #06b6d4)" }}
            >
              <i className="bi bi-bus-front small" />
            </div>
            <span className="fw-bold text-white">HEMS TRANSPORT SERVICES</span>
            <span className="text-muted small">© 2026</span>
          </div>

          <div className="d-flex align-items-center gap-3 small text-muted">
            <span>Mindoro Hubs (26)</span>
            <span>•</span>
            <span>Manila Hubs</span>
            <span>•</span>
            <div className="d-inline-flex align-items-center gap-1">
              <span className="status-beacon" />
              <span className="text-white-50">System Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
