import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import { api, money } from "../api";
import RequireAuth from "../components/RequireAuth";
import Alert from "../components/Alert";

function Inner() {
  const [params] = useSearchParams();
  const [b, setB] = useState(null);
  const [msg, setMsg] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ref =
      params.get("ref") ||
      localStorage.getItem("hems_last_booking");

    if (!ref) {
      setMsg("No booking reference supplied.");
      return;
    }

    api(`bookings/receipt?ref=${encodeURIComponent(ref)}`).then(async (r) => {
      if (!r.success) return setMsg(r.message || "Receipt not found.");

      setB(r.booking);
      const booking = r.booking;
      const verifyUrl = `${window.location.origin}/verify?ref=${encodeURIComponent(booking.booking_reference)}`;

      const payload = [
        `HEMS TRANSPORT SERVICES`,
        `OFFICIAL DIGITAL BOARDING PASS`,
        `REF: ${booking.booking_reference}`,
        `PASSENGER: ${booking.passenger_name}`,
        `ROUTE: ${booking.origin} -> ${booking.destination} via ${booking.via_port}`,
        `DATE: ${booking.travel_date} | ${booking.departure_time}`,
        `BUS: ${booking.bus_number} (${booking.plate_number})`,
        `STATUS: ${booking.booking_status} | PAYMENT: ${booking.payment_status}`,
        `TOTAL: ${money(booking.total_amount)}`,
        `VERIFY: ${verifyUrl}`
      ].join("\n");

      try {
        const qrUrl = await QRCode.toDataURL(payload, {
          width: 280,
          margin: 2,
          color: {
            dark: "#0f172a",
            light: "#ffffff"
          },
          errorCorrectionLevel: "H",
        });
        setQr(qrUrl);
      } catch (err) {
        console.error("QR generation error:", err);
      }
    });
  }, [params]);

  function handleCopy() {
    if (b?.booking_reference) {
      navigator.clipboard.writeText(b.booking_reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (msg) {
    return (
      <main className="futuristic-bg min-vh-100 py-5">
        <div className="container" style={{ maxWidth: 600 }}>
          <Alert message={msg} />
          <Link to="/bookings" className="btn-future btn-future-primary">
            <i className="bi bi-arrow-left me-1" /> Back to My Bookings
          </Link>
        </div>
      </main>
    );
  }

  if (!b) {
    return (
      <main className="futuristic-bg min-vh-100 d-flex align-items-center justify-content-center py-5">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{ width: "3rem", height: "3rem" }} />
          <div className="text-muted small">Generating digital boarding pass...</div>
        </div>
      </main>
    );
  }

  const isConfirmed = b.booking_status === "CONFIRMED";
  const isCompleted = b.booking_status === "COMPLETED";

  return (
    <main className="futuristic-bg min-vh-100 py-4 py-md-5">
      <div className="container" style={{ maxWidth: 880 }}>
        {/* Top Action Bar */}
        <div className="d-flex justify-content-between align-items-center mb-4 no-print gap-2">
          <Link to="/bookings" className="btn-future btn-future-outline py-2 px-3">
            <i className="bi bi-arrow-left" />
            <span>My Bookings</span>
          </Link>

          <div className="d-flex gap-2">
            <button
              onClick={() => window.print()}
              className="btn-future btn-future-primary py-2 px-4"
            >
              <i className="bi bi-printer" />
              <span>Print Boarding Pass</span>
            </button>
          </div>
        </div>

        {/* Boarding Pass Document Card */}
        <div className="boarding-pass-card shadow-lg">
          {/* Header */}
          <div className="ticket-header d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div className="d-flex align-items-center gap-2">
              <div
                className="d-flex align-items-center justify-content-center rounded-3 text-white"
                style={{
                  width: 40,
                  height: 40,
                  background: "linear-gradient(135deg, #2563eb, #06b6d4)",
                }}
              >
                <i className="bi bi-bus-front fs-5" />
              </div>
              <div>
                <h4 className="fw-extrabold text-white mb-0 tracking-tight">HEMS TRANSPORT SERVICES</h4>
                <div className="small text-cyan" style={{ fontSize: "0.75rem", letterSpacing: "0.08em" }}>
                  OFFICIAL DIGITAL BOARDING PASS & RECEIPT
                </div>
              </div>
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

          {/* Reference bar */}
          <div className="px-4 py-2 d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom border-white-10" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted text-uppercase" style={{ fontSize: "0.75rem" }}>Reference Code:</span>
              <span className="font-monospace fw-bold text-cyan fs-5">{b.booking_reference}</span>
              <button
                type="button"
                className="btn btn-sm btn-link text-muted p-0 text-decoration-none no-print"
                onClick={handleCopy}
                title="Copy reference"
              >
                <i className={`bi ${copied ? "bi-check-lg text-emerald" : "bi-clipboard"}`} />
                {copied && <span className="small text-emerald ms-1">Copied!</span>}
              </button>
            </div>
            <div className="small text-muted">
              Issued: <span className="text-white">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 p-md-5">
            {/* Transit Route Path */}
            <div className="p-3 rounded-3 mb-4" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
              <div className="transit-timeline my-2">
                <div className="transit-point">
                  <div className="small text-muted text-uppercase" style={{ fontSize: "0.7rem" }}>Departure Hub</div>
                  <div className="fw-bold text-white fs-5">{b.origin}</div>
                  <div className="text-cyan small fw-semibold">{b.departure_time}</div>
                </div>
                <div className="transit-track">
                  <span className="transit-track-icon">
                    <i className="bi bi-water me-1" />
                    Ro-Ro Via {b.via_port}
                  </span>
                </div>
                <div className="transit-point-end">
                  <div className="small text-muted text-uppercase" style={{ fontSize: "0.7rem" }}>Arrival Hub</div>
                  <div className="fw-bold text-white fs-5">{b.destination}</div>
                  <div className="text-cyan small fw-semibold">{b.arrival_time}</div>
                </div>
              </div>
            </div>

            {/* Two-Column Layout: Details + QR Code */}
            <div className="row g-4 align-items-center">
              {/* Left Column: Manifest & Fare Details */}
              <div className="col-lg-7">
                <div className="row g-3">
                  {[
                    ["Passenger Name", b.passenger_name],
                    ["Contact Number", b.contact_number],
                    ["Travel Date", b.travel_date],
                    ["Assigned Coach", `${b.bus_number} (${b.plate_number})`],
                    ["Driver in Command", b.driver_name],
                    ["Payment Mode", b.payment_method],
                    ["Trace / Ref", b.transaction_reference],
                    ["Discount Status", b.discount_type || "None"],
                  ].map(([label, val]) => (
                    <div className="col-sm-6" key={label}>
                      <div className="small text-muted text-uppercase" style={{ fontSize: "0.7rem" }}>
                        {label}
                      </div>
                      <div className="fw-bold text-white small text-truncate">
                        {val || "—"}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fare Summary Breakdown */}
                <div className="p-3 rounded-3 mt-4" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
                  <div className="d-flex justify-content-between mb-2 small">
                    <span className="text-muted">Standard Fare</span>
                    <strong className="text-white">
                      {money(Number(b.total_amount) + Number(b.discount_amount || 0))}
                    </strong>
                  </div>

                  {Number(b.discount_amount) > 0 && (
                    <div className="d-flex justify-content-between mb-2 small text-emerald">
                      <span>Discount Deduction</span>
                      <strong>-{money(b.discount_amount)}</strong>
                    </div>
                  )}

                  <hr className="border-white-10 my-2" />

                  <div className="d-flex justify-content-between align-items-baseline">
                    <span className="fw-bold text-white">Total Amount Paid</span>
                    <span className="fs-4 fw-extrabold text-cyan">{money(b.total_amount)}</span>
                  </div>
                </div>

                {b.receipt_evidence && (
                  <div className="small text-muted mt-2">
                    <i className="bi bi-paperclip me-1 text-cyan" />
                    Proof of transaction uploaded: <span className="text-white">{b.receipt_evidence.split("/").pop()}</span>
                  </div>
                )}
              </div>

              {/* Right Column: Scannable Boarding QR & Security Badge */}
              <div className="col-lg-5 text-center border-start-lg ps-lg-4">
                <div className="p-3 rounded-3 d-inline-block bg-white shadow-sm mb-3">
                  {qr ? (
                    <img
                      src={qr}
                      alt="Scannable Boarding QR Code"
                      className="img-fluid"
                      style={{ maxWidth: 220, display: "block" }}
                    />
                  ) : (
                    <div className="spinner-border text-dark" />
                  )}
                </div>

                <div className="fw-bold text-white small mb-1">OFFICIAL BOARDING QR CODE</div>
                <div className="text-muted small px-3">
                  Present this QR pass to the terminal conductor or bus attendant upon boarding for automated check-in.
                </div>

                <div className="mt-3 pt-3 border-top border-white-10 d-inline-flex align-items-center gap-1 text-emerald small">
                  <i className="bi bi-patch-check-fill" />
                  <span>Authenticated Cryptographic E-Ticket</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Footer Bar */}
          <div className="ticket-divider">
            <div className="ticket-notch-left" />
            <div className="ticket-dashed-line" />
            <div className="ticket-notch-right" />
          </div>

          <div className="px-4 py-3 d-flex justify-content-between align-items-center flex-wrap gap-2 text-muted small" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
            <span>Hems Transport Services • Mindoro ↔ Manila Inter-Island Ro-Ro Transit</span>
            <span>Customer Hotline: (02) 8888-HEMS</span>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Receipt() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}
