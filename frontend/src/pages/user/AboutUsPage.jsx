import { motion } from "framer-motion";
import {
  ShieldCheck,
  Cpu,
  ChartNoAxesCombined,
  Users,
  Sparkles,
} from "lucide-react";

import RoleHeader from "../../layout/RoleHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import aboutUsImg from "../../images/about_us.jpg";
import { useContentManagement } from "../../utils/contentManagement.js";

const VALUE_ICONS = [ShieldCheck, Cpu, ChartNoAxesCombined, Users];

const values = [
  {
    id: "about_value_0",
    title: "Trust & Security",
    description:
      "We prioritize the security of user data and investment information through reliable protection and responsible data practices.",
  },
  {
    id: "about_value_1",
    title: "AI Innovation",
    description:
      "We apply artificial intelligence and predictive analytics to deliver meaningful market insights and smarter investment tools.",
  },
  {
    id: "about_value_2",
    title: "Transparency",
    description:
      "We provide clear and accessible information to support informed and responsible financial decision-making.",
  },
  {
    id: "about_value_3",
    title: "User First",
    description:
      "We design every feature around the needs of investors, focusing on accessibility, usability, and long-term value.",
  },
];

const TEAM = [
  { id: "about_team_0", name: "Nguy Kim Anh", initials: "NKA" },
  { id: "about_team_1", name: "Jordan Lim Jun Hong", initials: "JL" },
  { id: "about_team_2", name: "Kim Bogyeong", initials: "KB" },
  { id: "about_team_3", name: "Lanice Lam Wen Xin", initials: "LL" },
  { id: "about_team_4", name: "Lim Ying Xin", initials: "LY" },
];

function AboutUsPage() {
  const cms = useContentManagement();
  const hero = cms.text("about_hero", "Smarter Investing.\nBetter Future.", "Our mission is to make intelligent investing more accessible through AI-driven analytics, real-time market information, and intuitive financial tools.");
  const heroPara2 = cms.text("about_hero_para2", "Rocket Trade is committed to providing a secure, reliable, and transparent platform that enables investors to evaluate market opportunities and make data-informed decisions with greater confidence.").title;
  const valuesHeader = cms.text("about_values_header", "Our Values");
  const peopleHeader = cms.text("about_people_header", "Meet the Team Behind Rocket Trade", "A collaborative team bringing together technology, data, and innovation to build a smarter and more accessible investment platform.");
  const peopleBadge = cms.text("about_people_badge", "OUR PEOPLE").title;
  const teamRole = cms.text("about_team_role", "ROCKET TRADE TEAM").title;
  const valueItems = cms.section("about_values");
  const teamItems = cms.section("about_team");
  const displayedValues = valueItems.length
    ? valueItems
    : values.map((v) => ({ content_id: v.id, title: v.title, description: v.description }));
  const displayedTeam = teamItems.length
    ? teamItems
    : TEAM.map((t) => ({ content_id: t.id, title: t.name, description: t.initials }));
  const heroLines = hero.title.split("\n");
  return (
    <motion.div
      className="relative min-h-screen text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <img
        alt=""
        src={hero.image_url || aboutUsImg}
        className="fixed inset-0 h-full w-full scale-110 object-cover blur-md"
      />
      <div className="fixed inset-0 bg-blue-950/80" />

      <div className="relative z-10">
        <RoleHeader />

        <main className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-20">
          {/* Heading */}
          <section className="mb-14 text-center" style={{ marginTop: 130 }}>
            <h1 className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-7xl">
              {heroLines.map((line, i) => (
                <span key={i}>{line}{i < heroLines.length - 1 && <br />}</span>
              ))}
            </h1>

            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="h-0.75 w-15 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)]" />
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
            </div>
            <div className="mx-auto mt-6 max-w-3xl text-center">
              <p className="mb-4 text-sm leading-7 text-slate-300 md:text-base">
                {hero.description}
              </p>

              <p className="text-sm leading-7 text-slate-300 md:text-base">
                {heroPara2}
              </p>
            </div>

          </section>


          {/* Values */}
          <section className="mt-12" style={{ marginTop: 400 }}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-400/5 px-5 py-2 text-xs font-bold tracking-wider text-cyan-400">
              <Sparkles size={14} />
              {valuesHeader.title.toUpperCase()}
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {displayedValues.map((item, i) => {
                const Icon = VALUE_ICONS[i] || ShieldCheck;

                return (
                  <article
                    key={item.content_id}
                    className="min-h-55 rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition duration-300 hover:-translate-y-1.5 hover:border-cyan-400/50 hover:shadow-lg"
                  >
                    <div className="mb-5 grid h-15 w-15 place-items-center rounded-full border border-cyan-400/40 bg-cyan-50 text-cyan-600">
                      <Icon size={28} strokeWidth={1.8} />
                    </div>

                    <h3 className="mb-2 text-lg font-semibold text-slate-800">
                      {item.title}
                    </h3>

                    <p className="text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Our People */}
          <section className="mt-20">
            <div className="text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-400/5 px-5 py-2 text-xs font-bold tracking-wider text-cyan-400">
                <Users size={14} />
                {peopleBadge}
              </div>

              <h2 className="mt-5 text-3xl font-bold md:text-4xl">
                {peopleHeader.title}
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
                {peopleHeader.description}
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {displayedTeam.map((item) => (
                <article
                  key={item.content_id}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-md transition duration-300 hover:-translate-y-2 hover:border-cyan-400/50 hover:shadow-lg"
                >
                  <div className="relative mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full border border-cyan-400/50 bg-linear-to-br from-cyan-500/20 to-blue-600/20 text-xl font-bold text-cyan-700 shadow-[0_0_20px_rgba(34,211,238,0.1)] transition duration-300 group-hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                    {item.description}

                    <span className="absolute inset-1.25 rounded-full border border-cyan-400/10" />
                  </div>

                  <h3 className="text-base font-semibold leading-6 text-slate-800">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-xs font-medium tracking-wider text-cyan-600">
                    {teamRole}
                  </p>
                </article>
              ))}
            </div>
          </section>

        </main>

        <Footer />
      </div>
    </motion.div>
  );
}

export default AboutUsPage;