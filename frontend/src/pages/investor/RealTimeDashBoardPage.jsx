import GeneralHeader from"../../components/GeneralHeader.jsx"
import Footer from "../../components/Footer.jsx";
import { motion } from "framer-motion";
import LiveStocks from "../../api/LiveStocks.jsx";
import { useState } from "react";

function SearchBar({posts}){
  const [inputValue,setInputValue]= useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) );
  return(
    <div>
      <div className="flex items-center gap-3 pt-5">
         {/* Search Input */}
        <div className="relative flex-1">

          <input type="text" placeholder="Search posts..." value={inputValue}
                 onChange={(e) => setInputValue(e.target.value)}
                 className=" w-full h-10 pl-12 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 outline-none"/>

          {/* Search Icon */}
          <svg className="absolute left-4 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>

       {/* Search Button */}
        <button type="button" onClick={() => setSearchQuery(inputValue)}  className=" px-6 h-10 text-white font-semibold text-[16px] rounded-[14px] hover:opacity-90 active:scale-[0.99] transition-all whitespace-nowrap"
                style={{ background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)",
        }} >
           Search
        </button>
      </div>    
      {/*Posts*/}
      {filteredPosts.length > 0 ? (
        filteredPosts.map((post) => (
        <div key={post.id}>
           {post.title}
        </div>
        ))

       ) : (
       <div className="text-gray-400 mt-4">
          No stock found.
       </div>
        )}
    </div>
  );
}



function RealTimeDashBoardPage(){
    const posts = [
      {
        id:1, title: "Apple Stock Analysis"
      }
    ]
    return(
        <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white "
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <GeneralHeader/>
            <main className="flex-1 p-7.5">
              <div style ={{padding: "10px"}}>
              
              <h1>
                Real-Time DashBoard
              </h1>
              <SearchBar posts={posts} />

              <LiveStocks/>
            </div>
            </main>
            <Footer/>
        </motion.div>
    );
}
export default RealTimeDashBoardPage; 