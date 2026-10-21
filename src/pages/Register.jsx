import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import { api } from "../api";
import { ensureFirestoreUser } from "../AuthContext";
import Alert from "../components/Alert";

export default function Register() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    age: "",
    password: "",
    confirm_password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const change = (e) =>
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

  async function submit(e) {
    e.preventDefault();
    setMsg("");

    if (form.password !== form.confirm_password) {
      return setMsg("Passwords do not match.");
    }

    if (form.password.length < 6) {
      return setMsg("Password must be at least 6 characters.");
    }

    setLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );

      await updateProfile(credential.user, {
        displayName: form.full_name.trim(),
      });

      try {
        await ensureFirestoreUser(credential.user);
      } catch (err) {
        console.warn("Firestore user sync on register bypassed:", err?.message);
      }

      const idToken = await credential.user.getIdToken(true);
      const r = await api("register-profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          age: form.age,
        }),
      });

      if (!r.success) {
        console.warn("MySQL profile synchronization:", r.message);
      }

      nav("/login", {
        state: {
          message: r.success
            ? "Account created successfully. Please sign in to continue."
            : "Firebase account created. Please sign in.",
        },
      });
    } catch (error) {
      console.error("Registration failed:", error);
      if (error.code === "auth/email-already-in-use") {
        setMsg("That email already has an account. Please Sign In instead.");
      } else if (error.code === "auth/weak-password") {
        setMsg("Password must be at least 6 characters.");
      } else {
        setMsg(error.message || "Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="futuristic-bg min-vh-100 d-flex align-items-center py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-7">
            <div className="future-card future-card-glass p-4 p-md-5 shadow-lg">
              {/* Header */}
              <div className="text-center mb-4">
                <div
                  className="rounded-3 d-inline-flex align-items-center justify-content-center text-white mb-3"
                  style={{
                    width: 52,
                    height: 52,
                    background: "linear-gradient(135deg, #2563eb, #06b6d4)",
                    boxShadow: "0 0 20px rgba(6, 182, 212, 0.4)",
                  }}
                >
                  <i className="bi bi-person-plus fs-3" />
                </div>
                <h2 className="fw-extrabold text-white mb-1">Create Passenger Account</h2>
                <p className="text-muted small">Register for fast e-ticketing and real-time transit access</p>
              </div>

              <Alert message={msg} onClose={() => setMsg("")} />

              <form onSubmit={submit}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="future-label">Full Name *</label>
                    <input
                      name="full_name"
                      className="form-control future-input"
                      required
                      placeholder="Juan Dela Cruz"
                      value={form.full_name}
                      onChange={change}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="future-label">Email Address *</label>
                    <input
                      name="email"
                      type="email"
                      className="form-control future-input"
                      required
                      placeholder="juan@example.com"
                      value={form.email}
                      onChange={change}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="future-label">Contact Number *</label>
                    <input
                      name="phone"
                      className="form-control future-input"
                      required
                      placeholder="09171234567"
                      value={form.phone}
                      onChange={change}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="future-label">Age *</label>
                    <input
                      name="age"
                      type="number"
                      min="1"
                      max="120"
                      className="form-control future-input"
                      required
                      placeholder="25"
                      value={form.age}
                      onChange={change}
                    />
                  </div>

                  <div className="col-12">
                    <label className="future-label">Residential Address *</label>
                    <input
                      name="address"
                      className="form-control future-input"
                      required
                      placeholder="City / Municipality, Province"
                      value={form.address}
                      onChange={change}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="future-label">Password *</label>
                    <div className="position-relative">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        className="form-control future-input pe-5"
                        required
                        placeholder="Min 6 characters"
                        value={form.password}
                        onChange={change}
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute text-muted end-0 top-50 translate-middle-y text-decoration-none pe-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
                      </button>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="future-label">Confirm Password *</label>
                    <input
                      name="confirm_password"
                      type={showPassword ? "text" : "password"}
                      className="form-control future-input"
                      required
                      placeholder="Re-enter password"
                      value={form.confirm_password}
                      onChange={change}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-future btn-future-primary w-100 py-3 mt-4"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-shield-check" />
                      <span>Complete Registration</span>
                    </>
                  )}
                </button>
              </form>

              <div className="text-center mt-4 pt-3 border-top border-white-10 small">
                <span className="text-muted">Already registered? </span>
                <Link to="/login" className="text-cyan text-decoration-none fw-semibold">
                  Sign In here
                </Link>
              </div>

              <div className="text-center mt-2 small">
                <Link to="/" className="text-muted text-decoration-none">
                  ← Return to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
