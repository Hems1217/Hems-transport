import React, { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useAuth } from "../AuthContext";
import Alert from "../components/Alert";

export default function Login() {
  const loc = useLocation();
  const { firebaseUser, isAdmin, loading } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState(loc.state?.message || "");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // If user is already authenticated and loading is complete, redirect cleanly to their role portal
  if (!loading && firebaseUser) {
    return <Navigate to={isAdmin ? "/admin" : "/"} replace />;
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    try {
      await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
      // AuthProvider's onAuthStateChanged will synchronize the Firestore role and redirect cleanly.
    } catch (error) {
      const code = error?.code || "";
      if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(code)) {
        setMsg("Invalid email or password.");
      } else if (code === "auth/too-many-requests") {
        setMsg("Too many attempts. Please try again later.");
      } else {
        setMsg(error?.message || "Firebase login failed.");
      }
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setMsg("");
    try {
      await signInWithPopup(auth, googleProvider);
      // AuthProvider's onAuthStateChanged will synchronize the Firestore role and redirect cleanly.
    } catch (error) {
      if (error.code === "auth/popup-closed-by-user") setMsg("Google sign-in was cancelled.");
      else if (error.code === "auth/popup-blocked") setMsg("Your browser blocked the Google sign-in popup.");
      else if (error.code === "auth/unauthorized-domain") setMsg(`Add "${window.location.hostname}" to Firebase Authentication → Settings → Authorized domains.`);
      else setMsg(error.message || "Google sign-in failed.");
      setGoogleLoading(false);
    }
  }

  const isBusy = loading || googleLoading || submitting;

  return (
    <main className="futuristic-bg min-vh-100 d-flex align-items-center py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-7 col-lg-5">
            <div className="future-card future-card-glass p-4 p-md-5 shadow-lg">
              {/* Logo & Headline */}
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
                  <i className="bi bi-bus-front fs-3" />
                </div>
                <h2 className="fw-extrabold text-white mb-1">Transit OS Sign In</h2>
                <p className="text-muted small">Access your Hems Transport boarding passes & tickets</p>
              </div>

              <Alert message={msg} onClose={() => setMsg("")} />

              {/* Google Sign In */}
              <button
                type="button"
                className="btn-future btn-future-outline w-100 py-2 mb-3"
                onClick={handleGoogleLogin}
                disabled={isBusy}
              >
                {googleLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Connecting to Google...
                  </>
                ) : (
                  <>
                    <i className="bi bi-google text-danger me-2" />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <div className="d-flex align-items-center my-3">
                <hr className="flex-grow-1 border-white-10" />
                <span className="mx-3 text-muted small text-uppercase" style={{ fontSize: "0.7rem", letterSpacing: "0.08em" }}>
                  Or with email
                </span>
                <hr className="flex-grow-1 border-white-10" />
              </div>

              {/* Credentials Form */}
              <form onSubmit={submit}>
                <div className="mb-3">
                  <label className="future-label">Email Address</label>
                  <div className="position-relative">
                    <input
                      type="email"
                      className="form-control future-input"
                      placeholder="name@example.com"
                      required
                      value={form.email}
                      disabled={isBusy}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="future-label">Password</label>
                  <div className="position-relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control future-input pe-5"
                      placeholder="••••••••"
                      required
                      value={form.password}
                      disabled={isBusy}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
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

                <button
                  type="submit"
                  className="btn-future btn-future-primary w-100 py-3"
                  disabled={isBusy}
                >
                  {submitting || (loading && firebaseUser) ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Authenticating & Verifying Role...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right" />
                      <span>Sign In</span>
                    </>
                  )}
                </button>
              </form>

              <div className="text-center mt-4 pt-3 border-top border-white-10 small">
                <span className="text-muted">Don't have an account? </span>
                <Link to="/register" className="text-cyan text-decoration-none fw-semibold">
                  Register here
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
