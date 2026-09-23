import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
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

    setLoading(true);

    try {
      const credential =
        await createUserWithEmailAndPassword(
          auth,
          form.email.trim(),
          form.password
        );

      await updateProfile(credential.user, {
        displayName: form.full_name.trim(),
      });

      await ensureFirestoreUser(credential.user);

      // Profile/application details are data, so they are synchronized to MySQL.
      // If MySQL is temporarily down, the Firebase account remains valid and the
      // next login can perform the MySQL synchronization again.
      const idToken =
        await credential.user.getIdToken(true);

      const r = await api("register-profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          age: form.age,
        }),
      });

      if (!r.success) {
        console.warn(
          "MySQL profile synchronization:",
          r.message
        );
      }

      nav("/login", {
        state: {
          message: r.success
            ? "Account created. You can now sign in with Firebase."
            : "Firebase account created. Start MySQL in XAMPP before using transport data, then sign in.",
        },
      });
    } catch (error) {
      console.error("Registration failed:", error);

      if (error.code === "auth/email-already-in-use") {
        setMsg(
          "That email already has a Firebase account. Try Login instead."
        );
      } else if (error.code === "auth/weak-password") {
        setMsg("Password must be at least 6 characters.");
      } else {
        setMsg(
          error.message || "Registration failed."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-vh-100 bg-light py-4 d-flex align-items-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-9 col-lg-7">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4 p-md-5">
                <h2 className="fw-bold">
                  Create Account
                </h2>

                <p className="text-secondary">
                  Register for online bus booking.
                </p>

                <Alert message={msg} />

                <form onSubmit={submit}>
                  <div className="row g-3">
                    {[
                      "full_name",
                      "email",
                      "phone",
                      "address",
                      "age",
                      "password",
                      "confirm_password",
                    ].map((name) => (
                      <div
                        key={name}
                        className={
                          name === "address"
                            ? "col-12"
                            : name === "full_name"
                            ? "col-12"
                            : "col-md-6"
                        }
                      >
                        <label className="form-label">
                          {
                            {
                              full_name: "Full Name",
                              email: "Email",
                              phone: "Phone Number",
                              address: "Address",
                              age: "Age",
                              password: "Password",
                              confirm_password:
                                "Confirm Password",
                            }[name]
                          }
                        </label>

                        <input
                          name={name}
                          className="form-control"
                          type={
                            name === "email"
                              ? "email"
                              : name.includes("password")
                              ? "password"
                              : name === "age"
                              ? "number"
                              : "text"
                          }
                          min={
                            name === "age"
                              ? 1
                              : undefined
                          }
                          max={
                            name === "age"
                              ? 120
                              : undefined
                          }
                          minLength={
                            name.includes("password")
                              ? 6
                              : undefined
                          }
                          required
                          value={form[name]}
                          onChange={change}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    className="btn btn-primary w-100 mt-4 py-2"
                    disabled={loading}
                  >
                    {loading
                      ? "Creating Firebase account..."
                      : "Register"}
                  </button>
                </form>

                <p className="text-center mt-4 mb-0">
                  Already registered?{" "}
                  <Link to="/login">Login</Link>
                </p>

                <p className="text-center mt-3 mb-0">
                  <Link to="/">
                    ← Back to Home
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}