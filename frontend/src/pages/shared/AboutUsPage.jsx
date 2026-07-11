import {
  ShieldCheck,
  Cpu,
  ChartNoAxesCombined,
  Users,
  Sparkles,
} from "lucide-react";

import Header from "../../layout/Header.jsx";
import Footer from "../../layout/Footer.jsx";

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
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_50%_30%,rgba(29,78,216,0.22),transparent_35%),linear-gradient(135deg,#020817_0%,#061630_50%,#020817_100%)] text-white">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-20">
        {/* Heading */}
        <section className="mb-14 text-center">
          <h1 className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-7xl">
            About Us
          </h1>

          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="h-0.75 w-15 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)]" />
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
          </div>

          <p className="mt-4 text-base leading-7 text-slate-400 md:text-lg">
            Empowering investors with AI-driven insights
            <br />
            to navigate the financial future.
          </p>
        </section>

        {/* Mission */}
        <section className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.5fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-400/5 px-5 py-2 text-xs font-bold tracking-wider text-cyan-400">
              <Sparkles size={14} />
              OUR MISSION
            </div>

            <h2 className="mb-6 text-3xl font-bold leading-tight md:text-4xl">
              Smarter Investing.
              <br />
              Better Future.
            </h2>

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

          {/* Visual */}
          <div className="relative min-h-90 overflow-hidden rounded-2xl border border-blue-500/30 bg-[radial-gradient(circle_at_center,rgba(0,132,255,0.25),transparent_48%),linear-gradient(rgba(1,16,45,0.4),rgba(5,27,72,0.75))] shadow-2xl">
            <div className="absolute bottom-[-80px] left-1/2 h-55 w-105 -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />

            {/* Globe */}
            <div className="absolute left-1/2 top-9 h-48 w-48 -translate-x-1/2 rounded-full border-2 border-cyan-400/80 bg-[radial-gradient(circle_at_35%_30%,#0cd7ff_0%,transparent_9%),radial-gradient(circle_at_55%_52%,#0568ff_0%,#031a5b_47%,#02091d_75%)] shadow-[0_0_30px_rgba(0,174,255,0.65)]">
              <div className="absolute inset-4 rounded-full border border-cyan-300/30" />
              <div className="absolute inset-x-3 top-1/2 h-12 -translate-y-1/2 rounded-full border-y border-cyan-300/30" />
              <div className="absolute left-1/2 top-0 h-full w-1/2 -translate-x-1/2 rounded-full border-x border-cyan-300/30" />
            </div>

            {/* Left chart */}
            <div className="absolute left-8 top-14 h-22 w-28 rounded-xl border border-blue-400/20 bg-blue-950/80 p-4">
              <div className="mb-4 h-1 w-10 rounded-full bg-blue-300" />

              <div className="flex h-9 items-end gap-1.5">
                {[25, 55, 38, 75, 60].map((height, index) => (
                  <span
                    key={index}
                    className="w-2 rounded-t bg-linear-to-t from-blue-700 to-cyan-400"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Right chart */}
            <div className="absolute right-8 top-12 flex h-22 w-32 items-center gap-3 rounded-xl border border-blue-400/20 bg-blue-950/80 p-4">
              <div className="h-10 w-10 rounded-full bg-[conic-gradient(#10c9ff_0deg_115deg,#126ae6_115deg_245deg,#04264f_245deg)]" />

              <div className="flex flex-1 flex-col gap-2">
                <span className="h-1 rounded bg-blue-700" />
                <span className="h-1 w-3/4 rounded bg-blue-700" />
                <span className="h-1 w-1/2 rounded bg-blue-700" />
              </div>
            </div>

            {/* Growth bars */}
            <div className="absolute inset-x-16 bottom-8 flex h-36 items-end justify-center gap-3">
              {[22, 30, 38, 48, 60, 72, 55, 82].map((height, index) => (
                <span
                  key={index}
                  className="w-5 border border-cyan-300/60 bg-linear-to-t from-blue-800/40 to-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.35)]"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="mt-12">
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
                  className="min-h-55 rounded-2xl border border-blue-500/20 bg-linear-to-br from-blue-950/60 to-slate-950/80 p-6 shadow-xl transition duration-300 hover:-translate-y-1.5 hover:border-cyan-400/50"
                >
                  <div className="mb-5 grid h-15 w-15 place-items-center rounded-full border border-cyan-400/40 bg-cyan-400/5 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
                    <Icon size={28} strokeWidth={1.8} />
                  </div>

                  <h3 className="mb-2 text-lg font-semibold">
                    {value.title}
                  </h3>

                  <p className="text-sm leading-6 text-slate-400">
                    {value.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
        
        {/* Our People */}
        <section className="mt-20">
        <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-400/5 px-5 py-2 text-xs font-bold tracking-wider text-cyan-400">
            <Users size={14} />
            OUR PEOPLE
            </div>

            <h2 className="mt-5 text-3xl font-bold md:text-4xl">
            Meet the Team Behind Rocket Trade
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
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
                className="group rounded-2xl border border-blue-500/20 bg-linear-to-br from-blue-950/60 to-slate-950/80 p-6 text-center shadow-xl transition duration-300 hover:-translate-y-2 hover:border-cyan-400/50 hover:shadow-[0_15px_40px_rgba(34,211,238,0.1)]"
            >
                {/* Profile Avatar */}
                <div className="relative mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full border border-cyan-400/50 bg-linear-to-br from-cyan-500/20 to-blue-600/20 text-xl font-bold text-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.18)] transition duration-300 group-hover:shadow-[0_0_35px_rgba(34,211,238,0.3)]">
                {member.initials}

                <span className="absolute inset-[-5px] rounded-full border border-cyan-400/10" />
                </div>

                <h3 className="text-base font-semibold leading-6 text-white">
                {member.name}
                </h3>

                <p className="mt-2 text-xs font-medium tracking-wider text-cyan-400">
                ROCKET TRADE TEAM
                </p>
            </article>
            ))}
        </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}

export default AboutUsPage;