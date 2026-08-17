import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  UserRound,
  CreditCard,
  ChartCandlestick,
  BrainCircuit,
  MessagesSquare,
  ShieldCheck,
  Search,
  ChevronDown,

  CircleHelp,
} from "lucide-react";

import RoleHeader from "../../layout/RoleHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import helpCenterImg from "../../images/help_center.jpg";
import { fillTemplate, useContentManagement } from "../../utils/contentManagement.js";

const FAQS_PER_CATEGORY = 3;

const CATEGORIES_FALLBACK = [
  {
    title: "Account & Login",

    icon: UserRound,
  },
  {
    title: "Subscription & Payments",

    icon: CreditCard,
  },
  {
    title: "Stock Trading",

    icon: ChartCandlestick,
  },
  {
    title: "AI Predictions",
    icon: BrainCircuit,
  },
  {
    title: "Community Forum",
    icon: MessagesSquare,
  },
  {
    title: "Privacy & Security",
    icon: ShieldCheck,
  },
];

const FAQS_FALLBACK = [
  {
    category: "Account & Login",
    question: "How do I create an account?",
    answer:
      "Head to the homepage and click Get Started or Register. You'll just need to fill in a few basic details and pick your account type — investor or expert. We'll usually ask you to verify your email before you can log in.",
  },
  {
    category: "Account & Login",
    question: "How can I reset my password?",
    answer:
      "No worries, it happens. On the login page, click Forgot Password and enter the email you signed up with, and we'll send you a link to set a new one.",
  },
  {
    category: "Account & Login",
    question: "Why can’t I log in?",
    answer:
      "First, double-check your email and password — typos are the usual culprit. It's also worth checking that your account is verified and hasn't been suspended. Still stuck? Reset your password, or reach out to our support team and we'll sort it out.",
  },

  {
    category: "Subscription & Payments",
    question: "How do I subscribe to a premium plan?",
    answer:
      "Log in to your investor account, then head to Subscription from your profile menu. From there you can pick a plan and check out — it only takes a minute.",
  },
  {
    category: "Subscription & Payments",
    question: "Can I cancel my subscription?",
    answer:
      "Yep, anytime. Go to your Subscription page, find your current plan, and hit cancel. You'll keep your premium access until the end of the billing period you've already paid for.",
  },
  {
    category: "Subscription & Payments",
    question: "What should I do if my payment fails?",
    answer:
      "Start by checking your card details and making sure there's enough available balance, then give it another go. If it still won't go through, it's worth checking with your bank or card provider — and if you're really stuck, our support team is happy to help.",
  },

  {
    category: "Stock Trading",
    question: "How do I buy a stock?",
    answer:
      "Open the real-time dashboard, pick a stock, and hit Buy. Enter how many shares you want, take a look at the estimated cost, and confirm — that's it.",
  },
  {
    category: "Stock Trading",
    question: "How do I sell a stock?",
    answer:
      "From your portfolio (or the stock's page), hit Sell, enter the quantity you're letting go of, double-check the details, and confirm the trade.",
  },
  {
    category: "Stock Trading",
    question: "Where can I view my transaction history?",
    answer:
      "Head to Transactions in your investor menu, then Transaction History — you'll find a full record of everything you've bought and sold.",
  },

  {
    category: "AI Predictions",
    question: "How are AI stock predictions generated?",
    answer:
      "Our models look at historical price data, current market activity, and recurring patterns to generate an analytical estimate of where a stock might be headed. Think of it as a research tool, not a crystal ball.",
  },
  {
    category: "AI Predictions",
    question: "Are AI predictions guaranteed to be accurate?",
    answer:
      "No, and we want to be upfront about that. They're estimates based on data, not promises. Markets are unpredictable, so please don't treat our predictions as financial advice or a guaranteed outcome.",
  },
  {
    category: "AI Predictions",
    question: "Where can I view prediction results?",
    answer:
      "You'll find predictions and related insights right on each stock's dashboard, alongside the other analysis tools.",
  },

  {
    category: "Community Forum",
    question: "How do I create a forum post?",
    answer:
      "Head into the Community Forum and look for the New Post button. Give it a title, write what's on your mind, pick a category, and post it — the community will take it from there.",
  },
  {
    category: "Community Forum",
    question: "How do I reply to another user?",
    answer:
      "Open the post you want to respond to, type your reply in the box below it, and hit submit. It'll show up right in the discussion thread.",
  },
  {
    category: "Community Forum",
    question: "How do forum notifications work?",
    answer:
      "If someone likes your post or replies to you, we'll let you know. You can check all your notifications anytime from your account's notification page.",
  },

  {
    category: "Privacy & Security",
    question: "How is my personal information protected?",
    answer:
      "We take this seriously. Your data is protected through authentication checks, restricted access controls, and secure handling practices designed to keep it away from anyone who shouldn't see it.",
  },
  {
    category: "Privacy & Security",
    question: "Is my payment information stored?",
    answer:
      "Not by us. Your payments are handled directly by our payment provider, and we never see or store your full card details on our end.",
  },
  {
    category: "Privacy & Security",
    question: "What should I do if I notice suspicious activity?",
    answer:
      "Change your password right away and log out of any active sessions. Then note down what you noticed and get in touch with our support team — we'll help you look into it.",
  },
];

function SupportPage() {
  const cms = useContentManagement();
  const hero = cms.text("help_hero", "How can we|help you?", "Find answers, explore support topics, or contact our team for further assistance.");
  const searchPlaceholder = cms.text("help_search_placeholder", "Search for help...").title;
  const faqHeader = cms.text(
    "help_faq_header",
    "Frequently Asked Questions",
    "Browse frequently asked questions across all support topics."
  );
  const faqCategoryDescription = cms.text(
    "help_faq_category_desc",
    "Showing questions related to {category}."
  ).title;
  const emptyHeading = cms.text("help_empty_heading", "No matching questions found").title;
  const emptyDescription = cms.text(
    "help_empty_desc",
    "Try using a different search term or select another category."
  ).title;
  const contactHeading = cms.text(
    "help_contact_heading",
    "Didn't find an answer to your questions?"
  ).title;
  const contactDescription = cms.text(
    "help_contact_desc",
    "Get in touch with us for more details"
  ).title;
  const contactCta = cms.text("help_contact_cta", "Contact Support").title;
  const contactEmail = cms.text("help_contact_email", "kimanh.work26@gmail.com").title;
  const [heroPlain, heroAccent] = hero.title.includes("|") ? hero.title.split("|") : ["", hero.title];

  const categoryItems = cms.section("help_categories");
  const categorySource = categoryItems.length ? categoryItems : CATEGORIES_FALLBACK;
  const categories = categorySource.map((item, i) => ({
    title: item.title,
    icon: CATEGORIES_FALLBACK[i]?.icon || CircleHelp,
  }));

  // Each category owns FAQS_PER_CATEGORY rows by position. This keeps the
  // internal relationship stable while allowing admins to rename category
  // labels without breaking filtering or search. Rows added beyond the
  // original set fall under the last category — drag-reorder them into the
  // right group-of-three slot to file them under an earlier category.
  const faqItems = cms.section("help_faqs");
  const faqSource = faqItems.length ? faqItems : FAQS_FALLBACK;
  const faqs = faqSource.map((item, i) => {
    const categoryIndex = Math.min(categories.length - 1, Math.floor(i / FAQS_PER_CATEGORY));
    return {
      category: categories[categoryIndex]?.title ?? item.category ?? "",
      question: item.title ?? item.question,
      answer: item.description ?? item.answer,
    };
  });

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const faqSectionRef = useRef(null);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory =
      selectedCategory === "All" ||
      faq.category === selectedCategory;

    const matchesSearch =
      !normalizedSearch ||
      faq.question.toLowerCase().includes(normalizedSearch) ||
      faq.answer.toLowerCase().includes(normalizedSearch) ||
      faq.category.toLowerCase().includes(normalizedSearch);

    return matchesCategory && matchesSearch;
  });
  // Limit search suggestions to the first 5 matches for performance and usability.
  const searchSuggestions = normalizedSearch
    ? faqs
      .filter(
        (faq) =>
          faq.question.toLowerCase().includes(normalizedSearch) ||
          faq.answer.toLowerCase().includes(normalizedSearch) ||
          faq.category.toLowerCase().includes(normalizedSearch)
      )
      .slice(0, 5)
    : [];

  const selectCategory = (category) => {
    setSelectedCategory(category);
    setSearchTerm("");
    setShowSuggestions(false);
    setOpenFaq(null);
    requestAnimationFrame(() => {
      faqSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const goToFaq = (faq) => {
    setSelectedCategory(faq.category);
    setSearchTerm(faq.question);
    setShowSuggestions(false);
    setOpenFaq(0);
    requestAnimationFrame(() => {
      faqSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <motion.div
      className="min-h-screen bg-white text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <RoleHeader />

      {/* Hero — full-width banner */}
      <section className="relative w-full h-250 overflow-hidden border-b border-blue-500/20 shadow-2xl shadow-black/30">
        <img
          alt=""
          src={hero.image_url || helpCenterImg}
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-md"
        />
        <div className="absolute inset-0 bg-blue-950/80" />

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-5 py-14 md:px-8 md:py-20">
          <div className="max-w-3xl text-center" style={{ marginTop: 80 }}>

            <h1 className="text-4xl font-bold tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.6)] md:text-6xl">
              {heroPlain}{heroPlain && " "}
              <span className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {heroAccent}
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] md:text-lg">
              {hero.description}
            </p>

            <div className="relative mt-8 max-w-2xl">
              <Search
                size={21}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-cyan-400"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setOpenFaq(null);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setShowSuggestions(false)}
                placeholder={searchPlaceholder}
                className="h-14 w-full rounded-3xl border border-blue-500/40 bg-slate-950/85 shadow-lg shadow-black/40 pl-14 pr-5 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400/70 focus:shadow-[0_0_25px_rgba(34,211,238,0.2)]"
              />

              {showSuggestions && searchSuggestions.length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onMouseDown={() => setShowSuggestions(false)}
                  />
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/40">
                    {searchSuggestions.map((faq) => (
                      <button
                        key={faq.question}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => goToFaq(faq)}
                        className="flex w-full flex-col items-start gap-0.5 border-b border-slate-100 px-5 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-cyan-600">
                          {faq.category}
                        </span>
                        <span className="text-sm font-medium text-slate-800">
                          {faq.question}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="mt-8 flex w-full flex-nowrap justify-center gap-1">
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.title;

              return (
                <button
                  key={category.title}
                  type="button"
                  onClick={() => selectCategory(category.title)}
                  className={`group flex w-fit shrink-0 items-center gap-2 rounded-xl border bg-white px-2.5 py-2.5 text-left shadow-md transition duration-300 hover:-translate-y-0.5 hover:shadow-lg ${isSelected
                    ? "border-cyan-400 shadow-[0_0_0_2px_rgba(34,211,238,0.25),0_10px_25px_-5px_rgba(34,211,238,0.25)]"
                    : "border-slate-200"
                    }`}
                >
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-cyan-400/40 bg-cyan-50 text-cyan-600">
                    <Icon size={16} strokeWidth={1.8} />
                  </div>

                  <h3 className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                    {category.title}
                  </h3>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-5 py-14 md:px-8 md:py-20">
        {/* FAQ */}
        <section className="mt-20 flex justify-center">
          <div ref={faqSectionRef} className="w-full max-w-3xl">
            <h2 className="text-center text-3xl font-bold text-slate-900">
              {faqHeader.title}
            </h2>

            <p className="mt-3 text-center text-sm leading-7 text-slate-600 md:text-base">
              {selectedCategory === "All"
                ? faqHeader.description
                : fillTemplate(faqCategoryDescription, { category: selectedCategory })}
            </p>

            <div className="mt-8 space-y-3">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq, index) => {
                  const isOpen = openFaq === index;

                  return (
                    <article
                      key={`${faq.category}-${faq.question}`}
                      className={`overflow-hidden rounded-xl border bg-white shadow-md transition ${isOpen
                        ? "border-cyan-400 shadow-[0_0_0_2px_rgba(34,211,238,0.2),0_10px_25px_-5px_rgba(34,211,238,0.2)]"
                        : "border-slate-200"
                        }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenFaq(isOpen ? null : index)
                        }
                        className="flex w-full items-center justify-between gap-5 px-5 py-4 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-cyan-600">
                            Q.
                          </span>

                          <span className="text-sm font-medium text-slate-800 md:text-base">
                            {faq.question}
                          </span>
                        </div>

                        <ChevronDown
                          size={20}
                          className={`shrink-0 text-cyan-600 transition-transform duration-300 ${isOpen ? "rotate-180" : ""
                            }`}
                        />
                      </button>

                      <div
                        className={`grid transition-all duration-300 ${isOpen
                          ? "grid-rows-[1fr]"
                          : "grid-rows-[0fr]"
                          }`}
                      >
                        <div className="overflow-hidden">
                          <div className="border-t border-slate-100 px-5 py-5">
                            <p className="text-sm leading-7 text-slate-600">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-md">
                  <CircleHelp
                    size={36}
                    className="mx-auto text-cyan-600"
                  />

                  <h3 className="mt-4 text-lg font-semibold text-slate-800">
                    {emptyHeading}
                  </h3>

                  <p className="mt-2 text-sm text-slate-600">
                    {emptyDescription}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="mx-auto mt-12 max-w-3xl border-t border-blue-500/20" />

        {/* Contact CTA */}
        <section className="mt-12 text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            {contactHeading}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">
            {contactDescription}
          </p>

          <a
            href={`mailto:${contactEmail}`}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-400 to-blue-500 px-8 text-sm font-bold text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.2)] transition hover:brightness-110"
          >
            {contactCta}
          </a>
        </section>
      </main>

      <Footer />
    </motion.div>
  );
}

export default SupportPage;