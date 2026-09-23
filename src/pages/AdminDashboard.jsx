import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, money } from "../api";
import { useAuth } from "../AuthContext";

function StatusBadge({ value }) {
  const v = String(value || "").toUpperCase();
  const cls = v === "COMPLETED" ? "text-bg-success" : v === "CANCELLED" ? "text-bg-danger" : "text-bg-warning";
  return <span className={`badge ${cls}`}>{v}</span>;
}

export default function AdminDashboard() {
  const { firebaseUser, logout } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(null);

  async function loadBookings() {
    setLoading(true);
    setMessage("");
    try {
      const result = await api("admin/bookings");
      if (!result.success) throw new Error(result.message || "Unable to load bookings.");
      setBookings(result.bookings || []);
    } catch (error) {
      setMessage(error.message || "Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBookings(); }, []);

  async function updateStatus(id, status) {
    setBusy(id);
    setMessage("");
    try {
      const result = await api(`admin/bookings/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      if (!result.success) throw new Error(result.message || "Unable to update booking.");
      await loadBookings();
    } catch (error) {
      setMessage(error.message || "Unable to update booking.");
    } finally {
      setBusy(null);
    }
  }

  async function doLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return <main className="min-vh-100 bg-light">
    <nav className="navbar bg-white border-bottom sticky-top"><div className="container">
      <Link className="navbar-brand fw-bold text-primary" to="/admin"><i className="bi bi-bus-front me-2" />Hems Transport Services — Admin</Link>
      <div className="d-flex align-items-center gap-2"><span className="small text-secondary d-none d-md-inline">{firebaseUser?.email}</span><button className="btn btn-outline-danger btn-sm" onClick={doLogout}>Logout</button></div>
    </div></nav>

    <section className="container py-4 py-md-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div><h1 className="fw-bold mb-1">Booking Management</h1><p className="text-secondary mb-0">View customer bookings and update their status.</p></div>
        <button className="btn btn-outline-primary" onClick={loadBookings} disabled={loading}><i className="bi bi-arrow-clockwise me-1" />Refresh</button>
      </div>
      {message && <div className="alert alert-danger">{message}</div>}
      <div className="card border-0 shadow-sm"><div className="card-body p-0">
        {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div> : !bookings.length ? <div className="text-center py-5 text-secondary">No bookings found.</div> : <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light"><tr><th>Reference</th><th>Customer</th><th>Trip</th><th>Date</th><th>Passenger</th><th>Total</th><th>Status</th><th>Manage</th></tr></thead>
            <tbody>{bookings.map(b => <tr key={b.id}>
              <td className="font-monospace fw-semibold text-primary">{b.booking_reference}</td>
              <td><div className="fw-semibold">{b.user_name || b.full_name || b.passenger_name}</div><small className="text-secondary">{b.email || ""}</small></td>
              <td><div>{b.origin} → {b.destination}</div><small className="text-secondary">{b.via_port}</small></td>
              <td>{b.travel_date}<br /><small>{b.departure_time}</small></td>
              <td>{b.passenger_name}<br /><small>{b.contact_number}</small></td>
              <td className="fw-bold">{money(b.total_amount)}</td>
              <td><StatusBadge value={b.booking_status} /><div className="small text-secondary mt-1">{b.payment_method}</div></td>
              <td><select className="form-select form-select-sm" value={b.booking_status} disabled={busy === b.id} onChange={e => updateStatus(b.id, e.target.value)}><option value="CONFIRMED">CONFIRMED</option><option value="COMPLETED">COMPLETED</option><option value="CANCELLED">CANCELLED</option></select></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </div></div>
    </section>
  </main>;
}
