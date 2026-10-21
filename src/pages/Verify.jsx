import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../api";
import Alert from "../components/Alert";

export default function Verify() {
  const [params] = useSearchParams();
  const [ref, setRef] = useState(params.get("ref") || "");
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urlRef = params.get("ref");
    if (urlRef) {
      setRef(urlRef);
      performCheck(urlRef);
    }
  }, [params]);

  async function performCheck(referenceCode) {
    if (!referenceCode?.trim()) return;
    setLoading(true);
    setMsg("");
    setResult(null);

    const r = await api(`verify?ref=${encodeURIComponent(referenceCode.trim())}`);
    setLoading(false);

    if (r.success) {
      setResult(r.booking);
    } else {
      setMsg(r.message || "Invalid or cancelled booking reference.");
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    performCheck(ref);
  }

  return (
    <main className="futuristic-bg min-vh-100 py-5">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="text-center mb-4">
          <div className="badge-future badge-future-cyan mb-2">
            <span className="status-beacon" />
            <span>LIVE VERIFICATION ENGINE</span>
          </div>
          <h1 className="fw-extrabold text-white mb-2">Ticket Authenticity Scanner</h1>
          <p className="text-muted small">
            Scan QR code or enter booking reference to authenticate passenger tickets and check-in status.
          </p>
        </div>

        {/* Verification Card */}
        <div className="future-card future-card-glass p-4 p-md-5">
          {/* Scanner visual radar graphic */}
          <div className="scanner-frame mb-4">
            <div className="text-center p-3">
              <i className="bi bi-qr-code-scan display-4 text-cyan d-block mb-2" />
              <div className="small text-muted font-monospace" style={{ fontSize: "0.75rem" }}>
                {ref ? ref : "READY FOR SCAN"}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mb-4">
            <label className="future-label">Booking Reference Number</label>
            <div className="d-flex gap-2">
              <input
                className="form-control future-input font-monospace"
                placeholder="HMS-20261021-ABC123"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                required
              />
              <button
                type="submit"
                className="btn-future btn-future-primary px-4 text-nowrap"
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <>
                    <i className="bi bi-shield-check" />
                    <span>Verify</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <Alert message={msg} type="danger" onClose={() => setMsg("")} />

          {/* Validated Result Display */}
          {result && (
            <div
              className="p-4 rounded-3"
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                boxShadow: "0 0 25px rgba(16, 185, 129, 0.15)",
                animation: "fadeIn 0.3s ease",
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom border-white-10">
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white"
                    style={{ width: 32, height: 32, background: "var(--accent-emerald)" }}
                  >
                    <i className="bi bi-check-lg fw-bold" />
                  </div>
                  <div>
                    <h5 className="fw-bold text-white mb-0">AUTHENTICATED OFFICIAL TICKET</h5>
                    <div className="small text-emerald">Booking status is active and verified</div>
                  </div>
                </div>

                <span className="badge-future badge-future-emerald font-monospace">
                  {result.booking_status}
                </span>
              </div>

              {/* Transit Details */}
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="small text-muted text-uppercase" style={{ fontSize: "0.7rem" }}>Passenger</div>
                  <div className="fw-bold text-white">{result.passenger_name}</div>
                </div>

                <div className="col-sm-6">
                  <div className="small text-muted text-uppercase" style={{ fontSize: "0.7rem" }}>Assigned Coach</div>
                  <div className="fw-bold text-white">{result.bus_number}</div>
                </div>

                <div className="col-12">
                  <div className="small text-muted text-uppercase" style={{ fontSize: "0.7rem" }}>Route & Ro-Ro Port</div>
                  <div className="fw-bold text-cyan">
                    {result.origin} → {result.destination}
                  </div>
                  <div className="small text-muted">Via {result.via_port}</div>
                </div>

                <div className="col-sm-6">
                  <div className="small text-muted text-uppercase" style={{ fontSize: "0.7rem" }}>Travel Date & Time</div>
                  <div className="text-white small">
                    {result.travel_date} • {result.departure_time}
                  </div>
                </div>

                <div className="col-sm-6">
                  <div className="small text-muted text-uppercase" style={{ fontSize: "0.7rem" }}>Payment Status</div>
                  <span className="badge-future badge-future-amber">
                    {result.payment_method} ({result.payment_status})
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-top border-white-10 d-flex justify-content-end">
                <Link
                  to={`/receipt?ref=${encodeURIComponent(result.booking_reference)}`}
                  className="btn-future btn-future-outline py-2 px-3 small"
                >
                  <i className="bi bi-file-earmark-text me-1" /> View Full E-Ticket
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
