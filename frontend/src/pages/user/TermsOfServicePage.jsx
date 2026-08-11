import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";

import RoleHeader from "../../layout/RoleHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useLandingContent } from "../../api/contentApi.js";

const LAST_UPDATED = "August 10, 2026";
const ENTITY_NAME = "Rocket Trade Pte. Ltd."; // TODO: replace with your registered entity name once incorporated
const CONTACT_EMAIL = "kimanh.work26@gmail.com";

const DEFAULT_INTRO = `${ENTITY_NAME} ("we", "us", "the Platform") operates a paper trading and investment-education platform. These Terms of Service form an agreement between you and Rocket Trade for use of the website, mobile experience, and related services, and are governed by Singapore law.`;

const DEFAULT_SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: [
      "These Terms of Service (\"Terms\") form a legal agreement between you and " + ENTITY_NAME + " (\"Rocket Trade\", \"we\", \"us\", or \"our\"), governing your access to and use of the Rocket Trade website, mobile experience, and related services (together, the \"Platform\").",
      "By creating an account or otherwise using the Platform, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not register for or use the Platform.",
      "We may update these Terms from time to time to reflect changes to the Platform or applicable law. Where changes are material, we will take reasonable steps to notify you (such as an in-app notice or email). Continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.",
    ],
  },
  {
    title: "2. What Rocket Trade Is — and Is Not",
    body: [
      "Rocket Trade is a paper trading and market-education platform. The Platform provides AI-generated stock predictions, market data, quant ratings, educational content, and community and expert-led discussion features to help users practise and learn about investing in a risk-free, simulated environment.",
      "Rocket Trade is not a licensed financial adviser, dealer, or capital markets services provider, and does not carry out any regulated activity under the Securities and Futures Act 2001 or the Financial Advisers Act 2001 of Singapore. We are not licensed or regulated by the Monetary Authority of Singapore (MAS), and nothing on the Platform should be treated as a regulated financial advisory or dealing service.",
    ],
  },
  {
    title: "3. AI Predictions & Analytical Content",
    body: [
      "The Platform generates AI-based stock predictions, quant ratings, and other analytical content using machine-learning models applied to historical and current market data. This content is provided for informational and educational purposes only and does not constitute financial, investment, tax, or legal advice, and does not take into account your personal investment objectives, financial situation, or particular needs.",
      "AI-generated predictions are analytical estimates, not facts, and are not guaranteed to be accurate, complete, or timely. They should never be treated as a promise of future performance. Any decisions you make based on Platform content — including decisions you may separately make to invest real money elsewhere — are made entirely at your own risk, and you should seek independent, licensed financial advice before making any real-world investment decision.",
    ],
  },
  {
    title: "4. Market Data & Third-Party Information",
    body: [
      "Market prices, charts, and related data displayed on the Platform are sourced from third-party market data providers and may be delayed, simulated, incomplete, or subject to interruption. We do not warrant the accuracy, completeness, or timeliness of any market data shown on the Platform, and you should not rely on it as a real-time or authoritative source for making financial decisions outside the Platform.",
      "Third-party market data remains the property of the relevant data provider or exchange and is provided to you solely for use within the Platform.",
    ],
  },
  {
    title: "5. Accounts & Security",
    body: [
      "You must provide accurate registration information (such as your email address, and optionally your name, phone number, and address) and keep your login credentials confidential. You are responsible for all activity that occurs under your account, and must notify us promptly at " + CONTACT_EMAIL + " if you suspect unauthorised use of your account or a security incident affecting it.",
      "You must be at least 18 years old (the age of majority in Singapore under the Age of Majority Act 1971) to create an account and enter into these Terms. We may suspend or terminate accounts that violate these Terms, provide false information, or engage in abusive behaviour toward other users.",
    ],
  },
  {
    title: "6. Paper Trading, Virtual Wallet & Real Payments — What's Real and What's Not",
    body: [
      "It's important that you understand exactly what is real money and what is simulated on Rocket Trade:",
      "Simulated (no real money, no cash value): all buying and selling of stocks, your in-platform cash wallet balance, \"cash in\" and \"cash out\" transfers to and from that wallet (even where you are asked for a bank name and account number for realism), gifts sent to experts, and expert compensation ledger credits. These are entirely virtual figures within a sandbox environment for educational purposes. They cannot be withdrawn, redeemed, converted into real currency, or transferred to a real bank account, and no real bank transfer or money movement of any kind occurs when you use these features.",
      "Real (actual payment): only your premium subscription fee, charged through our payment processor, Stripe, is a real charge to your real payment card. See Section 7 below.",
      "Where a bank name or account number is requested as part of the simulated cash portal feature, this is for demonstration purposes only; account numbers are masked before storage and are never used to initiate any real transaction.",
    ],
  },
  {
    title: "7. Subscriptions & Payments",
    body: [
      "Rocket Trade offers a free tier and a paid premium subscription with additional features. Paid subscriptions are billed in the currency and at the price shown at checkout, and are processed through our third-party payment processor, Stripe. We do not store your full card details on our servers.",
      "Subscriptions renew automatically until cancelled. You can cancel at any time from your account's Subscription page; access typically continues until the end of the current billing period. Fees already paid are generally non-refundable, except where required by the Consumer Protection (Fair Trading) Act 2003 or other applicable Singapore law, or as otherwise stated at the point of purchase.",
    ],
  },
  {
    title: "8. Acceptable Use",
    body: [
      "When using the Platform, you agree not to: access or attempt to access the Platform through automated means (bots, scrapers, or similar tools) except where we provide an official API; reverse-engineer, decompile, or attempt to extract the source code of the Platform; circumvent or attempt to circumvent any security, rate-limiting, or access-control measures; misuse the AI chatbot to generate unlawful, harmful, or abusive content; exploit bugs in the simulated wallet, gifting, or compensation systems in bad faith; or use the Platform in any way that violates applicable law or infringes the rights of others.",
      "We may investigate and take appropriate action against anyone who, in our reasonable judgment, violates this section, including suspending or terminating accounts and, where necessary, reporting conduct to the relevant authorities.",
    ],
  },
  {
    title: "9. Community Conduct",
    body: [
      "The forum, expert portfolios, reviews, and chat features are meant for respectful discussion of markets, strategies, and platform feedback. You agree not to post content that is unlawful, defamatory, harassing, or that infringes on another person's intellectual property or other rights, and not to use these features to spam, mislead, or impersonate others.",
      "We reserve the right to remove content or restrict accounts that violate this policy, in line with the moderation tools available to our administrators, and to report unlawful content to the relevant authorities where required.",
    ],
  },
  {
    title: "10. Experts & Expert Program",
    body: [
      "Users who apply for and are approved as Experts may publish portfolios, commentary, and educational content on the Platform, and may accumulate compensation credits as described within the Platform based on followers and engagement. As described in Section 6, this compensation is currently tracked as an in-platform ledger figure for educational and gamification purposes and is not a real cash payout; if this changes in future, we will update these Terms and notify affected users before the change takes effect.",
      "Expert content reflects personal opinion only; it is not independently verified by us and is not a guarantee of investment outcomes for anyone who follows it, even within the simulated environment.",
    ],
  },
  {
    title: "11. Intellectual Property",
    body: [
      "The Platform's design, branding, software, and original content are owned by " + ENTITY_NAME + " or our licensors and are protected by Singapore and international intellectual property laws, including the Copyright Act 2021. Market data and third-party content displayed on the Platform remain the property of their respective owners.",
      "You retain ownership of content you post (such as forum posts and reviews), but by posting it you grant us a non-exclusive, royalty-free, worldwide licence to host, display, reproduce, and distribute that content within the Platform for the purpose of operating and promoting the service.",
      "If you believe content on the Platform infringes your intellectual property rights, please contact us at " + CONTACT_EMAIL + " with details of the alleged infringement, and we will review and, where appropriate, remove or disable access to the content.",
    ],
  },
  {
    title: "12. Availability & Changes to the Platform",
    body: [
      "We aim to keep the Platform available and reliable, but we do not guarantee that it will be available at all times or free from interruption, and we do not provide any uptime or service-level commitment. The Platform may be unavailable from time to time for maintenance, updates, or reasons outside our reasonable control.",
      "We may add, change, suspend, or discontinue any feature of the Platform (including specific market data feeds, AI models, or community features) at any time, with or without notice, and will not be liable for any resulting loss where this occurs.",
    ],
  },
  {
    title: "13. Disclaimers & Limitation of Liability",
    body: [
      "The Platform is provided \"as is\" and \"as available\", without warranties of any kind, whether express or implied. We do not guarantee that predictions, market data, or the service itself will be uninterrupted, accurate, or error-free.",
      "To the fullest extent permitted by law — including subject to any limits imposed by the Unfair Contract Terms Act 1977 of Singapore — " + ENTITY_NAME + " and its officers, employees, and agents will not be liable for any indirect, incidental, special, or consequential loss or damage arising from your use of the Platform, including any decisions made using information found on it. Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited, such as liability for death or personal injury caused by negligence, or for fraud.",
      "You agree to indemnify and hold us harmless from any claims, losses, or expenses (including reasonable legal costs) arising from your breach of these Terms or your misuse of the Platform.",
    ],
  },
  {
    title: "14. Termination",
    body: [
      "You may stop using the Platform and request account deletion at any time by contacting our support team through the Help Centre or at " + CONTACT_EMAIL + ". We may suspend or terminate accounts that breach these Terms or applicable law, with or without notice where circumstances reasonably require it.",
      "Provisions of these Terms that by their nature should survive termination (including intellectual property, disclaimers, limitation of liability, and governing law) will continue to apply after your account is closed.",
    ],
  },
  {
    title: "15. Governing Law & Dispute Resolution",
    body: [
      "These Terms are governed by and construed in accordance with the laws of the Republic of Singapore, without regard to conflict of law principles.",
      "Any dispute arising out of or in connection with these Terms, including any question regarding its existence, validity, or termination, shall first be addressed through good-faith negotiation between you and us. If it cannot be resolved this way, the dispute shall be referred to and finally resolved by the courts of Singapore, which shall have exclusive jurisdiction, save that we may also seek injunctive or other equitable relief in any court of competent jurisdiction where necessary to protect our rights.",
    ],
  },
  {
    title: "16. General",
    body: [
      "If any provision of these Terms is found to be invalid or unenforceable under Singapore law, that provision will be limited or severed to the minimum extent necessary, and the remaining provisions will continue in full force and effect.",
      "These Terms, together with our Privacy Policy, constitute the entire agreement between you and us regarding the Platform and supersede any prior agreements on this subject. We may assign these Terms in connection with a merger, acquisition, or sale of assets; you may not assign your rights under these Terms without our consent. A person who is not a party to these Terms has no rights under the Contracts (Rights of Third Parties) Act 2001 to enforce any term of these Terms.",
    ],
  },
  {
    title: "17. Contact Us",
    body: [
      "Questions about these Terms can be sent to our support team through the Help Centre, or by emailing " + CONTACT_EMAIL + ".",
    ],
  },
];

function TermsOfServicePage() {
  const content = useLandingContent();
  const c = content ?? [];
  const tosItems = c.filter((x) => x.section === "terms_of_service");
  const sections = tosItems.length
    ? tosItems.map((item) => ({ title: item.title, body: (item.description || "").split("\n\n") }))
    : DEFAULT_SECTIONS;
  const intro = c.find((x) => x.content_id === "tos_intro")?.description || DEFAULT_INTRO;
  const lastUpdated = c.find((x) => x.content_id === "tos_last_updated")?.title || LAST_UPDATED;
  const heroItem = c.find((x) => x.content_id === "tos_hero");
  const heroTitle = heroItem?.title || "Terms of Service";
  const heroSubtitle = heroItem?.description || "These terms govern your use of Rocket Trade's paper trading and market-education platform. Please read them carefully.";
  // Gradient-highlight the last word of the heading, matching the page's original two-tone style.
  const heroWords = heroTitle.trim().split(" ");
  const heroLead = heroWords.slice(0, -1).join(" ");
  const heroHighlight = heroWords[heroWords.length - 1] || "";

  return (
    <motion.div
      className="min-h-screen bg-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <RoleHeader />

      <section className="relative w-full overflow-hidden bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 pb-14 pt-36 text-white md:pb-20">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-5 text-center md:px-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-400/5 px-5 py-2 text-xs font-bold tracking-wider text-cyan-400">
            <ScrollText size={14} />
            LEGAL
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            {heroLead ? `${heroLead} ` : ""}
            <span className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {heroHighlight}
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            {heroSubtitle}
          </p>
          <p className="mt-3 text-xs font-medium tracking-wide text-slate-400">
            Last updated: {lastUpdated} · Governed by the laws of Singapore
          </p>
        </div>
      </section>

      <main className="mx-auto w-full max-w-4xl px-5 py-14 md:px-8 md:py-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md md:p-10">
          <p className="mb-8 text-sm leading-7 text-slate-600">
            {intro}
          </p>

          <div className="mb-8 space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm leading-6 text-amber-900">
                <strong>Not MAS-regulated:</strong> Rocket Trade is a simulated, virtual-funds platform. We are not licensed or regulated by the Monetary Authority of Singapore, and nothing on the Platform is a regulated financial advisory or dealing service. See Sections 2 and 3.
              </p>
            </div>
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="text-sm leading-6 text-cyan-900">
                <strong>Real money vs. simulated:</strong> Only your premium subscription fee is a real charge, via Stripe. Trading, the cash wallet, gifts, and expert compensation are all simulated and have no cash value. See Section 6 for the full explanation.
              </p>
            </div>
          </div>

          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="mb-3 text-lg font-semibold text-slate-800 md:text-xl">
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.body.map((paragraph, i) => (
                    <p key={i} className="text-sm leading-7 text-slate-600 md:text-base">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </motion.div>
  );
}

export default TermsOfServicePage;
