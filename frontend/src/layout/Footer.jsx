import { Link } from "react-router-dom";
import { useLandingContent } from "../api/contentApi.js";

const linkClass = "text-sm text-slate-400 hover:text-[#00D3F2] transition-colors duration-150";

function FooterLink({ href, children }) {
  if (!href || href === "#") return <a href="#" className={linkClass}>{children}</a>;
  if (href.startsWith("/")) return <Link to={href} className={linkClass}>{children}</Link>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>{children}</a>;
}

const DEFAULT = {
  brand: { title: "Rocket Trading", description: "AI-powered stock market predictions for the modern investor." },
  version: "v1.0.0",
  product: [{ title: "Features", description: "#" }, { title: "Pricing", description: "/investor/subscription" }],
  company: [{ title: "About Us", description: "#" }, { title: "Careers", description: "#" }, { title: "Blog", description: "#" }, { title: "Press", description: "#" }, { title: "Reviews", description: "/reviews" }],
  resources: [{ title: "GitHub Repository", description: "#" }, { title: "Documentation", description: "#" }, { title: "API Status", description: "#" }],
  contact: [{ title: "support@deskstock.ai", description: "" }, { title: "Help Center", description: "#" }, { title: "Terms of Service", description: "#" }, { title: "Privacy Policy", description: "#" }],
};

function Footer() {
  const content = useLandingContent();
  const c = content ?? [];

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-10 md:gap-12 mb-10">

          {/* Brand */}
          <div className="sm:col-span-2 xl:col-span-1">
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
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Resources</h4>
            <ul className="space-y-2.5">
              {resources.map((item) => (
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
