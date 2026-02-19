import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Loader2 } from "lucide-react";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { useAuth } from "@/hooks/useAuth";

const FEATURES = [
  {
    icon: "assignment",
    title: "Task Management",
    description:
      "Assign and schedule tasks for individuals or groups. Track completion in real time.",
  },
  {
    icon: "forum",
    title: "Smart Communication",
    description:
      "Share notes with students directly or by group. Everyone stays aligned.",
  },
  {
    icon: "family_restroom",
    title: "Parent Visibility",
    description:
      "Parents link with a simple code and see their child's schedule and notes. Read only, zero friction.",
  },
];

const HOW_IT_WORKS = [
  {
    title: "Create your group",
    description: "Set up a group and invite students with a join code or QR scan.",
  },
  {
    title: "Assign tasks and share notes",
    description: "Build schedules, assign tasks, and communicate through the notes feed.",
  },
  {
    title: "Students and parents stay connected",
    description:
      "Students track their own progress. Parents link with a code for read only visibility.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/app", { replace: true });
    }
  }, [loading, navigate, user]);

  const scrollToAuthSection = () => {
    const section = document.getElementById("auth-section");
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="coach-theme dark min-h-screen bg-[#222325] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="coach-theme dark min-h-screen bg-[#222325] text-white">
      <header className="sticky top-0 z-40 border-b border-[#3A3A3D] bg-[#222325]/95 backdrop-blur supports-[backdrop-filter]:bg-[#222325]/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <button
            type="button"
            onClick={scrollToAuthSection}
            className="flex items-center gap-2 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3E7E10]/20">
              <span className="material-icons text-[22px] text-[#3E7E10]">school</span>
            </div>
            <span className="text-base font-semibold md:text-lg">TeachCoachConnect</span>
          </button>

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={scrollToAuthSection}
              className="h-11 rounded-lg border border-[#0E4B7B] px-5 text-sm font-semibold text-[#9BC8EE] transition-colors hover:bg-[#0E4B7B]/15"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={scrollToAuthSection}
              className="h-11 rounded-lg bg-[#3E7E10] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4A9415]"
            >
              Get Started
            </button>
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#3A3A3D] text-white md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-[#3A3A3D] px-4 py-3 md:hidden">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={scrollToAuthSection}
                className="h-11 rounded-lg border border-[#0E4B7B] px-4 text-sm font-semibold text-[#9BC8EE] text-left"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={scrollToAuthSection}
                className="h-11 rounded-lg bg-[#3E7E10] px-4 text-sm font-semibold text-white text-left"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#3E7E10]/25 via-[#3E7E10]/10 to-transparent" />
          <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 text-center md:px-6 md:pt-24">
            <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-white md:text-5xl">
              The smarter way to coach, track, and connect.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-[#B0B0B0] md:text-lg">
              Assign tasks, monitor progress, and keep parents in the loop. All in one place.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={scrollToAuthSection}
                className="h-11 min-w-[160px] rounded-lg bg-[#3E7E10] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#4A9415]"
              >
                Get Started
              </button>
              <button
                type="button"
                onClick={scrollToAuthSection}
                className="h-11 min-w-[160px] rounded-lg border border-[#0E4B7B] px-6 text-sm font-semibold text-[#9BC8EE] transition-colors hover:bg-[#0E4B7B]/15"
              >
                Sign In
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
          <h2 className="text-center text-3xl font-bold text-white">Features</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#B0B0B0]">
            Designed for coaches, students, and families to stay aligned every day.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="rounded-xl border border-[#3A3A3D] bg-[#2A2A2D] p-6 transition-colors hover:border-[#3E7E10]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#3E7E10]/20">
                  <span className="material-icons text-[24px] text-[#3E7E10]">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#B0B0B0]">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-14">
          <h2 className="text-center text-3xl font-bold text-white">How It Works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#B0B0B0]">
            A simple flow that keeps everyone connected without extra steps.
          </p>

          <div className="mt-8 space-y-6 lg:hidden">
            {HOW_IT_WORKS.map((step, index) => (
              <div key={step.title} className="relative pl-12">
                {index < HOW_IT_WORKS.length - 1 && (
                  <span className="absolute left-[19px] top-10 h-[calc(100%-12px)] w-px bg-[#3A3A3D]" />
                )}
                <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#CB3D0A] text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div className="rounded-xl border border-[#3A3A3D] bg-[#2A2A2D] p-5">
                  <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#B0B0B0]">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-10 hidden lg:block">
            <div className="absolute left-[16.66%] right-[16.66%] top-5 h-px bg-[#3A3A3D]" />
            <div className="grid grid-cols-3 gap-6">
              {HOW_IT_WORKS.map((step, index) => (
                <div key={step.title} className="text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#CB3D0A] text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="mt-4 rounded-xl border border-[#3A3A3D] bg-[#2A2A2D] p-6">
                    <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#B0B0B0]">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="auth-section" className="scroll-mt-24 px-4 py-16 md:px-6 md:py-20">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-center text-3xl font-bold text-white">Get Started Today</h2>
            <div className="mx-auto mt-8 w-full max-w-[440px] rounded-xl border border-[#3A3A3D] bg-[#2A2A2D] p-5 md:p-6">
              <AuthTabs />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#3A3A3D] px-4 py-8 text-center md:px-6">
        <p className="text-sm font-semibold text-white">Built by Noctworks</p>
        <p className="mt-2 text-xs text-[#B0B0B0]">© 2026 TeachCoachConnect. All rights reserved.</p>
      </footer>
    </div>
  );
}
