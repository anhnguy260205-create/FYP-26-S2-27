import { useMemo, useRef, useState } from "react";
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

const categories = [
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

const faqs = [
  {
    category: "Account & Login",
    question: "How do I create an account?",
    answer:
      "Select Get Started or Register from the homepage. Enter the required personal information, choose the appropriate account type, and submit the registration form. You may also be required to verify your email address before logging in.",
  },
  {
    category: "Account & Login",
    question: "How can I reset my password?",
    answer:
      "Open the login page and select Forgot Password. Enter the email address associated with your account and follow the password reset instructions sent to your email.",
  },
  {
    category: "Account & Login",
    question: "Why can’t I log in?",
    answer:
      "Confirm that your email address and password are correct. Check whether your account has been verified or suspended. If the issue continues, reset your password or contact the Rocket Trade support team.",
  },

  {
    category: "Subscription & Payments",
    question: "How do I subscribe to a premium plan?",
    answer:
      "Log in to your investor account, open the Subscription page from your profile menu, select an available plan, and complete the payment process.",
  },
  {
    category: "Subscription & Payments",
    question: "Can I cancel my subscription?",
    answer:
      "Yes. Open the Subscription page, review your active plan, and select the cancellation option. Your access may remain available until the end of the current billing period.",
  },
  {
    category: "Subscription & Payments",
    question: "What should I do if my payment fails?",
    answer:
      "Check that your payment information is correct and that sufficient funds are available. Try the payment again. If the issue continues, contact your payment provider or Rocket Trade support.",
  },

  {
    category: "Stock Trading",
    question: "How do I buy a stock?",
    answer:
      "Open the real-time stock dashboard, select a stock, and choose Buy. Enter the quantity, review the estimated transaction amount, and confirm the order.",
  },
  {
    category: "Stock Trading",
    question: "How do I sell a stock?",
    answer:
      "Open your portfolio or the relevant stock page, select Sell, enter the quantity you want to sell, review the transaction details, and confirm the sale.",
  },
  {
    category: "Stock Trading",
    question: "Where can I view my transaction history?",
    answer:
      "Open Transactions from the investor navigation menu and select Transaction History. This page displays your previous buy and sell activities.",
  },

  {
    category: "AI Predictions",
    question: "How are AI stock predictions generated?",
    answer:
      "Rocket Trade uses machine-learning models to analyse historical market data, current market information, and identifiable patterns. These models generate analytical estimates that may support investment research.",
  },
  {
    category: "AI Predictions",
    question: "Are AI predictions guaranteed to be accurate?",
    answer:
      "No. AI predictions are analytical estimates and cannot guarantee future market performance. They should not be treated as professional financial advice or as guaranteed investment outcomes.",
  },
  {
    category: "AI Predictions",
    question: "Where can I view prediction results?",
    answer:
      "Prediction results and analytical insights are available through the supported stock dashboard and relevant analysis tools within Rocket Trade.",
  },

  {
    category: "Community Forum",
    question: "How do I create a forum post?",
    answer:
      "Open the Community Forum, select the option to create a new post, enter the title and content, choose an appropriate category, and publish the post.",
  },
  {
    category: "Community Forum",
    question: "How do I reply to another user?",
    answer:
      "Open the relevant forum post, enter your response in the reply section, and submit the comment. Your reply will appear within the discussion.",
  },
  {
    category: "Community Forum",
    question: "How do forum notifications work?",
    answer:
      "You may receive a notification when another user likes your post or replies to one of your discussions. Notifications can be viewed from your account notification page.",
  },

  {
    category: "Privacy & Security",
    question: "How is my personal information protected?",
    answer:
      "Rocket Trade applies authentication, controlled access, secure data-handling practices, and account protection measures to reduce unauthorised access to user information.",
  },
  {
    category: "Privacy & Security",
    question: "Is my payment information stored?",
    answer:
      "Payment transactions are processed through the connected payment provider. Rocket Trade should not directly display or store complete payment card credentials.",
  },
  {
    category: "Privacy & Security",
    question: "What should I do if I notice suspicious activity?",
    answer:
      "Change your password immediately and log out of your account. Record any unusual activity and contact the Rocket Trade support team with the relevant details.",
  },
];

function SupportPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const faqSectionRef = useRef(null);

  const filteredFaqs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return faqs.filter((faq) => {
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
  }, [selectedCategory, searchTerm]);

  const searchSuggestions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return [];
    return faqs
      .filter(
        (faq) =>
          faq.question.toLowerCase().includes(normalizedSearch) ||
          faq.answer.toLowerCase().includes(normalizedSearch) ||
          faq.category.toLowerCase().includes(normalizedSearch)
      )
      .slice(0, 5);
  }, [searchTerm]);

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
    <div className="min-h-screen bg-white text-white">
      <RoleHeader />

      {/* Hero — full-width banner */}
      <section className="relative w-full h-140 overflow-hidden border-b border-blue-500/20 shadow-2xl shadow-black/30">
        <img
          alt=""
          src={helpCenterImg}
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-md"
        />
        <div className="absolute inset-0 bg-blue-950/80" />

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-5 py-14 md:px-8 md:py-20">
          <div className="max-w-3xl text-center" style={{ marginTop: 40 }}>

            <h1 className="text-4xl font-bold tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.6)] md:text-6xl">
              How can we{" "}
              <span className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                help you?
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] md:text-lg">
              Find answers, explore support topics, or contact our team for
              further assistance.
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
                placeholder="Search for help..."
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
              Frequently Asked Questions
            </h2>

            <p className="mt-3 text-center text-sm leading-7 text-slate-600 md:text-base">
              {selectedCategory === "All"
                ? "Browse frequently asked questions across all support topics."
                : `Showing questions related to ${selectedCategory}.`}
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
                    No matching questions found
                  </h3>

                  <p className="mt-2 text-sm text-slate-600">
                    Try using a different search term or select another
                    category.
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
            Didn't find an answer to your questions?
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600 md:text-base">
            Get in touch with us for more details
          </p>

          <a
            href="mailto:kim@gmail.com"
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-400 to-blue-500 px-8 text-sm font-bold text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.2)] transition hover:brightness-110"
          >
            Contact Support
          </a>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default SupportPage;