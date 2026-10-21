import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { api } from "./api";

const AuthContext = createContext(null);

// Admin accounts. Strictly "admin" and "user" roles only.
const ADMIN_EMAILS = [
  "hemuelibabao@gmail.com",
  "ibabaohemuel@gmail.com",
  "admin@hems.ph",
];

// Resolves user role strictly as "admin" or "user" from Firestore.
// If Firestore is restricted by security rules, correctly recognizes the admin account.
export async function resolveFirestoreRole(user) {
  if (!user) return "user";
  const email = String(user.email || "").trim().toLowerCase();
  const uid = user.uid;
  const isRegisteredAdmin = email && ADMIN_EMAILS.includes(email);

  try {
    // 1. Check doc by UID: users/{UID}
    const uidRef = doc(db, "users", uid);
    const uidSnap = await getDoc(uidRef);
    if (uidSnap.exists()) {
      const data = uidSnap.data();
      const role = String(data.role || "").trim().toLowerCase();
      if (role === "admin") return "admin";
      if (role === "user") return "user";
    }

    // 2. Check doc by Email: users/{email}
    if (email) {
      const emailRef = doc(db, "users", email);
      const emailSnap = await getDoc(emailRef);
      if (emailSnap.exists()) {
        const data = emailSnap.data();
        const role = String(data.role || "").trim().toLowerCase();
        if (role === "admin") return "admin";
        if (role === "user") return "user";
      }
    }
  } catch (err) {
    console.warn("Firestore role check encountered restriction:", err?.message);
  }

  return isRegisteredAdmin ? "admin" : "user";
}

// Automatically creates/synchronizes users/{Firebase UID}.
// Strictly "admin" or "user" role.
export async function ensureFirestoreUser(user) {
  if (!user) return "user";
  try {
    const role = await resolveFirestoreRole(user);
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref).catch(() => null);
    const existing = snap && snap.exists() ? snap.data() : {};
    const provider = user.providerData?.[0]?.providerId || "password";

    const profile = {
      uid: user.uid,
      name: user.displayName || existing.name || existing.displayName || "",
      email: user.email || existing.email || "",
      photoURL: user.photoURL || existing.photoURL || "",
      provider,
      role,
    };

    if (!snap || !snap.exists()) {
      await setDoc(ref, { ...profile, createdAt: serverTimestamp() }).catch(() => {});
    } else {
      await setDoc(ref, profile, { merge: true }).catch(() => {});
    }
    return role;
  } catch (err) {
    console.warn("Firestore profile sync bypassed:", err?.message);
    const email = String(user.email || "").trim().toLowerCase();
    return ADMIN_EMAILS.includes(email) ? "admin" : "user";
  }
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [role, setRole] = useState(null);
  const [sessionUser, setSessionUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!alive) return;

      if (!currentUser) {
        setFirebaseUser(null);
        setRole(null);
        setSessionUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const firestoreRole = await resolveFirestoreRole(currentUser);
        ensureFirestoreUser(currentUser).catch(() => {});

        const token = await currentUser.getIdToken();
        const session = await api("firebase-login", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ clientRole: firestoreRole }),
        });

        const effectiveRole = (session.role === "ADMIN" || firestoreRole === "admin") ? "admin" : "user";

        if (alive) {
          setFirebaseUser(currentUser);
          setRole(effectiveRole);
          if (session.success) setSessionUser(session.user || null);
        }
      } catch (error) {
        console.error("Firebase auth/role initialization error:", error);
        if (alive) {
          const email = String(currentUser.email || "").trim().toLowerCase();
          const fallback = ADMIN_EMAILS.includes(email) ? "admin" : "user";
          setFirebaseUser(currentUser);
          setRole(fallback);
        }
      } finally {
        if (alive) setLoading(false);
      }
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  async function logout() {
    await api("logout", { method: "POST", body: "{}" }).catch(() => {});
    await signOut(auth).catch(() => {});
    setFirebaseUser(null);
    setRole(null);
    setSessionUser(null);
  }

  const value = useMemo(
    () => ({
      firebaseUser,
      sessionUser,
      role,
      loading,
      isAdmin: role === "admin",
      logout,
      refreshSession: async () => {
        const me = await api("me");
        setSessionUser(me.success ? me.user : null);
        return me.success ? me.user : null;
      },
    }),
    [firebaseUser, sessionUser, role, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
