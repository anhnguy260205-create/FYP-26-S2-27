import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { logoutOnUnload } from "../api/userApi";

function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem("currentUser") || "null");
  } catch {
    sessionStorage.removeItem("currentUser");
    return null;
  }
}

function ProtectedRoute({ allowedRoles, children }) {
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!currentUser) return;

    window.addEventListener("pagehide", logoutOnUnload);
    return () => window.removeEventListener("pagehide", logoutOnUnload);
  }, [currentUser?.user_id]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
