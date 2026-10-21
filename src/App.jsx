import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Booking from "./pages/Booking";
import Bookings from "./pages/Bookings";
import Receipt from "./pages/Receipt";
import Verify from "./pages/Verify";
import AdminDashboard from "./pages/AdminDashboard";
import OfflineIndicator from "./components/OfflineIndicator";

function Loading() {
  return (
    <div className="futuristic-bg min-vh-100 d-flex align-items-center justify-content-center py-5">
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" style={{ width: "3rem", height: "3rem" }} />
        <div className="text-muted small">Loading Hems Transit OS...</div>
      </div>
    </div>
  );
}

function UserRoute({ children }) {
  const { loading, isAdmin } = useAuth();
  if (loading) return <Loading />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <><Navbar /><OfflineIndicator />{children}</>;
}

function CustomerRoute({ children }) {
  const { loading, firebaseUser, isAdmin } = useAuth();
  if (loading) return <Loading />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <><Navbar /><OfflineIndicator />{children}</>;
}

function AdminRoute() {
  const { loading, firebaseUser, isAdmin } = useAuth();
  if (loading) return <Loading />;
  if (!firebaseUser) return <Navigate to="/login" replace state={{ from: "/admin" }} />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <><AdminDashboard /><OfflineIndicator /></>;
}

function AppRoutes() {
  return <Routes>
    <Route path="/" element={<UserRoute><Home /></UserRoute>} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/booking" element={<CustomerRoute><Booking /></CustomerRoute>} />
    <Route path="/bookings" element={<CustomerRoute><Bookings /></CustomerRoute>} />
    <Route path="/receipt" element={<UserRoute><Receipt /></UserRoute>} />
    <Route path="/verify" element={<UserRoute><Verify /></UserRoute>} />
    <Route path="/admin" element={<AdminRoute />} />
    <Route path="/admin/login" element={<Navigate to="/login" replace state={{ from: "/admin" }} />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
