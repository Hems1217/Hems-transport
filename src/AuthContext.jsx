import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import { api } from "./api";

const AuthContext = createContext(null);

function normalizeRole(rawRole) {
  return String(rawRole || "").trim().toLowerCase() === "admin" ? "admin" : "user";
}

// Resolves user role strictly as "admin" or "user" from Firestore.
export async function resolveFirestoreRole(user) {
  if (!user) return "user";
  const email = String(user.email || "").trim().toLowerCase();
  const uid = user.uid;

  try {
    // 1. Check doc by UID: users/{UID}
    const uidRef = doc(db, "users", uid);
    const uidSnap = await getDoc(uidRef);
    if (uidSnap.exists()) {
      const data = uidSnap.data();
      if (data?.role) return normalizeRole(data.role);
    }

    // 2. Check doc by Email: users/{email}
    if (email) {
      const emailRef = doc(db, "users", email);
      const emailSnap = await getDoc(emailRef);
      if (emailSnap.exists()) {
        const data = emailSnap.data();
        if (data?.role) return normalizeRole(data.role);
      }
    }

    // 3. Query users collection by email field
    if (user.email) {
      const q = query(collection(db, "users"), where("email", "==", user.email), limit(5));
      const querySnap = await getDocs(q);
      for (const d of querySnap.docs) {
        const data = d.data();
        if (data?.role) return normalizeRole(data.role);
      }
    }
  } catch (err) {
    console.warn("Firestore role check encountered restriction:", err?.message);
  }

  return "user";
}

// Automatically creates/synchronizes users/{Firebase UID}.
// Strictly "admin" or "user" role without overwriting an existing Firestore role.
export async function ensureFirestoreUser(user, resolvedRole = "user") {
  if (!user) return "user";
  const safeRole = resolvedRole === "admin" ? "admin" : "user";
  try {
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
    };

    if (!snap || !snap.exists()) {
      await setDoc(ref, { ...profile, role: safeRole, createdAt: serverTimestamp() }).catch(() => {});
      return safeRole;
    }

    if (!existing.role) {
      profile.role = safeRole;
    }
    await setDoc(ref, profile, { merge: true }).catch(() => {});
    return existing.role ? normalizeRole(existing.role) : safeRole;
  } catch (err) {
    console.warn("Firestore profile sync bypassed:", err?.message);
    return safeRole;
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
        ensureFirestoreUser(currentUser, firestoreRole).catch(() => {});

        const token = await currentUser.getIdToken();
        const session = await api("firebase-login", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ clientRole: firestoreRole }),
        });

        const effectiveRole = firestoreRole === "admin" ? "admin" : "user";

        if (alive) {
          setFirebaseUser(currentUser);
          setRole(effectiveRole);
          if (session.success) setSessionUser(session.user || null);
        }
      } catch (error) {
        console.error("Firebase auth/role initialization error:", error);
        if (alive) {
          setFirebaseUser(currentUser);
          setRole("user");
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
