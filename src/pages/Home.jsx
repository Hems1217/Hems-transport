import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Home() {
  const today = new Date().toISOString().slice(0, 10);

  const [terminals, setTerminals] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState("");

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
    "Puerto Galera",
    "San Teodoro",
    "Baco",
    "Calapan City",
    "Naujan",
    "Victoria",
    "Socorro",
    "Pola",
    "Pinamalayan",
    "Gloria",
    "Bansud",
    "Bongabong",
    "Roxas",
    "Mansalay",
    "Bulalacao",
    "San Jose",
    "Magsaysay",
    "Abra de Ilog",
    "Paluan",
    "Mamburao",
    "Looc",
    "Lubang",
    "Santa Cruz",
    "Sablayan",
    "Calintaan",
    "Rizal",
  ];

  const mindoro = useMemo(
    () =>
      orderedMindoro
        .map((name) =>
          terminals.find(
            (t) => t.terminal_name === `${name} Terminal`
          )
        )
        .filter(Boolean),
    [terminals]
  );

  const manila = useMemo(
    () =>
      terminals.filter(
        (t) => t.terminal_type === "Manila"
      ),
    [terminals]
  );

  const allTerminals = useMemo(
    () => [...manila, ...mindoro],
    [manila, mindoro]
  );

  const bookingQuery =
    from && to && from !== to
      ? `/booking?from=${encodeURIComponent(
          from
        )}&to=${encodeURIComponent(to)}&date=${date}`
      : "/booking";

  return (
    <main>
      <header className="bg-primary text-white py-5">
        <div className="container py-lg-5">
          <div className="row align-items-center g-4 g-lg-5">
            <div className="col-lg-6">
              <span className="badge bg-light text-primary mb-3">
                Mindoro ↔ Manila
              </span>

              <h1 className="display-5 fw-bold">
                Travel around Mindoro and Manila with Hems
                Transport Services
              </h1>

              <p className="lead opacity-75 my-4">
                Choose your starting terminal, destination
                terminal, and travel date to find an available
                trip.
              </p>

              <Link
                to="/booking"
                className="btn btn-light btn-lg"
              >
                Book Your Trip{" "}
                <i className="bi bi-arrow-right ms-1" />
              </Link>
            </div>

            <div className="col-lg-6 text-center">
              <img
                src="/images/hems-bus-hero.png"
                alt="Hems Transport Services bus"
                className="img-fluid rounded-4 shadow"
                style={{
                  maxHeight: 320,
                  objectFit: "contain",
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <section
        className="container py-4"
        style={{
          marginTop: -40,
          position: "relative",
        }}
      >
        <div className="card shadow border-0">
          <div className="card-body p-3 p-md-4">
            <div className="row g-3 align-items-end">
              <div className="col-lg-4">
                <label className="form-label fw-semibold">
                  Traveling from
                </label>

                <select
                  className="form-select"
                  value={from}
                  onChange={(e) =>
                    setFrom(e.target.value)
                  }
                >
                  <option value="">
                    Choose a terminal
                  </option>

                  {allTerminals.map((t) => (
                    <option
                      key={t.id}
                      value={t.terminal_name}
                    >
                      {t.terminal_name} —{" "}
                      {t.terminal_type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-lg-4">
                <label className="form-label fw-semibold">
                  Going to
                </label>

                <select
                  className="form-select"
                  value={to}
                  onChange={(e) =>
                    setTo(e.target.value)
                  }
                >
                  <option value="">
                    Choose a terminal
                  </option>

                  {allTerminals.map((t) => (
                    <option
                      key={t.id}
                      value={t.terminal_name}
                    >
                      {t.terminal_name} —{" "}
                      {t.terminal_type}
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
                  onChange={(e) =>
                    setDate(e.target.value)
                  }
                />
              </div>

              <div className="col-lg-2">
                <Link
                  className={`btn btn-primary w-100 ${
                    !from || !to || from === to
                      ? "disabled"
                      : ""
                  }`}
                  to={bookingQuery}
                >
                  Find Trips{" "}
                  <i className="bi bi-arrow-right ms-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-4">
            <h2 className="fw-bold mb-2">
              Travel Routes
            </h2>

            <p className="text-secondary mb-0">
              Choose any available Mindoro terminal or Manila
              terminal as your starting point and destination.
            </p>
          </div>

          <div className="row g-4">
            <div className="col-lg-7">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body p-4">
                  <h4 className="fw-bold mb-3">
                    Mindoro Terminals
                  </h4>

                  <p className="small text-secondary mb-3">
                    Listed in Hems Transport's route sequence.
                  </p>

                  <ol className="row row-cols-1 row-cols-md-2 g-2 ps-4 mb-0">
                    {mindoro.map((t, i) => (
                      <li
                        key={t.id}
                        className="small mb-1"
                      >
                        <span className="fw-semibold">
                          {t.terminal_name}
                        </span>

                        <span className="text-secondary">
                          {" "}
                          · {t.location}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body p-4">
                  <h4 className="fw-bold mb-3">
                    Manila Terminals
                  </h4>

                  <p className="small text-secondary mb-3">
                    Available Manila departure and arrival
                    terminals.
                  </p>

                  <ol className="ps-4 mb-0">
                    {manila.map((t) => (
                      <li
                        key={t.id}
                        className="small mb-2"
                      >
                        <span className="fw-semibold">
                          {t.terminal_name}
                        </span>

                        <span className="text-secondary">
                          {" "}
                          · {t.location}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-warning mt-3 mb-0">
              {error}
            </div>
          )}

          <div className="card border-0 shadow-sm mt-4">
            <div className="card-body p-4 text-center">
              <i className="bi bi-bus-front-fill display-6 text-primary" />

              <h4 className="fw-bold mt-3">
                One transport network across Mindoro and
                Manila.
              </h4>

              <p className="text-secondary mb-0">
                Hems Transport provides terminal options
                throughout Mindoro and in Manila. Select your
                terminal pair when booking so your trip and
                applicable port are shown clearly on your
                receipt.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-dark text-white py-4">
        <div className="container d-flex flex-column flex-md-row justify-content-between gap-2">
          <span>© 2026 Hems Transport Services</span>
          <span>Mindoro • Manila</span>
        </div>
      </footer>
    </main>
  );
}