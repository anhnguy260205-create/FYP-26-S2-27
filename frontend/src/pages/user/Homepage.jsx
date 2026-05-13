import { useState } from "react";
import { Link } from "react-router-dom";
import RegistrationPage from "./RegistrationPage.jsx";
import Footer from "../../components/Footer.jsx";
import { motion } from "framer-motion";


function Homepage() {

  return (
    <motion.div 
    className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white "
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8 }}
    >
      <Link
        className="px-4 py-2 bg-blue-500 text-white rounded mt-4 self-center"
        to="/register">
        Show Registration Page
      </Link>

      <Footer/>
    </motion.div>
    
    
    
  );
}
export default Homepage;
