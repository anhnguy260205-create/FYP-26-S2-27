import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { logoutOnUnload, refreshSessionUser, getPinStatus, getInvestorInformation } from "../api/userApi";
import ForceAccountSetupModal from "./ForceAccountSetupModal.jsx";
import { splitAddress } from "../utils/countryCodes";

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
  // null = not yet checked. Once checked: needsInfo / needsPin drive the gate.
  const [gate, setGate] = useState(null); // { needsInfo, needsPin, user } | { done:true }

  useEffect(() => {
    if (!currentUser) return;

    window.addEventListener("pagehide", logoutOnUnload);
    return () => window.removeEventListener("pagehide", logoutOnUnload);
  }, [currentUser?.user_id]);

  // Every investor must have complete personal info (full name, phone, country)
  // and a 6-digit transaction PIN. Legacy accounts missing either are forced
  // through a mandatory setup gate before they can use the platform. The
  // first-login setup page already collects both, so it's exempt.
  const onSetupPage =
    typeof window !== "undefined" && window.location.pathname === "/investor/setup";

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
      // Fail open if either check errored (don't lock users out on a hiccup).
      if (!pinRes && !infoRes) { setGate({ done: true }); return; }
      const info = infoRes?.investor_information || {};
      const user = { ...currentUser, ...info };
      const { country } = splitAddress(user.address || "");
      const needsInfo = !(user.full_name && user.phone_number && country);
      const needsPin = pinRes ? pinRes.has_pin !== true : false;
      setGate({ needsInfo, needsPin, user });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.user_id, onSetupPage]);

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

  // Expert-only pages (merged roles). is_expert means VERIFIED expert, so an
  // in-progress applicant (Expert row exists, not yet approved) also needs
  // through here — that's what verification_status being set indicates —
  // to reach the document-upload/knowledge-hub pages during review.
  if (
    requireExpert &&
    !(
      currentUser.is_expert === true ||
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
