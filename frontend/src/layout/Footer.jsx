import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const linkClass = "text-gray-400 hover:text-cyan-400 transition-colors";

function FooterLink({ href, children }) {
  if (!href || href === "#") return <a href="#" className={linkClass}>{children}</a>;
  if (href.startsWith("/")) return <Link to={href} className={linkClass}>{children}</Link>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>{children}</a>;
}

const DEFAULT = {
  brand:   { title: "Rocket Trading", description: "AI-powered stock market predictions for the modern investor." },
  product: [{ title: "Features", description: "#" }, { title: "Pricing", description: "#" }],
  company: [{ title: "About Us", description: "#" }, { title: "Careers", description: "#" }, { title: "Blog", description: "#" }, { title: "Press", description: "#" }],
  contact: [{ title: "support@deskstock.ai", description: "" }, { title: "Help Center", description: "#" }, { title: "Terms of Service", description: "#" }, { title: "Privacy Policy", description: "#" }],
};

function Footer() {
  const [brand,   setBrand]   = useState(DEFAULT.brand);
  const [product, setProduct] = useState(DEFAULT.product);
  const [company, setCompany] = useState(DEFAULT.company);
  const [contact, setContact] = useState(DEFAULT.contact);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/content/landing`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        const c = data.content;
        const brandItem = c.find((x) => x.section === "footer_brand");
        if (brandItem) setBrand(brandItem);
        const productItems = c.filter((x) => x.section === "footer_product");
        if (productItems.length) setProduct(productItems);
        const companyItems = c.filter((x) => x.section === "footer_company");
        if (companyItems.length) setCompany(companyItems);
        const contactItems = c.filter((x) => x.section === "footer_contact");
        if (contactItems.length) setContact(contactItems);
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="border-t border-blue-900/30 bg-slate-950/50 backdrop-blur-md mt-10">
      <div className="max-w-300 mx-auto px-8 py-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

          {/* Brand */}
          <div>
            <span className="text-xl font-bold bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {brand.title}
            </span>
            <p className="text-gray-400 mt-4">{brand.description}</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-bold mb-4 text-white">Product</h4>
            <ul className="space-y-2">
              {product.map((item) => (
                <li key={item.content_id ?? item.title}>
                  <FooterLink href={item.description}>{item.title}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-bold mb-4 text-white">Company</h4>
            <ul className="space-y-2">
              {company.map((item) => (
                <li key={item.content_id ?? item.title}>
                  <FooterLink href={item.description}>{item.title}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold mb-4 text-white">Contact</h4>
            <ul className="space-y-2">
              {contact.map((item) => (
                <li key={item.content_id ?? item.title}>
                  {!item.description || item.description === "" ? (
                    <span className="text-gray-400">{item.title}</span>
                  ) : (
                    <FooterLink href={item.description}>{item.title}</FooterLink>
                  )}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </footer>
  );
}

export default Footer;
