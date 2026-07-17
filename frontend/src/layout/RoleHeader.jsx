import Header from "./Header.jsx";
import GeneralHeader from "./GeneralHeader.jsx";
import ExpertHeader from "./ExpertHeader.jsx";

function RoleHeader() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "null");

  if (currentUser?.role === "investor") return <GeneralHeader />;
  if (currentUser?.role === "expert") return <ExpertHeader />;
  return <Header />;
}

export default RoleHeader;
