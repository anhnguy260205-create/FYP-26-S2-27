import { useState } from "react";
import {Link} from "react-router-dom";
import RegistrationPage from "./RegistrationPage.jsx";
import Footer from "../../components/Footer.jsx";



function Homepage() {

  return (

    <div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white ">
      <Link
        className="px-4 py-2 bg-blue-500 text-white rounded mt-4 self-center"
        to="/register">
    
        Show Registration Page
      </Link>

      <Footer/>
    </div>
    
    
    
  );
}
export default Homepage;
