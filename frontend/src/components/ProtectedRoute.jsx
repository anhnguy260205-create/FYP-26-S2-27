import { Navigate } from "react-router-dom";
import ChatWidget from "./chat/ChatWidget.jsx";

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

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {children}
      {currentUser.role === "investor" && <ChatWidget />}
    </>
  );
}

export default ProtectedRoute;
