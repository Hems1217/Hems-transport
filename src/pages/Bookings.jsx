import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../api";
import RequireAuth from "../components/RequireAuth";

function Inner() {
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("bookings/mine").then((r) =>
      r.success
        ? setRows(r.bookings || [])
        : setMsg(r.message)
    );
  }, []);

  if (rows === null) {
    return (
      <main className="container py-5 text-center">
        <div className="spinner-border" />
      </main>
    );
  }

  return (
    <main>
      <header className="bg-light py-5">
        <div className="container">
          <h1 className="fw-bold">My Bookings</h1>

          <p className="text-secondary mb-0">
            View your confirmed trips and receipts.
          </p>
        </div>
      </header>

      <div className="container py-5">
        {msg && (
          <div className="alert alert-danger">
            {msg}
          </div>
        )}

        {!rows.length ? (
          <div className="text-center py-5">
            <i className="bi bi-ticket-perforated display-3 text-secondary" />

            <h4 className="mt-3">
              No bookings yet
            </h4>

            <Link
              className="btn btn-primary"
              to="/booking"
            >
              Book a Trip
            </Link>
          </div>
        ) : (
          rows.map((b) => (
            <div
              className="card border-0 shadow-sm mb-3"
              key={b.id}
            >
              <div className="card-body p-4">
                <div className="row g-3 align-items-center">
                  <div className="col-md-8">
                    <small className="text-secondary">
                      Booking Reference
                    </small>

                    <div className="font-monospace fw-bold text-primary">
                      {b.booking_reference}
                    </div>

                    <h5 className="mt-3">
                      {b.origin} → {b.destination}
                    </h5>

                    <div className="text-secondary">
                      {b.travel_date} · {b.departure_time} ·{" "}
                      {b.bus_number}
                    </div>

                    <div className="small mt-2">
                      Passenger:{" "}
                      <strong>{b.passenger_name}</strong> · Driver:{" "}
                      {b.driver_name}
                    </div>
                  </div>

                  <div className="col-md-4 text-md-end">
                    <span className="badge text-bg-success">
                      {b.booking_status}
                    </span>

                    <div className="fs-4 fw-bold mt-2">
                      {money(b.total_amount)}
                    </div>

                    <div className="small text-secondary">
                      {b.payment_method} · {b.payment_status}
                    </div>

                    <Link
                      className="btn btn-primary btn-sm mt-3"
                      to={`/receipt?ref=${encodeURIComponent(
                        b.booking_reference
                      )}`}
                    >
                      View Receipt
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
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