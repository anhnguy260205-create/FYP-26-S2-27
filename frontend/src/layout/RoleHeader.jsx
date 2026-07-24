import Header from "./Header.jsx";
import GeneralHeader from "./GeneralHeader.jsx";
import { isExpertUser } from "../utils/userRole.js";

function RoleHeader() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "null");

  if (currentUser?.role === "investor" || isExpertUser(currentUser)) return <GeneralHeader />;
  return <Header />;
}

export default RoleHeader;
