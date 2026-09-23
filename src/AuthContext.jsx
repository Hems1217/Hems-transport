import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { api } from "./api";

const AuthContext = createContext(null);

// Automatically creates/synchronizes users/{Firebase UID}.
// The role is deliberately lowercase so the Firestore document matches the
// professor requirements: "user" by default, or "admin" when edited in Firestore.
export async function ensureFirestoreUser(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : {};
  const role = String(existing.role || "user").toLowerCase() === "admin" ? "admin" : "user";
  const provider = user.providerData?.[0]?.providerId || "password";

  const profile = {
    uid: user.uid,
    name: user.displayName || existing.name || existing.displayName || "",
    email: user.email || existing.email || "",
    photoURL: user.photoURL || existing.photoURL || "",
    provider,
    role,
  };

  if (!snap.exists()) {
    await setDoc(ref, { ...profile, createdAt: serverTimestamp() });
  } else {
    // Do not overwrite an administrator's role from the client.
    await setDoc(ref, profile, { merge: true });
  }

  return role;
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
      setFirebaseUser(currentUser);

      if (!currentUser) {
        setRole(null);
        setSessionUser(null);
        setLoading(false);
        return;
      }

      try {
        const firestoreRole = await ensureFirestoreUser(currentUser);
        if (alive) setRole(firestoreRole);

        // Send the Firebase ID token to Express. Express uses it to identify
        // the Firebase account and read the Firestore role before DB actions.
        const token = await currentUser.getIdToken();
        const session = await api("firebase-login", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: "{}",
        });
        if (alive && session.success) setSessionUser(session.user || null);
      } catch (error) {
        console.error("Firebase auth/role initialization:", error);
        // Keep Firebase login available even if the transport API is offline.
        if (alive && !role) setRole("user");
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
