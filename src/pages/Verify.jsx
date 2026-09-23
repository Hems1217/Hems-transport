import React, { useState } from "react";
import { api } from "../api";

export default function Verify() {
  const [ref, setRef] = useState("");
  const [result, setResult] = useState(null);
  const [msg, setMsg] = useState("");

  async function check(e) {
    e.preventDefault();
    setMsg("");
    setResult(null);

    const r = await api(
      `verify?ref=${encodeURIComponent(ref)}`
    );

    if (r.success) {
      setResult(r.booking);
    } else {
      setMsg(r.message);
    }
  }

  return (
    <main className="min-vh-100 bg-light py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-7 col-lg-5">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <h3 className="fw-bold">
                  Verify Booking
                </h3>

                <p className="text-secondary">
                  Enter a booking reference to verify it.
                </p>

                <form
                  onSubmit={check}
                  className="input-group mb-3"
                >
                  <input
                    className="form-control"
                    placeholder="HMS-20260908-ABC123"
                    value={ref}
                    onChange={(e) =>
                      setRef(e.target.value)
                    }
                    required
                  />

                  <button className="btn btn-primary">
                    Verify
                  </button>
                </form>

                {msg && (
                  <div className="alert alert-danger">
                    {msg}
                  </div>
                )}

                {result && (
                  <div className="alert alert-success">
                    <strong>
                      Valid booking.
                    </strong>

                    <hr />

                    <div>
                      {result.passenger_name}
                    </div>

                    <div>
                      {result.origin} →{" "}
                      {result.destination} via{" "}
                      {result.via_port}
                    </div>

                    <div>
                      {result.travel_date} ·{" "}
                      {result.departure_time}
                    </div>

                    <div>
                      Bus: {result.bus_number}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}