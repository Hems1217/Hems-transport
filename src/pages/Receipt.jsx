import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import { api, money } from "../api";
import RequireAuth from "../components/RequireAuth";

function Inner() {
  const [params] = useSearchParams();
  const [b, setB] = useState(null);
  const [msg, setMsg] = useState("");
  const [qr, setQr] = useState("");

  useEffect(() => {
    const ref =
      params.get("ref") ||
      localStorage.getItem("hems_last_booking");

    if (!ref) {
      setMsg("No booking reference supplied.");
      return;
    }

    api(
      `bookings/receipt?ref=${encodeURIComponent(ref)}`
    ).then(async (r) => {
      if (!r.success) return setMsg(r.message);

      setB(r.booking);

      const b = r.booking;

      const routeLine = `${b.origin} -> ${b.destination} via ${b.via_port}`;

      const verifyUrl = `${
        window.location.origin
      }/verify?ref=${encodeURIComponent(
        b.booking_reference
      )}`;

      const payload = [
        `HEMS TRANSPORT SERVICES`,
        `BOOKING RECEIPT`,
        `Booking Reference: ${b.booking_reference}`,
        `Passenger: ${b.passenger_name}`,
        `Route: ${routeLine}`,
        `Travel Date: ${b.travel_date}`,
        `Departure: ${b.departure_time}`,
        `Bus: ${b.bus_number}`,
        `Payment: ${b.payment_method} (${b.payment_status})`,
        `Amount: ${money(b.total_amount)}`,
        `Verify: ${verifyUrl}`,
      ].join("\n");

      setQr(
        await QRCode.toDataURL(payload, {
          width: 260,
          margin: 3,
          errorCorrectionLevel: "H",
        })
      );
    });
  }, [params]);

  if (msg) {
    return (
      <main className="container py-5">
        <div className="alert alert-warning">
          {msg}
        </div>

        <Link
          to="/bookings"
          className="btn btn-primary"
        >
          Back to My Bookings
        </Link>
      </main>
    );
  }

  if (!b) {
    return (
      <main className="container py-5 text-center">
        <div className="spinner-border" />
      </main>
    );
  }

  return (
    <main className="bg-light min-vh-100 py-4 py-md-5">
      <div className="container">
        <div className="d-flex justify-content-between gap-2 mb-3">
          <Link
            to="/bookings"
            className="btn btn-outline-secondary"
          >
            ← Back
          </Link>

          <button
            onClick={() => window.print()}
            className="btn btn-primary"
          >
            Print Receipt
          </button>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body p-4 p-md-5">
            <div className="row g-4 border-bottom pb-4 mb-4">
              <div className="col-md-8">
                <h3 className="mb-1">
                  Hems Transport Services
                </h3>

                <div className="text-secondary">
                  OFFICIAL ONLINE BOOKING RECEIPT
                </div>

                <span className="badge text-bg-warning mt-3">
                  Payment: {b.payment_status}
                </span>
              </div>

              <div className="col-md-4 text-md-end">
                <small className="text-secondary">
                  Booking Reference
                </small>

                <div className="font-monospace fw-bold text-primary">
                  {b.booking_reference}
                </div>
              </div>
            </div>

            <div className="row g-4">
              <div className="col-lg-8">
                <div className="row g-3">
                  {[
                    ["Passenger", b.passenger_name],
                    ["Contact", b.contact_number],
                    [
                      "Route & Port",
                      `${b.origin} → ${b.destination} via ${b.via_port}`,
                    ],
                    ["Travel Date", b.travel_date],
                    ["Departure", b.departure_time],
                    ["Arrival", b.arrival_time],
                    [
                      "Bus",
                      `${b.bus_number} · ${b.plate_number}`,
                    ],
                    ["Driver", b.driver_name],
                    ["Payment Method", b.payment_method],
                    [
                      "Transaction / Reference",
                      b.transaction_reference,
                    ],
                  ].map(([k, v]) => (
                    <div
                      className="col-sm-6"
                      key={k}
                    >
                      <small className="text-secondary d-block">
                        {k}
                      </small>

                      <strong>
                        {v || "—"}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="bg-light rounded p-3 mt-4">
                  <div className="d-flex justify-content-between">
                    <span>Fare</span>

                    <strong>
                      {money(
                        b.total_amount +
                          Number(b.discount_amount || 0)
                      )}
                    </strong>
                  </div>

                  <div className="d-flex justify-content-between text-success">
                    <span>Discount</span>

                    <strong>
                      -{money(b.discount_amount)}
                    </strong>
                  </div>

                  <hr />

                  <div className="d-flex justify-content-between fs-5">
                    <strong>Total</strong>

                    <strong>
                      {money(b.total_amount)}
                    </strong>
                  </div>
                </div>

                {b.receipt_evidence && (
                  <div className="mt-3 small text-secondary">
                    <i className="bi bi-paperclip me-1" />
                    Payment evidence submitted:{" "}
                    {b.receipt_evidence
                      .split("/")
                      .pop()}
                  </div>
                )}
              </div>

              <div className="col-lg-4 text-center border-start-lg">
                <div className="fw-semibold mb-2">
                  Scan to verify booking
                </div>

                {qr && (
                  <img
                    src={qr}
                    alt="Scannable Hems booking QR code"
                    className="img-fluid"
                    style={{ maxWidth: 220 }}
                  />
                )}

                <div className="small text-secondary mt-2">
                  Scan this QR to read the booking details and
                  open the verification page.
                </div>
              </div>
            </div>
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