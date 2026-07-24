import Header from "./Header.jsx";
import GeneralHeader from "./GeneralHeader.jsx";

function RoleHeader() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "null");

  if (currentUser?.role === "investor" || currentUser?.role === "expert") return <GeneralHeader />;
  return <Header />;
}

export default RoleHeader;
