import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { api } from "../api";
import { ensureFirestoreUser } from "../AuthContext";
import Alert from "../components/Alert";

async function startHemsSession(user) {
  const token = await user.getIdToken(true);
  return api("firebase-login", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: "{}",
  });
}

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState(loc.state?.message || "");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function finishLogin(user) {
    const role = await ensureFirestoreUser(user);
    const session = await startHemsSession(user);
    if (!session.success) console.warn("Transport API synchronization:", session.message);
    nav(role === "admin" ? "/admin" : "/", {
      replace: true,
      state: session.success ? undefined : { dbWarning: "Firebase login succeeded. Start MySQL to use booking data." },
    });
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const credential = await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
      await finishLogin(credential.user);
    } catch (error) {
      const code = error?.code || "";
      if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(code)) setMsg("Invalid email or password.");
      else if (code === "auth/too-many-requests") setMsg("Too many attempts. Please try again later.");
      else setMsg(error?.message || "Firebase login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setMsg("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await finishLogin(result.user);
    } catch (error) {
      if (error.code === "auth/popup-closed-by-user") setMsg("Google sign-in was cancelled.");
      else if (error.code === "auth/popup-blocked") setMsg("Your browser blocked the Google sign-in popup.");
      else if (error.code === "auth/unauthorized-domain") setMsg("Add localhost to Firebase Authentication → Authorized domains.");
      else setMsg(error.message || "Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main className="min-vh-100 bg-light d-flex align-items-center py-4">
      <div className="container"><div className="row justify-content-center"><div className="col-12 col-sm-10 col-md-7 col-lg-5">
        <div className="card border-0 shadow-sm"><div className="card-body p-4 p-md-5">
          <div className="text-center mb-4"><div className="display-5 text-primary"><i className="bi bi-bus-front" /></div><h2 className="fw-bold">Welcome Back</h2><p className="text-secondary">Sign in to Hems Transport Services</p></div>
          <Alert message={msg} />
          <button type="button" className="btn btn-light border w-100 py-2 mb-3" onClick={handleGoogleLogin} disabled={googleLoading || loading}>
            {googleLoading ? <><span className="spinner-border spinner-border-sm me-2" />Signing in...</> : <><i className="bi bi-google me-2" />Continue with Google</>}
          </button>
          <div className="d-flex align-items-center my-3"><hr className="flex-grow-1" /><span className="mx-3 text-secondary small">OR</span><hr className="flex-grow-1" /></div>
          <form onSubmit={submit}>
            <div className="mb-3"><label className="form-label">Email</label><input type="email" className="form-control" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="mb-4"><label className="form-label">Password</label><input type="password" className="form-control" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <button className="btn btn-primary w-100 py-2" disabled={loading || googleLoading}>{loading ? "Signing in..." : "Login"}</button>
          </form>
          <p className="text-center mt-4 mb-0">No account? <Link to="/register">Create one</Link></p>
          <p className="text-center mt-3 mb-0"><Link to="/">← Back to Home</Link></p>
        </div></div>
      </div></div></div>
    </main>
  );
}
