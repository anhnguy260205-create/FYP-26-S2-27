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

function ProtectedRoute({ allowedRoles, requireExpert = false, children }) {
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

  // Expert-only pages (merged roles): investors with the is_expert flag.
  if (requireExpert && !(currentUser.is_expert === true || currentUser.role === "expert")) {
    return <Navigate to="/investor" replace />;
  }

  return children;
}

export default ProtectedRoute;
