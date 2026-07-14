import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const linkClass = "text-sm text-slate-400 hover:text-[#00D3F2] transition-colors duration-150";

function FooterLink({ href, children }) {
  if (!href || href === "#") return <a href="#" className={linkClass}>{children}</a>;
  if (href.startsWith("/")) return <Link to={href} className={linkClass}>{children}</Link>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>{children}</a>;
}

// Static, CMS-independent — always shown regardless of what /content/landing returns.
const RESOURCES = [
  { title: "GitHub Repository", href: "#" },
  { title: "Documentation", href: "#" },
  { title: "API Status", href: "#" },
];
const APP_VERSION = "v1.0.0";

const DEFAULT = {
  brand: { title: "Rocket Trading", description: "AI-powered stock market predictions for the modern investor." },
  product: [{ title: "Features", description: "#" }, { title: "Pricing", description: "/investor/subscription" }],
  company: [{ title: "About Us", description: "#" }, { title: "Careers", description: "#" }, { title: "Blog", description: "#" }, { title: "Press", description: "#" }, { title: "Reviews", description: "/reviews" }],
  contact: [{ title: "support@deskstock.ai", description: "" }, { title: "Help Center", description: "#" }, { title: "Terms of Service", description: "#" }, { title: "Privacy Policy", description: "#" }],
};

function Footer() {
  const [brand, setBrand] = useState(DEFAULT.brand);
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
      .catch(() => { });
  }, []);

  return (
    <footer className="border-t border-white/10 bg-slate-950/50 backdrop-blur-md">
      <div className="max-w-300 mx-auto px-6 lg:px-8 py-14 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-10 md:gap-12 mb-10">

          {/* Brand */}
          <div className="sm:col-span-2 xl:col-span-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white tracking-tight">
                {brand.title}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 bg-white/5 rounded-full px-2 py-0.5">
                {APP_VERSION}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed max-w-xs">{brand.description}</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Product</h4>
            <ul className="space-y-2.5">
              {product.map((item) => (
                <li key={item.content_id ?? item.title}>
                  <FooterLink href={item.description}>{item.title}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Company</h4>
            <ul className="space-y-2.5">
              {company.map((item) => (
                <li key={item.content_id ?? item.title}>
                  <FooterLink href={item.description}>{item.title}</FooterLink>
                </li>
              ))}
              {/* Reviews — always shown regardless of CMS content */}
              <li>
                <FooterLink href="/reviews">Reviews</FooterLink>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Resources</h4>
            <ul className="space-y-2.5">
              {RESOURCES.map((item) => (
                <li key={item.title}>
                  <FooterLink href={item.href}>{item.title}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Resources</h4>
            <ul className="space-y-2.5">
              {RESOURCES.map((item) => (
                <li key={item.title}>
                  <FooterLink href={item.href}>{item.title}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Contact</h4>
            <ul className="space-y-2.5">
              {contact.map((item) => (
                <li key={item.content_id ?? item.title}>
                  {!item.description || item.description === "" ? (
                    <span className="text-sm text-slate-400">{item.title}</span>
                  ) : (
                    <FooterLink href={item.description}>{item.title}</FooterLink>
                  )}
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} {brand.title}. All rights reserved.</p>
          <p className="text-xs text-slate-600">Paper trading platform — not real-money investment advice.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
