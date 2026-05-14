function Header(){
    return(
        <div
      className="w-full bg-white flex items-center justify-between shrink-0 sticky top-0 z-50"
      style={{ height: "50px", borderBottom: "0.667px solid rgba(28,57,142,0.3)", padding: "0 32px" }}
    >
 
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
          { label: "Support", gradient: "linear-gradient(173.863deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)" },
          { label: "About Us", gradient: "linear-gradient(174.615deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)" },
        ].map((link) => (
          <a
            key={link.label}
            href="#"
            className="font-bold text-[16px] bg-clip-text text-transparent leading-6 whitespace-nowrap hover:opacity-70 transition-opacity"
            style={{ backgroundImage: link.gradient }}
          >
            {link.label}
          </a>
        ))}
      </div>

   
    </div>
    );
}
export default Header;