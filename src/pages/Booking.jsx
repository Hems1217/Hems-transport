import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, money } from "../api";
import RequireAuth from "../components/RequireAuth";
import Alert from "../components/Alert";

function BookingInner() {
  const loc = useLocation();
  const nav = useNavigate();
  const params = new URLSearchParams(loc.search);

  const today = new Date().toISOString().slice(0, 10);

  const [terminals, setTerminals] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [from, setFrom] = useState(params.get("from") || "");
  const [to, setTo] = useState(params.get("to") || "");
  const [date, setDate] = useState(params.get("date") || today);
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState(1);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [pass, setPass] = useState({
    passenger_name: "",
    contact_number: "",
    passenger_address: "",
    passenger_age: "",
    discount_type: "None",
  });

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
        if (t.success) {
          setTerminals(t.terminals || []);
        } else {
          setMsg(t.message || "Unable to load terminals.");
        }

        if (r.success) {
          setRoutes(r.routes || []);
        } else {
          setMsg(r.message || "Unable to load routes.");
        }
      })
      .catch(() =>
        setMsg("Unable to connect to the Hems Transport server.")
      );
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

    const q = new URLSearchParams({
      date,
      route_id: routeId,
    });

    const r = await api(`schedules?${q}`);

    if (r.success) {
      setSchedules(r.schedules || []);
    } else {
      setMsg(r.message || "Unable to load schedules.");
    }
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

  const total = selected
    ? Number(selected.fare) *
      (["Student", "PWD", "Senior Citizen"].includes(
        pass.discount_type
      )
        ? 0.8
        : 1)
    : 0;

  function setP(key, value) {
    setPay((p) => ({
      ...p,
      [key]: value,
    }));
  }

  function validPayment() {
    if (!pay.receipt_evidence) {
      return "Please upload your payment receipt/evidence.";
    }

    if (
      payment === "GCash" &&
      ![
        pay.gcash_name,
        pay.gcash_number,
        pay.gcash_reference,
      ].every((v) => String(v || "").trim())
    ) {
      return "Please complete the GCash account name, number, and reference number.";
    }

    if (
      payment === "Credit Card" &&
      ![
        pay.cardholder_name,
        pay.card_number,
        pay.card_expiry,
        pay.card_cvv,
      ].every((v) => String(v || "").trim())
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
      return "Enter a valid CVV.";
    }

    if (
      payment === "GCash" &&
      !/^09\d{9}$/.test(pay.gcash_number.replace(/\s+/g, ""))
    ) {
      return "Enter a valid 11-digit GCash number.";
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
      if (k !== "receipt_evidence" && v !== null) {
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
      localStorage.setItem(
        "hems_last_booking",
        r.booking_reference
      );

      nav(
        `/receipt?ref=${encodeURIComponent(
          r.booking_reference
        )}`
      );
    } else {
      setMsg(r.message || "Unable to complete booking.");
    }
  }

  return (
    <main className="bg-light min-vh-100 py-4 py-md-5">
      <div className="container">
        <div className="mb-4">
          <h2 className="fw-bold mb-1">Book Your Hems Trip</h2>

          <p className="text-secondary mb-0">
            Select the terminal you are traveling from, the terminal
            you are going to, and your travel date.
          </p>
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-3 p-md-4">
            <div className="row g-3 align-items-end">
              <div className="col-lg-5">
                <label className="form-label fw-semibold">
                  Traveling from
                </label>

                <select
                  className="form-select"
                  value={from}
                  onChange={(e) => changeFrom(e.target.value)}
                >
                  <option value="">Choose a terminal</option>

                  {allTerminals.map((t) => (
                    <option key={t.id} value={t.terminal_name}>
                      {t.terminal_name} — {t.terminal_type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-lg-5">
                <label className="form-label fw-semibold">
                  Going to
                </label>

                <select
                  className="form-select"
                  value={to}
                  onChange={(e) => changeTo(e.target.value)}
                >
                  <option value="">Choose a terminal</option>

                  {allTerminals.map((t) => (
                    <option key={t.id} value={t.terminal_name}>
                      {t.terminal_name} — {t.terminal_type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-lg-2">
                <label className="form-label fw-semibold">
                  Travel date
                </label>

                <input
                  type="date"
                  min={today}
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-center align-items-center gap-2 gap-md-4 mb-4 small fw-semibold flex-wrap">
          {["Trip", "Passenger", "Payment"].map((x, i) => (
            <div
              className={
                step === i + 1
                  ? "text-primary"
                  : "text-secondary"
              }
              key={x}
            >
              <span
                className={`badge rounded-pill ${
                  step === i + 1
                    ? "text-bg-primary"
                    : "text-bg-secondary"
                } me-1`}
              >
                {i + 1}
              </span>

              {x}
            </div>
          ))}
        </div>

        <Alert message={msg} />

        {step === 1 && (
          <section className="card border-0 shadow-sm">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex justify-content-between gap-3 flex-wrap align-items-start">
                <div>
                  <h3 className="fw-bold mb-1">
                    Available Trips
                  </h3>

                  <p className="text-secondary mb-0">
                    {from && to
                      ? `${from} → ${to}`
                      : "Complete the terminal selection above."}
                  </p>
                </div>

                {chosenRoute && (
                  <span className="badge rounded-pill text-bg-primary px-3 py-2">
                    Via {chosenRoute.via_port}
                  </span>
                )}
              </div>

              <hr />

              {!from || !to ? (
                <div className="alert alert-info mb-0">
                  Choose a terminal in both fields to see available
                  trips.
                </div>
              ) : from === to ? (
                <div className="alert alert-warning mb-0">
                  Your starting terminal and destination terminal must
                  be different.
                </div>
              ) : !chosenRoute ? (
                <div className="alert alert-warning mb-0">
                  No direct Hems route is available between these two
                  terminals.
                </div>
              ) : schedules.length ? (
                schedules.map((s) => (
                  <div className="card border mb-3" key={s.id}>
                    <div className="card-body">
                      <div className="row align-items-center g-3">
                        <div className="col-3 col-md-2 text-center">
                          <i className="bi bi-bus-front fs-1 text-primary" />
                        </div>

                        <div className="col-9 col-md-6">
                          <h5 className="mb-1">
                            {s.bus_number}
                          </h5>

                          <div className="small text-secondary">
                            {s.bus_type} · Plate {s.plate_number}
                          </div>

                          <div className="mt-2 fw-semibold">
                            {s.origin}{" "}
                            <i className="bi bi-arrow-right mx-1" />{" "}
                            {s.destination}
                          </div>

                          <div className="small text-primary fw-semibold">
                            <i className="bi bi-water me-1" />
                            Via {s.via_port}
                          </div>

                          <div className="small text-secondary">
                            {s.departure_time} → {s.arrival_time} ·
                            Driver: {s.driver_name}
                          </div>
                        </div>

                        <div className="col-6 col-md-2">
                          <span className="badge text-bg-light border">
                            {s.available_seats} seats
                          </span>

                          <div className="mt-2 fw-bold">
                            {money(s.fare)}
                          </div>
                        </div>

                        <div className="col-6 col-md-2">
                          <button
                            className="btn btn-primary w-100"
                            onClick={() => {
                              setSelected(s);
                              setStep(2);
                              window.scrollTo(0, 0);
                            }}
                          >
                            Select Bus
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="alert alert-info mb-0">
                  No schedules found for this date and route.
                </div>
              )}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="card border-0 shadow-sm">
            <div className="card-body p-3 p-md-4">
              <h3 className="fw-bold">Passenger Information</h3>

              <div className="p-3 bg-light rounded mb-4">
                <strong>
                  {selected?.origin} → {selected?.destination}
                </strong>

                <br />

                <span className="text-primary fw-semibold">
                  Via {selected?.via_port}
                </span>

                <br />

                {selected?.travel_date} ·{" "}
                {selected?.departure_time} ·{" "}
                {selected?.bus_number}

                <br />

                <span className="text-secondary">
                  {money(selected?.fare)} regular fare
                </span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setStep(3);
                }}
              >
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      Passenger Full Name
                    </label>

                    <input
                      className="form-control"
                      required
                      value={pass.passenger_name}
                      onChange={(e) =>
                        setPass({
                          ...pass,
                          passenger_name: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Contact Number
                    </label>

                    <input
                      className="form-control"
                      required
                      value={pass.contact_number}
                      onChange={(e) =>
                        setPass({
                          ...pass,
                          contact_number: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-8">
                    <label className="form-label">
                      Address
                    </label>

                    <input
                      className="form-control"
                      required
                      value={pass.passenger_address}
                      onChange={(e) =>
                        setPass({
                          ...pass,
                          passenger_address: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Age</label>

                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      required
                      value={pass.passenger_age}
                      onChange={(e) =>
                        setPass({
                          ...pass,
                          passenger_age: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Discount Type
                    </label>

                    <select
                      className="form-select"
                      value={pass.discount_type}
                      onChange={(e) =>
                        setPass({
                          ...pass,
                          discount_type: e.target.value,
                        })
                      }
                    >
                      <option>None</option>
                      <option>Student</option>
                      <option>PWD</option>
                      <option>Senior Citizen</option>
                    </select>
                  </div>
                </div>

                <div className="d-flex justify-content-between mt-4">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setStep(1)}
                  >
                    ← Back
                  </button>

                  <button className="btn btn-primary">
                    Continue to Payment
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="card border-0 shadow-sm">
            <div className="card-body p-3 p-md-4">
              <h3 className="fw-bold">Payment</h3>

              <div className="alert alert-primary">
                <i className="bi bi-shield-check me-2" />

                <strong>
                  Online payment gives you a better chance of securing
                  your seat.
                </strong>

                <div className="small mt-1">
                  Online payment submissions can be reviewed and
                  reserved faster than paying at a terminal.
                </div>
              </div>

              <div className="bg-light p-3 rounded mb-4">
                Route:{" "}
                <strong>
                  {selected?.origin} → {selected?.destination}
                </strong>

                <br />

                Port: <strong>{selected?.via_port}</strong>

                <br />

                Regular Fare:{" "}
                <strong>{money(selected?.fare)}</strong>

                <br />

                Discount:{" "}
                <strong>
                  -{money(Number(selected?.fare) - total)}
                </strong>

                <hr />

                <span className="fs-5">
                  Total Fare: <strong>{money(total)}</strong>
                </span>
              </div>

              <div className="row g-3 mb-3">
                {["GCash", "Credit Card"].map((x) => (
                  <div className="col-md-6" key={x}>
                    <button
                      type="button"
                      className={`btn w-100 text-start border p-3 h-100 ${
                        payment === x
                          ? "border-primary bg-primary-subtle"
                          : "bg-white"
                      }`}
                      onClick={() => setPayment(x)}
                    >
                      <i
                        className={`bi ${
                          x === "GCash"
                            ? "bi-phone"
                            : "bi-credit-card"
                        } me-2`}
                      />

                      <strong>{x}</strong>

                      <div className="small text-secondary mt-1">
                        Enter payment details and upload your payment
                        receipt/evidence.
                      </div>
                    </button>
                  </div>
                ))}
              </div>

              {payment === "GCash" && (
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      GCash Account Name
                    </label>

                    <input
                      className="form-control"
                      value={pay.gcash_name}
                      onChange={(e) =>
                        setP("gcash_name", e.target.value)
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      GCash Number
                    </label>

                    <input
                      className="form-control"
                      inputMode="numeric"
                      placeholder="09XXXXXXXXX"
                      value={pay.gcash_number}
                      onChange={(e) =>
                        setP("gcash_number", e.target.value)
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      GCash Reference Number
                    </label>

                    <input
                      className="form-control"
                      value={pay.gcash_reference}
                      onChange={(e) =>
                        setP("gcash_reference", e.target.value)
                      }
                    />
                  </div>
                </div>
              )}

              {payment === "Credit Card" && (
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      Cardholder Name
                    </label>

                    <input
                      className="form-control"
                      autoComplete="cc-name"
                      value={pay.cardholder_name}
                      onChange={(e) =>
                        setP("cardholder_name", e.target.value)
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">
                      Card Number
                    </label>

                    <input
                      className="form-control"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="13–19 digits"
                      value={pay.card_number}
                      onChange={(e) =>
                        setP(
                          "card_number",
                          e.target.value
                            .replace(/[^0-9 ]/g, "")
                            .slice(0, 23)
                        )
                      }
                    />
                  </div>

                  <div className="col-6 col-md-3">
                    <label className="form-label">Expiry</label>

                    <input
                      className="form-control"
                      autoComplete="cc-exp"
                      placeholder="MM/YY"
                      value={pay.card_expiry}
                      onChange={(e) =>
                        setP("card_expiry", e.target.value)
                      }
                    />
                  </div>

                  <div className="col-6 col-md-3">
                    <label className="form-label">CVV</label>

                    <input
                      type="password"
                      className="form-control"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      maxLength="4"
                      value={pay.card_cvv}
                      onChange={(e) =>
                        setP(
                          "card_cvv",
                          e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 4)
                        )
                      }
                    />
                  </div>

                  <div className="col-12">
                    <div className="form-text">
                      <i className="bi bi-lock me-1" />
                      For this local demo, only the last 4 card digits
                      are stored. Full card number and CVV are not saved.
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="form-label fw-semibold">
                  Payment Receipt Evidence{" "}
                  <span className="text-danger">*</span>
                </label>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="form-control"
                  onChange={(e) =>
                    setP(
                      "receipt_evidence",
                      e.target.files?.[0] || null
                    )
                  }
                />

                <div className="form-text">
                  Upload a clear JPG, PNG, or WEBP screenshot/photo of
                  the payment receipt. Maximum 5 MB.
                </div>

                {pay.receipt_evidence && (
                  <div className="small text-success mt-2">
                    <i className="bi bi-check-circle me-1" />
                    {pay.receipt_evidence.name}
                  </div>
                )}
              </div>

              <div className="d-flex justify-content-between mt-4 gap-2">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setStep(2)}
                >
                  ← Back
                </button>

                <button
                  className="btn btn-success px-4"
                  disabled={loading}
                  onClick={complete}
                >
                  {loading
                    ? "Submitting..."
                    : "Submit Payment & Book"}
                </button>
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