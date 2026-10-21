import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, money } from "../api";
import { useAuth } from "../AuthContext";
import RequireAuth from "../components/RequireAuth";
import Alert from "../components/Alert";

function getLocalDateString(offsetDays = 0) {
  const d = new Date();
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function BookingInner() {
  const loc = useLocation();
  const nav = useNavigate();
  const params = new URLSearchParams(loc.search);
  const { sessionUser, firebaseUser } = useAuth();

  const today = getLocalDateString(0);
  const tomorrow = getLocalDateString(1);

  const [terminals, setTerminals] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const [from, setFrom] = useState(params.get("from") || "");
  const [to, setTo] = useState(params.get("to") || "");
  const [date, setDate] = useState(params.get("date") || today);
  const [selected, setSelected] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(14);
  const [step, setStep] = useState(1);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [pass, setPass] = useState({
    passenger_name: "",
    contact_number: "",
    passenger_address: "",
    passenger_age: "",
    discount_type: "None",
  });

  // Pre-fill passenger info from account
  useEffect(() => {
    if (sessionUser || firebaseUser) {
      setPass((prev) => ({
        ...prev,
        passenger_name: prev.passenger_name || sessionUser?.full_name || firebaseUser?.displayName || "",
        contact_number: prev.contact_number || sessionUser?.phone || "",
        passenger_address: prev.passenger_address || sessionUser?.address || "",
        passenger_age: prev.passenger_age || (sessionUser?.age ? String(sessionUser.age) : "24"),
      }));
    }
  }, [sessionUser, firebaseUser]);

  const [payment, setPayment] = useState("GCash");

  const [pay, setPay] = useState({
    gcash_name: "",
    gcash_number: "",
    gcash_reference: "",
    cardholder_name: "",
    card_number: "",
    card_expiry: "",
    card_cvv: "",
    receipt_evidence: null,
  });

  const allTerminals = useMemo(() => terminals, [terminals]);

  const chosenRoute = useMemo(
    () => routes.find((r) => r.origin === from && r.destination === to),
    [routes, from, to]
  );

  useEffect(() => {
    Promise.all([api("terminals"), api("routes")])
      .then(([t, r]) => {
        if (t.success) setTerminals(t.terminals || []);
        else setMsg(t.message || "Unable to load terminals.");

        if (r.success) setRoutes(r.routes || []);
        else setMsg(r.message || "Unable to load routes.");
      })
      .catch(() => setMsg("Unable to connect to the Hems Transport server."));
  }, []);

  useEffect(() => {
    if (chosenRoute) {
      loadSchedules(chosenRoute.id);
    } else {
      setSchedules([]);
    }
  }, [chosenRoute?.id, date]);

  async function loadSchedules(routeId = chosenRoute?.id) {
    setMsg("");
    if (!routeId) {
      setSchedules([]);
      return;
    }
    setLoadingSchedules(true);
    try {
      const q = new URLSearchParams({ date, route_id: routeId });
      const r = await api(`schedules?${q}`);
      if (r.success) {
        setSchedules(r.schedules || []);
      } else {
        setMsg(r.message || "Unable to load schedules.");
      }
    } catch {
      setMsg("Unable to load schedules.");
    } finally {
      setLoadingSchedules(false);
    }
  }

  function handleSwap() {
    const prevFrom = from;
    setFrom(to);
    setTo(prevFrom);
    setSelected(null);
    setSchedules([]);
  }

  function changeFrom(v) {
    setFrom(v);
    setSelected(null);
    setSchedules([]);
    setStep(1);
  }

  function changeTo(v) {
    setTo(v);
    setSelected(null);
    setSchedules([]);
    setStep(1);
  }

  const isDiscounted = ["Student", "PWD", "Senior Citizen"].includes(pass.discount_type);
  const discountRate = isDiscounted ? 0.2 : 0;
  const regularFare = Number(selected?.fare || 0);
  const discountAmount = Math.round(regularFare * discountRate * 100) / 100;
  const total = Math.max(0, regularFare - discountAmount);

  function setP(key, value) {
    setPay((p) => ({ ...p, [key]: value }));
  }

  function handleReceiptFile(file) {
    if (!file) {
      setPay((p) => ({ ...p, receipt_evidence: null }));
      setPreviewUrl(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMsg("Receipt file must be 5 MB or smaller.");
      return;
    }
    setP("receipt_evidence", file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function validPayment() {
    if (!pay.receipt_evidence) {
      return "Please upload your payment receipt / proof screenshot.";
    }

    if (
      payment === "GCash" &&
      ![pay.gcash_name, pay.gcash_number, pay.gcash_reference].every((v) => String(v || "").trim())
    ) {
      return "Please complete the GCash account name, GCash number, and reference number.";
    }

    if (
      payment === "Credit Card" &&
      ![pay.cardholder_name, pay.card_number, pay.card_expiry, pay.card_cvv].every((v) => String(v || "").trim())
    ) {
      return "Please complete all credit card fields.";
    }

    if (
      payment === "Credit Card" &&
      !/^\d{13,19}$/.test(pay.card_number.replace(/\s+/g, ""))
    ) {
      return "Enter a valid card number (13–19 digits).";
    }

    if (
      payment === "Credit Card" &&
      !/^\d{3,4}$/.test(pay.card_cvv)
    ) {
      return "Enter a valid 3 or 4 digit CVV.";
    }

    if (
      payment === "GCash" &&
      !/^09\d{9}$/.test(pay.gcash_number.replace(/\s+/g, ""))
    ) {
      return "Enter a valid 11-digit GCash mobile number (e.g. 09171234567).";
    }

    return "";
  }

  async function complete() {
    if (!selected) return;
    const error = validPayment();
    if (error) {
      setMsg(error);
      return;
    }

    setLoading(true);
    setMsg("");

    const fd = new FormData();
    Object.entries({
      ...pass,
      schedule_id: selected.id,
      payment_method: payment,
      ...pay,
    }).forEach(([k, v]) => {
      if (k !== "receipt_evidence" && v !== null && v !== undefined) {
        fd.append(k, v);
      }
    });

    fd.append("receipt_evidence", pay.receipt_evidence);

    const r = await api("bookings", {
      method: "POST",
      body: fd,
    });

    setLoading(false);

    if (r.success) {
      localStorage.setItem("hems_last_booking", r.booking_reference);
      nav(`/receipt?ref=${encodeURIComponent(r.booking_reference)}`);
    } else {
      setMsg(r.message || "Unable to complete booking.");
    }
  }

  return (
    <main className="futuristic-bg min-vh-100 py-4 py-md-5">
      <div className="container">
        {/* Header Title */}
        <div className="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
          <div>
            <div className="badge-future badge-future-blue mb-2">TRANSIT TERMINAL BOOKING</div>
            <h1 className="fw-extrabold text-white mb-1">Book Your Transit Trip</h1>
            <p className="text-muted mb-0">Select your departure hub, arrival terminal, bus schedule, and confirmed seat.</p>
          </div>
          {chosenRoute && (
            <div className="badge-future badge-future-cyan">
              <i className="bi bi-water me-1" />
              Connected Via {chosenRoute.via_port}
            </div>
          )}
        </div>

        {/* Stepper Node Progress */}
        <div className="stepper-container mb-4">
          <div className={`stepper-node ${step === 1 ? "active" : step > 1 ? "completed" : ""}`}>
            <span className="stepper-circle">{step > 1 ? <i className="bi bi-check-lg" /> : "1"}</span>
            <span>Trip & Bus</span>
          </div>
          <div className={`stepper-line ${step > 1 ? "active" : ""}`} />
          <div className={`stepper-node ${step === 2 ? "active" : step > 2 ? "completed" : ""}`}>
            <span className="stepper-circle">{step > 2 ? <i className="bi bi-check-lg" /> : "2"}</span>
            <span>Passenger Manifest</span>
          </div>
          <div className={`stepper-line ${step > 2 ? "active" : ""}`} />
          <div className={`stepper-node ${step === 3 ? "active" : ""}`}>
            <span className="stepper-circle">3</span>
            <span>Payment & Pass</span>
          </div>
        </div>

        {/* Console Box for Terminals */}
        <div className="future-card future-card-glass p-3 p-md-4 mb-4">
          <div className="row g-3 align-items-end">
            <div className="col-lg-4 col-md-5">
              <label className="future-label">Traveling From</label>
              <select
                className="form-select future-select"
                value={from}
                onChange={(e) => changeFrom(e.target.value)}
              >
                <option value="">Select departure terminal...</option>
                {allTerminals.map((t) => (
                  <option key={t.id} value={t.terminal_name}>
                    {t.terminal_name} ({t.terminal_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-lg-1 col-md-2 text-center">
              <button
                type="button"
                className="btn btn-outline-light border-white-10 rounded-circle p-2"
                onClick={handleSwap}
                title="Swap terminals"
                style={{ width: 44, height: 44, background: "rgba(255, 255, 255, 0.05)" }}
              >
                <i className="bi bi-arrow-left-right text-cyan" />
              </button>
            </div>

            <div className="col-lg-4 col-md-5">
              <label className="future-label">Going To</label>
              <select
                className="form-select future-select"
                value={to}
                onChange={(e) => changeTo(e.target.value)}
              >
                <option value="">Select destination terminal...</option>
                {allTerminals.map((t) => (
                  <option key={t.id} value={t.terminal_name}>
                    {t.terminal_name} ({t.terminal_type})
                  </option>
                ))}
              </select>
            </div>

            <div className="col-lg-3 col-md-12">
              <label className="future-label">Travel Date</label>
              <div className="d-flex gap-2">
                <input
                  type="date"
                  min={today}
                  className="form-control future-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <button
                  type="button"
                  className={`btn btn-sm ${date === today ? "btn-primary" : "btn-outline-secondary"}`}
                  onClick={() => setDate(today)}
                >
                  Today
                </button>
              </div>
            </div>
          </div>
        </div>

        <Alert message={msg} onClose={() => setMsg("")} />

        {/* ================= STEP 1: AVAILABLE TRIPS ================= */}
        {step === 1 && (
          <section className="future-card p-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h3 className="fw-bold text-white mb-1">Available Scheduled Trips</h3>
                <p className="text-muted small mb-0">
                  {from && to ? (
                    <span>
                      Route: <strong className="text-white">{from}</strong> → <strong className="text-white">{to}</strong>
                    </span>
                  ) : (
                    "Please select both starting and destination terminals above."
                  )}
                </p>
              </div>
              {chosenRoute && (
                <span className="badge-future badge-future-blue">
                  <i className="bi bi-clock me-1" />
                  Direct Service
                </span>
              )}
            </div>

            <hr className="border-white-10 my-3" />

            {!from || !to ? (
              <div className="p-4 text-center text-muted">
                <i className="bi bi-geo-alt display-6 text-cyan d-block mb-2" />
                Select both your origin and destination terminals above to view scheduled departures.
              </div>
            ) : from === to ? (
              <div className="alert alert-warning mb-0">
                Departure and destination terminals must be different.
              </div>
            ) : !chosenRoute ? (
              <div className="alert alert-warning mb-0">
                No direct Hems transit route is configured between {from} and {to}. Please choose another terminal pair.
              </div>
            ) : loadingSchedules ? (
              <div className="p-5 text-center text-muted">
                <div className="spinner-border text-primary mb-3" style={{ width: "2.5rem", height: "2.5rem" }} />
                <div className="text-white small fw-semibold">Searching scheduled departures for {date}...</div>
              </div>
            ) : schedules.length ? (
              <div className="d-flex flex-column gap-3">
                {schedules.map((s) => (
                  <div
                    key={s.id}
                    className={`future-card future-card-interactive p-3 p-md-4 ${
                      selected?.id === s.id ? "border-primary" : ""
                    }`}
                    style={{
                      background: selected?.id === s.id ? "rgba(59, 130, 246, 0.08)" : undefined,
                    }}
                  >
                    <div className="row align-items-center g-3">
                      {/* Bus Icon & Badge */}
                      <div className="col-12 col-md-3">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className="badge-future badge-future-cyan">{s.bus_type}</span>
                          <span className="small text-muted font-monospace">{s.bus_number}</span>
                        </div>
                        <div className="small text-muted">
                          Plate: <strong className="text-white">{s.plate_number}</strong>
                        </div>
                        <div className="small text-muted">
                          Driver: <strong className="text-white">{s.driver_name}</strong>
                        </div>
                      </div>

                      {/* Route Timeline */}
                      <div className="col-12 col-md-5">
                        <div className="transit-timeline my-2">
                          <div className="transit-point">
                            <div className="fw-bold text-white fs-5">{s.departure_time}</div>
                            <div className="small text-muted text-truncate" style={{ maxWidth: 130 }}>{s.origin}</div>
                          </div>
                          <div className="transit-track">
                            <span className="transit-track-icon">
                              <i className="bi bi-water me-1" />
                              {s.via_port}
                            </span>
                          </div>
                          <div className="transit-point-end">
                            <div className="fw-bold text-white fs-5">{s.arrival_time}</div>
                            <div className="small text-muted text-truncate" style={{ maxWidth: 130 }}>{s.destination}</div>
                          </div>
                        </div>
                      </div>

                      {/* Seats & Price */}
                      <div className="col-6 col-md-2 text-md-center">
                        <div className="d-inline-flex align-items-center gap-1 badge-future badge-future-emerald mb-1">
                          <span className="status-beacon" />
                          <span>{s.available_seats} Seats Open</span>
                        </div>
                        <div className="fs-4 fw-extrabold text-white">{money(s.fare)}</div>
                        <div className="small text-muted">Regular Fare</div>
                      </div>

                      {/* Select Action */}
                      <div className="col-6 col-md-2 text-end">
                        <button
                          className="btn-future btn-future-primary w-100 py-2"
                          onClick={() => {
                            setSelected(s);
                            setStep(2);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Select Trip
                          <i className="bi bi-arrow-right" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted">
                <i className="bi bi-calendar-x display-6 text-muted d-block mb-2" />
                No scheduled buses found for this date. Try selecting another date or route.
              </div>
            )}
          </section>
        )}

        {/* ================= STEP 2: PASSENGER MANIFEST & SEAT ================= */}
        {step === 2 && (
          <section className="future-card p-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h3 className="fw-bold text-white mb-1">Passenger Manifest & Seat Assignment</h3>
                <p className="text-muted small mb-0">Enter passenger details for boarding pass generation.</p>
              </div>
              <span className="badge-future badge-future-cyan">
                Trip: {selected?.bus_number} • {selected?.departure_time}
              </span>
            </div>

            {/* Selected Trip Quick Recap */}
            <div className="p-3 rounded-3 mb-4" style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--border-subtle)" }}>
              <div className="row g-2 align-items-center">
                <div className="col-md-4">
                  <div className="small text-muted">Route & Ro-Ro Port</div>
                  <div className="fw-bold text-white">
                    {selected?.origin} → {selected?.destination}
                  </div>
                  <div className="small text-cyan">Via {selected?.via_port}</div>
                </div>
                <div className="col-md-4">
                  <div className="small text-muted">Travel Date & Time</div>
                  <div className="fw-bold text-white">
                    {selected?.travel_date} • {selected?.departure_time}
                  </div>
                  <div className="small text-muted">{selected?.bus_type} ({selected?.plate_number})</div>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="small text-muted">Regular Fare</div>
                  <div className="fs-5 fw-extrabold text-white">{money(selected?.fare)}</div>
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(3);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <div className="row g-4">
                {/* Form Fields */}
                <div className="col-lg-7">
                  <h5 className="fw-bold text-white mb-3">Passenger Information</h5>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="future-label">Full Name *</label>
                      <input
                        className="form-control future-input"
                        required
                        placeholder="Juan Dela Cruz"
                        value={pass.passenger_name}
                        onChange={(e) => setPass({ ...pass, passenger_name: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="future-label">Contact Number *</label>
                      <input
                        className="form-control future-input"
                        required
                        placeholder="09171234567"
                        value={pass.contact_number}
                        onChange={(e) => setPass({ ...pass, contact_number: e.target.value })}
                      />
                    </div>

                    <div className="col-md-8">
                      <label className="future-label">Residential Address *</label>
                      <input
                        className="form-control future-input"
                        required
                        placeholder="Municipality, Province"
                        value={pass.passenger_address}
                        onChange={(e) => setPass({ ...pass, passenger_address: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="future-label">Age *</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        className="form-control future-input"
                        required
                        value={pass.passenger_age}
                        onChange={(e) => setPass({ ...pass, passenger_age: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="future-label">Discount Category</label>
                      <select
                        className="form-select future-select"
                        value={pass.discount_type}
                        onChange={(e) => setPass({ ...pass, discount_type: e.target.value })}
                      >
                        <option value="None">None (Regular Passenger)</option>
                        <option value="Student">Student (20% Off)</option>
                        <option value="PWD">PWD (Person with Disability - 20% Off)</option>
                        <option value="Senior Citizen">Senior Citizen (20% Off)</option>
                      </select>
                      <div className="small text-muted mt-1">
                        Please present valid Student ID, PWD ID, or Senior Citizen ID upon terminal boarding.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seating Layout Preview */}
                <div className="col-lg-5">
                  <h5 className="fw-bold text-white mb-3">Preferred Seat</h5>
                  <div className="bus-layout-preview">
                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-white-10">
                      <div className="small text-muted">
                        <i className="bi bi-steering-wheel me-1" /> Driver Cabin
                      </div>
                      <div className="badge-future badge-future-cyan">Seat #{selectedSeat} Assigned</div>
                    </div>

                    {/* Seat Grid Preview */}
                    <div className="d-flex flex-column gap-2">
                      {[1, 5, 9, 13, 17, 21].map((rowStart) => (
                        <div key={rowStart} className="d-flex justify-content-between align-items-center">
                          {/* Left Pair */}
                          <div className="d-flex gap-2">
                            {[rowStart, rowStart + 1].map((seatNum) => {
                              const isOccupied = seatNum % 7 === 0;
                              const isSel = selectedSeat === seatNum;
                              return (
                                <button
                                  type="button"
                                  key={seatNum}
                                  disabled={isOccupied}
                                  onClick={() => setSelectedSeat(seatNum)}
                                  className={`bus-seat ${isOccupied ? "occupied" : isSel ? "selected" : "available"}`}
                                  title={isOccupied ? `Seat ${seatNum} Occupied` : `Select Seat ${seatNum}`}
                                >
                                  {seatNum}
                                </button>
                              );
                            })}
                          </div>

                          {/* Aisle */}
                          <div className="small text-dim px-2" style={{ fontSize: "0.65rem" }}>
                            AISLE
                          </div>

                          {/* Right Pair */}
                          <div className="d-flex gap-2">
                            {[rowStart + 2, rowStart + 3].map((seatNum) => {
                              const isOccupied = seatNum % 5 === 0;
                              const isSel = selectedSeat === seatNum;
                              return (
                                <button
                                  type="button"
                                  key={seatNum}
                                  disabled={isOccupied}
                                  onClick={() => setSelectedSeat(seatNum)}
                                  className={`bus-seat ${isOccupied ? "occupied" : isSel ? "selected" : "available"}`}
                                  title={isOccupied ? `Seat ${seatNum} Occupied` : `Select Seat ${seatNum}`}
                                >
                                  {seatNum}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="d-flex justify-content-center gap-3 mt-3 pt-2 border-top border-white-10 small text-muted">
                      <span className="d-flex align-items-center gap-1">
                        <span className="bus-seat available" style={{ width: 14, height: 14 }} /> Available
                      </span>
                      <span className="d-flex align-items-center gap-1">
                        <span className="bus-seat selected" style={{ width: 14, height: 14 }} /> Selected
                      </span>
                      <span className="d-flex align-items-center gap-1">
                        <span className="bus-seat occupied" style={{ width: 14, height: 14 }} /> Occupied
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top border-white-10">
                <button
                  type="button"
                  className="btn-future btn-future-outline"
                  onClick={() => setStep(1)}
                >
                  <i className="bi bi-arrow-left" /> Back to Schedules
                </button>
                <button type="submit" className="btn-future btn-future-primary px-4">
                  Proceed to Payment <i className="bi bi-arrow-right" />
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ================= STEP 3: PAYMENT & RECEIPT EVIDENCE ================= */}
        {step === 3 && (
          <section className="future-card p-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h3 className="fw-bold text-white mb-1">Secure Checkout & Payment</h3>
                <p className="text-muted small mb-0">Select your payment method and upload proof of transaction.</p>
              </div>
              <div className="badge-future badge-future-emerald">
                <i className="bi bi-shield-lock me-1" /> End-to-End Encrypted
              </div>
            </div>

            <div className="row g-4">
              {/* Payment Method Selector & Inputs */}
              <div className="col-lg-7">
                {/* Method Pills */}
                <div className="row g-2 mb-3">
                  {[
                    { id: "GCash", label: "GCash", icon: "bi-phone", sub: "Instant e-wallet transfer" },
                    { id: "Credit Card", label: "Credit / Debit Card", icon: "bi-credit-card", sub: "Visa / Mastercard" },
                  ].map((m) => (
                    <div className="col-6" key={m.id}>
                      <button
                        type="button"
                        className={`future-card w-100 p-3 text-start transition ${
                          payment === m.id ? "border-primary" : ""
                        }`}
                        style={{
                          background: payment === m.id ? "rgba(59, 130, 246, 0.14)" : "rgba(255, 255, 255, 0.03)",
                        }}
                        onClick={() => setPayment(m.id)}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fw-bold text-white">{m.label}</span>
                          <i className={`bi ${m.icon} ${payment === m.id ? "text-cyan" : "text-muted"}`} />
                        </div>
                        <div className="small text-muted" style={{ fontSize: "0.75rem" }}>{m.sub}</div>
                      </button>
                    </div>
                  ))}
                </div>

                {/* GCash Details */}
                {payment === "GCash" && (
                  <div className="p-3 rounded-3 mb-3" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
                    <div className="d-flex align-items-center gap-3 mb-3 pb-2 border-bottom border-white-10">
                      <div className="p-2 rounded-2 text-white fw-bold bg-primary" style={{ fontSize: "0.8rem" }}>
                        GCASH
                      </div>
                      <div>
                        <div className="fw-bold text-white small">HEMS TRANSPORT SERVICES CORP</div>
                        <div className="small text-muted">Merchant No: <strong className="text-cyan">0917-888-HEMS (09178884367)</strong></div>
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="future-label">GCash Sender Name *</label>
                        <input
                          className="form-control future-input"
                          placeholder="Sender full name"
                          value={pay.gcash_name}
                          onChange={(e) => setP("gcash_name", e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="future-label">GCash Mobile Number *</label>
                        <input
                          className="form-control future-input"
                          placeholder="09XXXXXXXXX"
                          value={pay.gcash_number}
                          onChange={(e) => setP("gcash_number", e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="future-label">GCash Reference / Trace ID *</label>
                        <input
                          className="form-control future-input"
                          placeholder="e.g. 100234567891"
                          value={pay.gcash_reference}
                          onChange={(e) => setP("gcash_reference", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Credit Card Details with live preview */}
                {payment === "Credit Card" && (
                  <div className="p-3 rounded-3 mb-3" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
                    {/* Live Card Mockup */}
                    <div className="interactive-card-preview mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="chip-icon" />
                        <span className="fw-bold text-white small tracking-wide">HEMS TRANSIT PASS</span>
                      </div>
                      <div className="font-monospace fs-5 text-white mb-3" style={{ letterSpacing: "2px" }}>
                        {pay.card_number ? pay.card_number : "•••• •••• •••• ••••"}
                      </div>
                      <div className="d-flex justify-content-between align-items-end">
                        <div>
                          <div className="small text-white-50" style={{ fontSize: "0.65rem" }}>CARDHOLDER</div>
                          <div className="small fw-bold text-white text-uppercase">{pay.cardholder_name || "YOUR NAME"}</div>
                        </div>
                        <div>
                          <div className="small text-white-50" style={{ fontSize: "0.65rem" }}>EXPIRES</div>
                          <div className="small fw-bold text-white">{pay.card_expiry || "MM/YY"}</div>
                        </div>
                      </div>
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="future-label">Cardholder Name *</label>
                        <input
                          className="form-control future-input"
                          placeholder="Name on card"
                          value={pay.cardholder_name}
                          onChange={(e) => setP("cardholder_name", e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="future-label">Card Number *</label>
                        <input
                          className="form-control future-input"
                          placeholder="16 digits"
                          value={pay.card_number}
                          onChange={(e) => setP("card_number", e.target.value.replace(/[^0-9 ]/g, "").slice(0, 19))}
                        />
                      </div>
                      <div className="col-6">
                        <label className="future-label">Expiry Date *</label>
                        <input
                          className="form-control future-input"
                          placeholder="MM/YY"
                          value={pay.card_expiry}
                          onChange={(e) => setP("card_expiry", e.target.value.slice(0, 5))}
                        />
                      </div>
                      <div className="col-6">
                        <label className="future-label">CVV / CVC *</label>
                        <input
                          type="password"
                          maxLength="4"
                          className="form-control future-input"
                          placeholder="3 or 4 digits"
                          value={pay.card_cvv}
                          onChange={(e) => setP("card_cvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Payment Evidence */}
                <div className="p-3 rounded-3" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px dashed rgba(59, 130, 246, 0.4)" }}>
                  <label className="future-label d-flex justify-content-between">
                    <span>Upload Payment Receipt Screenshot *</span>
                    <span className="text-cyan small">JPG, PNG, or WEBP (Max 5MB)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="form-control future-input mb-2"
                    onChange={(e) => handleReceiptFile(e.target.files?.[0])}
                  />

                  {previewUrl && (
                    <div className="d-flex align-items-center gap-3 p-2 rounded-2 mt-2" style={{ background: "rgba(16, 185, 129, 0.1)" }}>
                      <img
                        src={previewUrl}
                        alt="Receipt preview"
                        style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6 }}
                      />
                      <div className="small">
                        <span className="text-white fw-bold d-block">{pay.receipt_evidence?.name}</span>
                        <span className="text-emerald">Receipt attached and ready for verification</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Fare Summary Card */}
              <div className="col-lg-5">
                <div className="future-card p-3 p-md-4 h-100 d-flex flex-column justify-content-between" style={{ background: "rgba(17, 26, 46, 0.85)" }}>
                  <div>
                    <h5 className="fw-bold text-white mb-3">Booking Summary</h5>
                    <div className="small text-muted mb-2">Transit Manifest</div>

                    <div className="d-flex justify-content-between mb-2 small">
                      <span className="text-muted">Passenger</span>
                      <strong className="text-white">{pass.passenger_name}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2 small">
                      <span className="text-muted">Route</span>
                      <strong className="text-white">{selected?.origin} → {selected?.destination}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2 small">
                      <span className="text-muted">Ro-Ro Ferry Transfer</span>
                      <strong className="text-cyan">Via {selected?.via_port}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2 small">
                      <span className="text-muted">Travel Schedule</span>
                      <strong className="text-white">{selected?.travel_date} ({selected?.departure_time})</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2 small">
                      <span className="text-muted">Bus Coach & Assigned Seat</span>
                      <strong className="text-white">{selected?.bus_number} • Seat #{selectedSeat}</strong>
                    </div>

                    <hr className="border-white-10 my-3" />

                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Regular Transit Fare</span>
                      <strong className="text-white">{money(selected?.fare)}</strong>
                    </div>

                    {isDiscounted && (
                      <div className="d-flex justify-content-between mb-2 text-emerald">
                        <span>Discount ({pass.discount_type} -20%)</span>
                        <strong>-{money(discountAmount)}</strong>
                      </div>
                    )}

                    <hr className="border-white-10 my-3" />

                    <div className="d-flex justify-content-between align-items-baseline">
                      <span className="fs-5 text-white fw-bold">Total Fare</span>
                      <span className="fs-3 fw-extrabold text-cyan">{money(total)}</span>
                    </div>
                  </div>

                  <div className="d-flex flex-column gap-2 mt-4 pt-3 border-top border-white-10">
                    <button
                      type="button"
                      className="btn-future btn-future-success py-3 w-100"
                      disabled={loading}
                      onClick={complete}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Processing Booking...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check2-circle fs-5" />
                          <span>Submit Payment & Generate Boarding Pass</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-muted text-decoration-none"
                      onClick={() => setStep(2)}
                      disabled={loading}
                    >
                      ← Back to Passenger Information
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function Booking() {
  return (
    <RequireAuth>
      <BookingInner />
    </RequireAuth>
  );
}
