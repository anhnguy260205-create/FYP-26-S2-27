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

const values = [
  {
    title: "Trust & Security",
    description:
      "We prioritize the security of user data and investment information through reliable protection and responsible data practices.",
    icon: ShieldCheck,
  },
  {
    title: "AI Innovation",
    description:
      "We apply artificial intelligence and predictive analytics to deliver meaningful market insights and smarter investment tools.",
    icon: Cpu,
  },
  {
    title: "Transparency",
    description:
      "We provide clear and accessible information to support informed and responsible financial decision-making.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "User First",
    description:
      "We design every feature around the needs of investors, focusing on accessibility, usability, and long-term value.",
    icon: Users,
  },
];

function AboutUsPage() {
  return (
    <div className="relative min-h-screen text-white">
      <img
        alt=""
        src={aboutUsImg}
        className="fixed inset-0 h-full w-full scale-110 object-cover blur-md"
      />
      <div className="fixed inset-0 bg-blue-950/80" />

      <div className="relative z-10">
        <RoleHeader />

        <main className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-20">
          {/* Heading */}
          <section className="mb-14 text-center" style={{ marginTop: 100 }}>
            <h1 className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-7xl">
              Smarter Investing.
              <br />
              Better Future.
            </h1>

            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="h-0.75 w-15 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)]" />
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
            </div>
            <div className="mx-auto mt-6 max-w-3xl text-center">
              <p className="mb-4 text-sm leading-7 text-slate-400 md:text-base">
                Our mission is to make intelligent investing more accessible
                through AI-driven analytics, real-time market information, and
                intuitive financial tools.
              </p>

              <p className="text-sm leading-7 text-slate-400 md:text-base">
                Rocket Trade is committed to providing a secure, reliable, and
                transparent platform that enables investors to evaluate market
                opportunities and make data-informed decisions with greater
                confidence.
              </p>
            </div>

          </section>


          {/* Values */}
          <section className="mt-12" style={{ marginTop: 400 }}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-400/5 px-5 py-2 text-xs font-bold tracking-wider text-cyan-400">
              <Sparkles size={14} />
              OUR VALUES
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((value) => {
                const Icon = value.icon;

                return (
                  <article
                    key={value.title}
                    className="min-h-55 rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition duration-300 hover:-translate-y-1.5 hover:border-cyan-400/50 hover:shadow-lg"
                  >
                    <div className="mb-5 grid h-15 w-15 place-items-center rounded-full border border-cyan-400/40 bg-cyan-50 text-cyan-600">
                      <Icon size={28} strokeWidth={1.8} />
                    </div>

                    <h3 className="mb-2 text-lg font-semibold text-slate-800">
                      {value.title}
                    </h3>

                    <p className="text-sm leading-6 text-slate-600">
                      {value.description}
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
                OUR PEOPLE
              </div>

              <h2 className="mt-5 text-3xl font-bold md:text-4xl">
                Meet the Team Behind Rocket Trade
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
                A collaborative team bringing together technology, data, and innovation
                to build a smarter and more accessible investment platform.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {[
                {
                  name: "Nguy Kim Anh",
                  initials: "NKA",
                },
                {
                  name: "Jordan Lim Jun Hong",
                  initials: "JL",
                },
                {
                  name: "Kim Bogyeong",
                  initials: "KB",
                },
                {
                  name: "Lanice Lam Wen Xin",
                  initials: "LL",
                },
                {
                  name: "Lim Ying Xin",
                  initials: "LY",
                },
              ].map((member) => (
                <article
                  key={member.name}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-md transition duration-300 hover:-translate-y-2 hover:border-cyan-400/50 hover:shadow-lg"
                >
                  <div className="relative mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full border border-cyan-400/50 bg-linear-to-br from-cyan-500/20 to-blue-600/20 text-xl font-bold text-cyan-700 shadow-[0_0_20px_rgba(34,211,238,0.1)] transition duration-300 group-hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]">
                    {member.initials}

                    <span className="absolute inset-[-5px] rounded-full border border-cyan-400/10" />
                  </div>

                  <h3 className="text-base font-semibold leading-6 text-slate-800">
                    {member.name}
                  </h3>

                  <p className="mt-2 text-xs font-medium tracking-wider text-cyan-600">
                    ROCKET TRADE TEAM
                  </p>
                </article>
              ))}
            </div>
          </section>

        </main>

        <Footer />
      </div>
    </div>
  );
}

export default AboutUsPage;