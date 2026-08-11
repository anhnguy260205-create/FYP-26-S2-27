import { Link } from "react-router-dom";
import { useLandingContent } from "../api/contentApi.js";
import { getStoredUser } from "../utils/userRole.js";

// On the public homepage "Features"/"Pricing" scroll to the marketing sections
// (/#features, /#pricing). Once logged in there's no marketing homepage to
// scroll to, so send "Features" to the platform-features section on the
// logged-in dashboard, and "Pricing" to the actual subscription/plans page.
const LOGGED_IN_PRODUCT_LINKS = { "features": "/investor#features", "pricing": "/investor/subscription" };

const linkClass = "text-sm text-slate-400 hover:text-[#00D3F2] transition-colors duration-150";

function FooterLink({ href, children }) {
  if (!href || href === "#") return <a href="#" className={linkClass}>{children}</a>;
  if (href.startsWith("/")) return <Link to={href} className={linkClass}>{children}</Link>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>{children}</a>;
}

const DEFAULT = {
  brand: { title: "Rocket Trading", description: "AI-powered stock market predictions for the modern investor." },
  version: "v1.0.0",
  product: [{ title: "Features", description: "/#features" }, { title: "Pricing", description: "/#pricing" }],
  company: [{ title: "About Us", description: "/about-us" }, { title: "Reviews", description: "/reviews" }],
  resources: [{ title: "GitHub Repository", description: "#" }, { title: "Documentation", description: "#" }, { title: "API Status", description: "#" }],
  contact: [{ title: "kimanh.work26@gmail.com", description: "" }, { title: "Help Center", description: "/support" }, { title: "Terms of Service", description: "/terms-of-service" }, { title: "Privacy Policy", description: "/privacy-policy" }],
};

function Footer() {
  const content = useLandingContent();
  const c = content ?? [];
  const isLoggedIn = !!getStoredUser();

  const brandItem = c.find((x) => x.section === "footer_brand");
  const brand = brandItem ?? DEFAULT.brand;
  const versionItem = c.find((x) => x.content_id === "footer_version");
  const version = versionItem?.title ?? DEFAULT.version;
  const productItems = c.filter((x) => x.section === "footer_product");
  const product = productItems.length ? productItems : DEFAULT.product;
  const companyItems = c.filter((x) => x.section === "footer_company");
  const company = companyItems.length ? companyItems : DEFAULT.company;
  const resourcesItems = c.filter((x) => x.section === "footer_resources");
  const resources = resourcesItems.length ? resourcesItems : DEFAULT.resources;
  const contactItems = c.filter((x) => x.section === "footer_contact");
  const contact = contactItems.length ? contactItems : DEFAULT.contact;

  return (
    <footer className="border-t border-white/10 bg-slate-950">
      <div className="max-w-300 mx-auto px-6 lg:px-8 py-14 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12 mb-10">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white tracking-tight">
                {brand.title}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 bg-white/5 rounded-full px-2 py-0.5">
                {version}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed max-w-xs">{brand.description}</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Product</h4>
            <ul className="space-y-2.5">
              {product.map((item) => {
                const override = isLoggedIn
                  ? LOGGED_IN_PRODUCT_LINKS[String(item.title).trim().toLowerCase()]
                  : null;
                return (
                  <li key={item.content_id ?? item.title}>
                    <FooterLink href={override ?? item.description}>{item.title}</FooterLink>
                  </li>
                );
              })}
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
