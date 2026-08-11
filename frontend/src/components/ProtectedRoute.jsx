import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { logoutOnUnload, refreshSessionUser, getPinStatus, getInvestorInformation } from "../api/userApi";
import ForceAccountSetupModal from "./ForceAccountSetupModal.jsx";
import { splitAddress } from "../utils/countryCodes";
import { isExpertUser } from "../utils/userRole.js";

function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem("currentUser") || localStorage.getItem("currentUser") || "null");
  } catch {
    sessionStorage.removeItem("currentUser");
    return null;
  }
}

function ProtectedRoute({ allowedRoles, requireExpert = false, children }) {
  const [currentUser, setCurrentUser] = useState(getCurrentUser);
  const [gate, setGate] = useState(null); // { needsInfo, needsPin, user } | { done:true }
  const location = useLocation();

  useEffect(() => {
    if (!currentUser) return;

    window.addEventListener("pagehide", logoutOnUnload);
    return () => window.removeEventListener("pagehide", logoutOnUnload);
  }, [currentUser?.user_id]);

  // Every investor must have complete personal info and a 6-digit transaction PIN.
  // The first-login setup page is exempt because it collects those details.
  const onSetupPage = location.pathname === "/investor/setup";

  useEffect(() => {
    if (!currentUser || currentUser.role !== "investor" || onSetupPage) {
      setGate({ done: true });
      return;
    }

    let cancelled = false;
    Promise.all([
      getPinStatus().catch(() => null),
      getInvestorInformation(currentUser.user_id).catch(() => null),
    ]).then(([pinRes, infoRes]) => {
      if (cancelled) return;
      // Fail open if either check errored, so a temporary API issue does not lock users out.
      if (!pinRes && !infoRes) {
        setGate({ done: true });
        return;
      }

      const info = infoRes?.investor_information || {};
      const user = { ...currentUser, ...info };
      const { country } = splitAddress(user.address || "");
      const needsInfo = infoRes ? !(user.full_name && user.phone_number && country) : false;
      const needsPin = pinRes ? pinRes.has_pin !== true : false;
      setGate({ needsInfo, needsPin, user });
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.user_id, currentUser?.role, onSetupPage]);

  // Re-validate against the backend on protected navigation so role/subscription
  // changes made by admins are reflected without requiring a full logout/login.
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
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  // Expert-only pages support both the merged-role flow and old expert-role accounts.
  if (
    requireExpert &&
    !(
      isExpertUser(currentUser) ||
      currentUser.role === "expert" ||
      currentUser.verification_status != null
    )
  ) {
    return <Navigate to="/investor" replace />;
  }

  const gateOpen = Boolean(gate && !gate.done && (gate.needsInfo || gate.needsPin));

  return (
    <>
      {children}
      {gateOpen && (
        <ForceAccountSetupModal
          open
          needsInfo={gate.needsInfo}
          needsPin={gate.needsPin}
          user={gate.user}
          onDone={() => setGate({ done: true })}
        />
      )}
    </>
  );
}

export default ProtectedRoute;
