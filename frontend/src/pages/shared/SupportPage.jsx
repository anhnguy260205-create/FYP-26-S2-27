import { useMemo, useState } from "react";
import {
  UserRound,
  CreditCard,
  ChartCandlestick,
  BrainCircuit,
  MessagesSquare,
  ShieldCheck,
  Search,
  ChevronDown,
  Mail,
  ArrowRight,
  Headphones,
  CircleHelp,
} from "lucide-react";

import Header from "../../layout/Header.jsx";
import Footer from "../../layout/Footer.jsx";

const categories = [
  {
    title: "Account & Login",
    description:
      "Manage your account, password, profile information, and login issues.",
    icon: UserRound,
  },
  {
    title: "Subscription & Payments",
    description:
      "Find information about plans, billing, cancellations, and failed payments.",
    icon: CreditCard,
  },
  {
    title: "Stock Trading",
    description:
      "Learn about buying, selling, portfolios, and transaction history.",
    icon: ChartCandlestick,
  },
  {
    title: "AI Predictions",
    description:
      "Understand how our AI-powered analysis and prediction tools work.",
    icon: BrainCircuit,
  },
  {
    title: "Community Forum",
    description:
      "Learn how to create posts, reply to users, and receive notifications.",
    icon: MessagesSquare,
  },
  {
    title: "Privacy & Security",
    description:
      "Review account protection, privacy practices, and security guidance.",
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

  const selectCategory = (category) => {
    setSelectedCategory(category);
    setOpenFaq(null);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(29,78,216,0.2),transparent_32%),linear-gradient(135deg,#020817_0%,#061630_50%,#020817_100%)] text-white">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-5 py-14 md:px-8 md:py-20">
        {/* Hero */}
        <section className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-400/5 px-5 py-2 text-xs font-bold tracking-wider text-cyan-400">
              <Headphones size={15} />
              SUPPORT CENTRE
            </div>

            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              How can we{" "}
              <span className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                help you?
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
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
                }}
                placeholder="Search for help..."
                className="h-14 w-full rounded-xl border border-blue-500/40 bg-slate-950/60 pl-14 pr-5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/70 focus:shadow-[0_0_25px_rgba(34,211,238,0.12)]"
              />
            </div>
          </div>

          {/* Support visual */}
          <div className="relative hidden min-h-[300px] items-center justify-center lg:flex">
            <div className="absolute h-[260px] w-[260px] rounded-full bg-blue-500/20 blur-3xl" />

            <div className="relative grid h-[210px] w-[210px] place-items-center rounded-full border border-cyan-400/30 bg-blue-950/50 shadow-[0_0_60px_rgba(34,211,238,0.18)]">
              <Headphones
                size={105}
                strokeWidth={1.25}
                className="text-cyan-400"
              />

              <div className="absolute -left-10 top-8 grid h-16 w-16 place-items-center rounded-2xl border border-blue-400/30 bg-blue-950/90 text-cyan-400 shadow-xl">
                <CircleHelp size={30} />
              </div>

              <div className="absolute -right-9 bottom-8 grid h-16 w-16 place-items-center rounded-2xl border border-blue-400/30 bg-blue-950/90 text-cyan-400 shadow-xl">
                <MessagesSquare size={29} />
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mt-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-400/5 px-5 py-2 text-xs font-bold tracking-wider text-cyan-400">
                <CircleHelp size={14} />
                HELP CATEGORIES
              </div>

              <h2 className="mt-5 text-3xl font-bold">
                Explore Help Categories
              </h2>

              <p className="mt-3 text-sm leading-7 text-slate-400 md:text-base">
                Select a category to view the most relevant questions and
                answers.
              </p>
            </div>

            {selectedCategory !== "All" && (
              <button
                type="button"
                onClick={() => selectCategory("All")}
                className="self-start rounded-lg border border-cyan-400/40 px-4 py-2 text-sm font-medium text-cyan-400 transition hover:bg-cyan-400/10 sm:self-auto"
              >
                View all categories
              </button>
            )}
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.title;

              return (
                <button
                  key={category.title}
                  type="button"
                  onClick={() => selectCategory(category.title)}
                  className={`group relative min-h-[220px] rounded-2xl border p-6 text-left shadow-xl transition duration-300 hover:-translate-y-1.5 ${
                    isSelected
                      ? "border-cyan-400/70 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.12)]"
                      : "border-blue-500/20 bg-linear-to-br from-blue-950/60 to-slate-950/80 hover:border-cyan-400/45"
                  }`}
                >
                  <div className="mb-5 grid h-14 w-14 place-items-center rounded-full border border-cyan-400/40 bg-cyan-400/5 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.12)]">
                    <Icon size={27} strokeWidth={1.8} />
                  </div>

                  <h3 className="text-lg font-semibold">
                    {category.title}
                  </h3>

                  <p className="mt-3 pr-5 text-sm leading-6 text-slate-400">
                    {category.description}
                  </p>

                  <ArrowRight
                    size={20}
                    className="absolute bottom-6 right-6 text-cyan-400 transition-transform group-hover:translate-x-1"
                  />
                </button>
              );
            })}
          </div>
        </section>

        {/* FAQ and Contact */}
        <section className="mt-20 grid items-start gap-8 lg:grid-cols-[1.45fr_0.75fr]">
          {/* FAQ */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-400/5 px-5 py-2 text-xs font-bold tracking-wider text-cyan-400">
              <CircleHelp size={14} />
              FAQ
            </div>

            <h2 className="mt-5 text-3xl font-bold">
              Frequently Asked Questions
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-400 md:text-base">
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
                      className={`overflow-hidden rounded-xl border transition ${
                        isOpen
                          ? "border-cyan-400/50 bg-blue-950/70"
                          : "border-blue-500/20 bg-slate-950/50"
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
                          <span className="font-bold text-cyan-400">
                            Q.
                          </span>

                          <span className="text-sm font-medium text-slate-100 md:text-base">
                            {faq.question}
                          </span>
                        </div>

                        <ChevronDown
                          size={20}
                          className={`shrink-0 text-cyan-400 transition-transform duration-300 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <div
                        className={`grid transition-all duration-300 ${
                          isOpen
                            ? "grid-rows-[1fr]"
                            : "grid-rows-[0fr]"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="border-t border-blue-500/20 px-5 py-5">
                            <p className="text-sm leading-7 text-slate-400">
                              {faq.answer}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-blue-500/20 bg-slate-950/50 p-8 text-center">
                  <CircleHelp
                    size={36}
                    className="mx-auto text-cyan-400"
                  />

                  <h3 className="mt-4 text-lg font-semibold">
                    No matching questions found
                  </h3>

                  <p className="mt-2 text-sm text-slate-400">
                    Try using a different search term or select another
                    category.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contact */}
          <aside className="rounded-2xl border border-blue-500/25 bg-linear-to-br from-blue-950/70 to-slate-950/90 p-7 shadow-2xl lg:sticky lg:top-24">
            <div className="grid h-14 w-14 place-items-center rounded-full border border-cyan-400/40 bg-cyan-400/5 text-cyan-400 shadow-[0_0_22px_rgba(34,211,238,0.13)]">
              <Headphones size={27} />
            </div>

            <h2 className="mt-5 text-2xl font-bold">
              Contact Us
            </h2>

            <h3 className="mt-4 font-semibold text-cyan-400">
              We’re here to help.
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Contact our team when you cannot find the answer you need in
              the support centre.
            </p>

            <div className="my-6 border-t border-blue-500/20" />

            <a
              className="group flex items-center gap-4 rounded-xl p-3 transition hover:bg-white/5"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-cyan-400/40 bg-cyan-400/5 text-cyan-400">
                <Mail size={22} />
              </div>

              <div>
                <p className="text-sm font-semibold text-white">
                  Email Us
                </p>

                <p className="mt-1 break-all text-sm text-slate-400 transition group-hover:text-cyan-400">
                  kim@gmail.com
                </p>
              </div>
            </a>

            <a
              href="mailto:kim@gmail.com"
              className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-400 to-blue-500 text-sm font-bold text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.2)] transition hover:brightness-110"
            >
              Contact Support
              <ArrowRight size={18} />
            </a>

            <p className="mt-4 text-center text-xs leading-5 text-slate-500">
              Typical response time: within 1–2 business days.
            </p>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default SupportPage;