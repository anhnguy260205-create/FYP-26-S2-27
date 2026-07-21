import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { logoutOnUnload, refreshSessionUser } from "../api/userApi";

function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem("currentUser") || "null");
  } catch {
    sessionStorage.removeItem("currentUser");
    return null;
  }
}

function ProtectedRoute({ allowedRoles, requireExpert = false, children }) {
  const [currentUser, setCurrentUser] = useState(getCurrentUser);

  useEffect(() => {
    if (!currentUser) return;

    window.addEventListener("pagehide", logoutOnUnload);
    return () => window.removeEventListener("pagehide", logoutOnUnload);
  }, [currentUser?.user_id]);

  // Re-validate against the backend on every protected navigation —
  // sessionStorage is otherwise only refreshed at login, so an admin-side
  // change (e.g. cancelling an expert's verification) wouldn't be reflected
  // until the user logged out and back in.
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    refreshSessionUser().then((fresh) => {
      if (!cancelled && fresh) setCurrentUser(fresh);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
