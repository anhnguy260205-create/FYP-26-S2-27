import { useNavigate } from "react-router-dom";
function DropDownMenu(){
    const navigate = useNavigate();
    return (
    <div className="absolute right-0 mt-3 w-52 bg-slate-900/95 backdrop-blur-md border border-cyan-500/20 rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible
                     group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 ">
       <button onClick={() => navigate("/edit-profile")} className="w-full text-left px-5 py-3 text-gray-300 hover:bg-white/5 hover:text-cyan-400" >
         Edit Profile
       </button>

       <button onClick={() => navigate("/settings")} className="w-full text-left px-5 py-3 text-gray-300 hover:bg-white/5 hover:text-cyan-400">
          Settings
       </button>

       <button onClick={() => navigate("/logout")} className="w-full text-left px-5 py-3 text-red-400 hover:bg-red-500/10">
          Logout
       </button>
     </div>);
    }
function Profile(){
    return(
        // Connect backend later
        <button onClick={() => navigate("/edit-profile")}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                style={{ height: "41px", padding: "0 16px", color: "#00D3F2", fontSize: "14px", fontWeight: 600, gap: "8px",}}>
        <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "linear-gradient(135deg, #0092b8, #155dfc)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        Kim Anh
      </button>
      );}
function ProfileButton(){
    return(
         <div className="relative group">
           <Profile/>
           <DropDownMenu/>
         </div>
    );
}
function GeneralHeader(){
    return(
    <div className="w-full bg-white flex items-center justify-between shrink-0 sticky top-0 z-50"
             style={{ height: "50px", borderBottom: "0.667px solid rgba(28,57,142,0.3)", padding: "0 32px" }}>
 
      <div className="flex items-center gap-2 cursor-pointer" >
    
        <span
          className="font-bold text-[20px] bg-clip-text text-transparent whitespace-nowrap"
          style={{ backgroundImage: "linear-gradient(90deg, rgb(0,211,243) 0%, rgb(81,162,255) 100%)" }}
        >
          Deskstock
        </span>
      </div>

      <div className="flex items-center gap-8">
        {[
         {label: "DashBoard", gradient: "linear-gradient(174.615deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
                              submenu: [{ title: "Watchlist Management" },
                                        { title: "Real-time Dashboard" },],},

         {label: "AI Prediction", gradient: "linear-gradient(174.615deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",},

         {label: "Knowledge Hub", gradient: "linear-gradient(174.615deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
                                  submenu: [{ title: "Educational Content" },
                                            { title: "Expert Advice" },
                                            { title: "AI Chatbot" },],},

         {label: "Community", gradient: "linear-gradient(173.863deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",},

         {label: "Transactions", gradient: "linear-gradient(173.863deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
                                 submenu: [{ title: "Trading Portal" },
                                           { title: "Transaction History" },],},
          ].map((link) => (
    
             <div key={link.label} className="relative group">
      
               {/* Main Nav */}
               <a href="#" className=" font-bold text-[16px] bg-clip-text text-transparent leading-6 whitespace-nowrap hover:opacity-70 transition-opacity" style={{ backgroundImage: link.gradient }}>
                  {link.label}
               </a>

               {/* Dropdown */}
               {link.submenu && (
                <div className=" absolute top-full left-0 mt-3 w-56 bg-slate-900/95 backdrop-blur-md border border-cyan-500/20 rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100
                                 group-hover:visible transition-all duration-300 z-50">
                {link.submenu.map((item) => (
                <button key={item.title} className=" w-full text-left px-5 py-3 text-gray-300 hover:bg-white/5 hover:text-cyan-400 transition-all" >
                 {item.title}
                </button>
          ))}
         </div>
         )}
        </div>
         ))}
      </div>
      <div className="flex items-center gap-8">
         <ProfileButton/>
      </div>
    </div>
    );
}
export default GeneralHeader; 