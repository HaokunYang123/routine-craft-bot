import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Mouse,
  ShieldCheck,
  Users,
} from "lucide-react";

const COLORS = {
  green: "#3E7E10",
  blue: "#0E4B7B",
  orange: "#CB3D0A",
  background: "#222325",
  heading: "#FFFFFF",
  body: "#A0A0A0",
  dim: "#6B6B6B",
  border: "rgba(255, 255, 255, 0.1)",
  panel: "rgba(255, 255, 255, 0.035)",
};

const BRAND_GRADIENT = `linear-gradient(135deg, ${COLORS.green} 0%, ${COLORS.blue} 100%)`;
const GREEN_WASH = `radial-gradient(circle at top, rgba(62, 126, 16, 0.28), transparent 58%)`;
const NOISE_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.055'/%3E%3C/svg%3E\")";

type FeatureCard = {
  title: string;
  tint: string;
  icon: ReactNode;
  items: string[];
};

type StepCard = {
  color: string;
  label: string;
  sublabel: string;
};

type AudienceBlock = {
  tag: string;
  color: string;
  headline: string;
  body: string;
  cta: string;
};

const featureCards: FeatureCard[] = [
  {
    title: "ASSIGN CHECKLISTS",
    tint: COLORS.green,
    icon: <ClipboardList size={22} strokeWidth={2.25} />,
    items: ["Missed assignments", "Skipped reps", "Forgotten responsibilities"],
  },
  {
    title: "TRACK COMPLETION",
    tint: COLORS.blue,
    icon: <CheckCircle2 size={22} strokeWidth={2.25} />,
    items: ["Complete tasks", "Review progress", "Track streaks"],
  },
  {
    title: "REINFORCE ACCOUNTABILITY",
    tint: COLORS.orange,
    icon: <ShieldCheck size={22} strokeWidth={2.25} />,
    items: ["Set expectations", "Build routines", "Maintain consistency"],
  },
];

const steps: StepCard[] = [
  {
    color: COLORS.green,
    label: "Create a checklist",
    sublabel: "Turn expectations into a repeatable plan.",
  },
  {
    color: COLORS.blue,
    label: "Share with your team or class",
    sublabel: "Everyone sees the same standard from day one.",
  },
  {
    color: COLORS.orange,
    label: "Track progress in real time",
    sublabel: "Completion and follow-through stay visible.",
  },
  {
    color: COLORS.green,
    label: "Build habits that last",
    sublabel: "Small actions compound into durable routines.",
  },
];

const audiences: AudienceBlock[] = [
  {
    tag: "FOR COACHES",
    color: COLORS.green,
    headline: "Stop chasing. Start coaching.",
    body:
      "Assign tasks, track who's doing the work, and know exactly where each athlete or student stands. No spreadsheets. No guessing.",
    cta: "Start Coaching Smarter",
  },
  {
    tag: "FOR PARENTS",
    color: COLORS.blue,
    headline: "See what they're really doing.",
    body:
      "Get real-time visibility into your child's assignments, completion rates, and weekly progress. Connected, not controlling.",
    cta: "Connect to Your Child",
  },
  {
    tag: "FOR SCHOOLS",
    color: COLORS.orange,
    headline: "Scale accountability across your staff.",
    body:
      "Platform-wide analytics. Coach performance. Student outcomes. One dashboard for everything that matters.",
    cta: "See the Dashboard",
  },
];

function useInView<T extends HTMLElement>(
  options: IntersectionObserverInit = { threshold: 0.2, rootMargin: "0px 0px -12% 0px" }
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || inView) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, options);

    observer.observe(element);

    return () => observer.disconnect();
  }, [inView, options]);

  return { ref, inView };
}

function SectionDivider({ color }: { color: string }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 60,
        height: 4,
        borderRadius: 999,
        margin: "0 auto 22px",
        background: `linear-gradient(90deg, ${color}, rgba(255,255,255,0.18))`,
        boxShadow: `0 0 24px ${color}55`,
      }}
    />
  );
}

function getRevealStyle(
  active: boolean,
  options?: { delay?: number; direction?: "up" | "left" | "right"; distance?: number }
): CSSProperties {
  const delay = options?.delay ?? 0;
  const direction = options?.direction ?? "up";
  const distance = options?.distance ?? 36;

  const transform =
    direction === "left"
      ? `translateX(-${distance}px)`
      : direction === "right"
        ? `translateX(${distance}px)`
        : `translateY(${distance}px)`;

  return {
    opacity: active ? 1 : 0,
    transform: active ? "translate3d(0, 0, 0)" : transform,
    transition: `opacity 700ms ease ${delay}ms, transform 700ms ease ${delay}ms`,
    willChange: "opacity, transform",
  };
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  const teachSection = useInView<HTMLDivElement>();
  const stepsSection = useInView<HTMLDivElement>();
  const quoteSection = useInView<HTMLDivElement>();
  const finalCtaSection = useInView<HTMLDivElement>();
  const audienceOne = useInView<HTMLDivElement>();
  const audienceTwo = useInView<HTMLDivElement>();
  const audienceThree = useInView<HTMLDivElement>();
  const audienceRefs = [audienceOne, audienceTwo, audienceThree];

  useEffect(() => {
    const handleScroll = () => {
      const nextScrolled = window.scrollY > 50;
      setScrolled(nextScrolled);
      setShowScrollIndicator(window.scrollY < 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    background: COLORS.background,
    color: COLORS.heading,
    fontFamily: '"Source Sans 3", sans-serif',
    position: "relative",
    overflowX: "hidden",
  };

  const sectionStyle: CSSProperties = {
    width: "min(1180px, calc(100% - 32px))",
    margin: "0 auto",
  };

  const primaryButtonStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 54,
    padding: "0 24px",
    borderRadius: 999,
    border: `1px solid ${COLORS.green}`,
    background: COLORS.green,
    color: COLORS.heading,
    textDecoration: "none",
    fontFamily: '"Oswald", sans-serif',
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    boxShadow: `0 16px 48px ${COLORS.green}30`,
  };

  const secondaryButtonStyle: CSSProperties = {
    ...primaryButtonStyle,
    background: "transparent",
    border: `1px solid rgba(255,255,255,0.24)`,
    color: COLORS.heading,
    boxShadow: "none",
  };

  return (
    <div style={pageStyle}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');

        @keyframes tcc-fade-up {
          from {
            opacity: 0;
            transform: translate3d(0, 34px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes tcc-pulse {
          0%,
          100% {
            opacity: 0.48;
            transform: translateY(0);
          }
          50% {
            opacity: 1;
            transform: translateY(8px);
          }
        }

        @media (max-width: 960px) {
          .tcc-feature-grid,
          .tcc-steps-grid,
          .tcc-footer,
          .tcc-audience-block {
            grid-template-columns: 1fr !important;
          }

          .tcc-audience-copy {
            order: 2;
          }

          .tcc-audience-panel {
            min-height: 220px !important;
          }
        }

        @media (max-width: 720px) {
          .tcc-nav-inner,
          .tcc-hero-buttons {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .tcc-nav-actions {
            width: 100%;
            justify-content: space-between !important;
          }

          .tcc-hero-buttons > * {
            width: 100%;
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: NOISE_TEXTURE,
          opacity: 0.32,
          mixBlendMode: "soft-light",
          zIndex: 1,
        }}
      />

      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          transition: "background 220ms ease, backdrop-filter 220ms ease, border-color 220ms ease",
          background: scrolled ? "rgba(34, 35, 37, 0.88)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "blur(0px)",
          borderBottom: scrolled ? `1px solid ${COLORS.border}` : "1px solid transparent",
        }}
      >
        <div
          className="tcc-nav-inner"
          style={{
            ...sectionStyle,
            minHeight: 84,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
          }}
        >
          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
              color: COLORS.heading,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: BRAND_GRADIENT,
                display: "grid",
                placeItems: "center",
                boxShadow: `0 10px 32px ${COLORS.blue}33`,
                fontFamily: '"Oswald", sans-serif',
                fontWeight: 700,
                fontSize: 18,
                letterSpacing: "0.02em",
              }}
            >
              T
            </div>
            <span
              style={{
                fontFamily: '"Oswald", sans-serif',
                fontSize: 18,
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              TeachCoachConnect
            </span>
          </Link>

          <div
            className="tcc-nav-actions"
            style={{ display: "flex", alignItems: "center", gap: 16 }}
          >
            <Link
              to="/auth"
              style={{
                color: COLORS.body,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 400,
                fontFamily: '"Source Sans 3", sans-serif',
              }}
            >
              Log In
            </Link>
            <Link to="/auth?signup=true" style={{ ...primaryButtonStyle, minHeight: 46, fontSize: 15 }}>
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 2 }}>
        <section
          style={{
            position: "relative",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            paddingTop: 120,
            paddingBottom: 72,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "12% auto auto 50%",
              width: "min(70vw, 720px)",
              height: "min(70vw, 720px)",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(62,126,16,0.26) 0%, rgba(14,75,123,0.12) 38%, transparent 74%)",
              transform: "translateX(-50%)",
              filter: "blur(26px)",
            }}
          />
          <div style={sectionStyle}>
            <div style={{ maxWidth: 920, margin: "0 auto", textAlign: "center", position: "relative" }}>
              <p
                style={{
                  margin: "0 0 18px",
                  color: COLORS.body,
                  fontSize: 14,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontFamily: '"Oswald", sans-serif',
                  animation: "tcc-fade-up 640ms ease 80ms both",
                }}
              >
                Commit. Track. Follow Through.
              </p>
              <h1
                style={{
                  margin: 0,
                  fontFamily: '"Oswald", sans-serif',
                  fontSize: "clamp(42px, 7vw, 80px)",
                  lineHeight: 0.96,
                  letterSpacing: "-0.02em",
                  textTransform: "uppercase",
                  animation: "tcc-fade-up 760ms ease 160ms both",
                }}
              >
                <span style={{ display: "block" }}>Starting Is Easy.</span>
                <span
                  style={{
                    display: "block",
                    backgroundImage: BRAND_GRADIENT,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Finishing Is Hard.
                </span>
              </h1>
              <p
                style={{
                  maxWidth: 720,
                  margin: "26px auto 0",
                  color: COLORS.body,
                  fontSize: "clamp(18px, 2.1vw, 24px)",
                  lineHeight: 1.45,
                  fontWeight: 300,
                  animation: "tcc-fade-up 760ms ease 260ms both",
                }}
              >
                A simple tool for coaches and teachers to track commitment, effort, and follow-through.
              </p>
              <div
                className="tcc-hero-buttons"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  marginTop: 34,
                  animation: "tcc-fade-up 760ms ease 360ms both",
                }}
              >
                <Link to="/auth?signup=true" style={primaryButtonStyle}>
                  Sign Up
                  <ArrowRight size={18} />
                </Link>
                <a href="#how-it-works" style={secondaryButtonStyle}>
                  See How It Works
                </a>
              </div>
            </div>
          </div>

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "50%",
              bottom: 28,
              transform: "translateX(-50%)",
              opacity: showScrollIndicator ? 1 : 0,
              transition: "opacity 220ms ease",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                color: COLORS.dim,
                animation: "tcc-pulse 1.6s ease-in-out infinite",
              }}
            >
              <Mouse size={22} />
              <span
                style={{
                  fontFamily: '"Oswald", sans-serif',
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                Scroll
              </span>
            </div>
          </div>
        </section>

        <section style={{ padding: "40px 0 24px" }}>
          <div ref={teachSection.ref} style={sectionStyle}>
            <div
              style={{
                textAlign: "center",
                maxWidth: 900,
                margin: "0 auto",
                ...getRevealStyle(teachSection.inView),
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: '"Oswald", sans-serif',
                  fontSize: "clamp(32px, 5vw, 52px)",
                  textTransform: "uppercase",
                  letterSpacing: "-0.015em",
                }}
              >
                <span>Teach.</span>{" "}
                <span
                  style={{
                    backgroundImage: "linear-gradient(135deg, #3E7E10 0%, #64B928 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  Coach.
                </span>{" "}
                <span>Connect.</span>
              </h2>
              <p
                style={{
                  margin: "18px auto 0",
                  maxWidth: 760,
                  color: COLORS.body,
                  fontSize: 20,
                  lineHeight: 1.55,
                }}
              >
                TeachCoachConnect gives coaches and teachers a simple way to assign, track, and reinforce accountability without micromanaging.
              </p>
            </div>

            <div
              className="tcc-feature-grid"
              style={{
                marginTop: 42,
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 20,
              }}
            >
              {featureCards.map((card, index) => (
                <article
                  key={card.title}
                  style={{
                    borderRadius: 26,
                    padding: 28,
                    background: `linear-gradient(180deg, ${card.tint}1F 0%, rgba(255,255,255,0.025) 100%)`,
                    border: `1px solid ${card.tint}55`,
                    boxShadow: `0 24px 60px ${card.tint}15`,
                    ...getRevealStyle(teachSection.inView, { delay: index * 140 }),
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      display: "grid",
                      placeItems: "center",
                      background: `${card.tint}26`,
                      color: COLORS.heading,
                      marginBottom: 20,
                    }}
                  >
                    {card.icon}
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: '"Oswald", sans-serif',
                      fontSize: 24,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {card.title}
                  </h3>
                  <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                    {card.items.map((item) => (
                      <div
                        key={item}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          color: COLORS.body,
                          fontSize: 18,
                        }}
                      >
                        <Check size={16} color={card.tint} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" style={{ padding: "96px 0 28px", scrollMarginTop: 120 }}>
          <div ref={stepsSection.ref} style={sectionStyle}>
            <SectionDivider color={COLORS.green} />
            <div
              style={{
                textAlign: "center",
                ...getRevealStyle(stepsSection.inView),
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: '"Oswald", sans-serif',
                  fontSize: "clamp(32px, 4.8vw, 50px)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                How It Works
              </h2>
            </div>
            <div
              className="tcc-steps-grid"
              style={{
                marginTop: 38,
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 18,
              }}
            >
              {steps.map((step, index) => (
                <div
                  key={step.label}
                  style={{
                    padding: 24,
                    borderRadius: 24,
                    background: COLORS.panel,
                    border: `1px solid ${COLORS.border}`,
                    textAlign: "center",
                    ...getRevealStyle(stepsSection.inView, { delay: index * 120 }),
                  }}
                >
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      margin: "0 auto 18px",
                      borderRadius: 18,
                      display: "grid",
                      placeItems: "center",
                      background: step.color,
                      color: COLORS.heading,
                      fontFamily: '"Oswald", sans-serif',
                      fontSize: 24,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {index + 1}
                  </div>
                  <div
                    style={{
                      color: COLORS.heading,
                      fontFamily: '"Oswald", sans-serif',
                      fontSize: 22,
                      lineHeight: 1.1,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                    }}
                  >
                    {step.label}
                  </div>
                  <p
                    style={{
                      margin: "12px 0 0",
                      color: COLORS.body,
                      fontSize: 17,
                      lineHeight: 1.5,
                    }}
                  >
                    {step.sublabel}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "88px 0 24px" }}>
          <div style={{ ...sectionStyle, display: "grid", gap: 24 }}>
            {audiences.map((audience, index) => {
              const alignedRight = index % 2 === 1;
              const audienceRef = audienceRefs[index];

              return (
                <div
                  key={audience.tag}
                  ref={audienceRef.ref}
                  className="tcc-audience-block"
                  style={{
                    display: "grid",
                    gridTemplateColumns: alignedRight ? "0.9fr 1.1fr" : "1.1fr 0.9fr",
                    gap: 22,
                    alignItems: "stretch",
                  }}
                >
                  <div
                    className="tcc-audience-copy"
                    style={{
                      order: alignedRight ? 2 : 1,
                      borderRadius: 30,
                      padding: "34px clamp(24px, 4vw, 40px)",
                      background: "rgba(255,255,255,0.028)",
                      border: `1px solid ${COLORS.border}`,
                      ...getRevealStyle(audienceRef.inView, {
                        delay: 80,
                        direction: alignedRight ? "right" : "left",
                      }),
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 14px",
                        borderRadius: 999,
                        background: `${audience.color}26`,
                        color: audience.color,
                        fontFamily: '"Oswald", sans-serif',
                        fontSize: 14,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                      }}
                    >
                      {audience.tag}
                    </div>
                    <h3
                      style={{
                        margin: "22px 0 0",
                        fontFamily: '"Oswald", sans-serif',
                        fontSize: "clamp(32px, 4vw, 46px)",
                        lineHeight: 1,
                        letterSpacing: "-0.015em",
                        textTransform: "uppercase",
                      }}
                    >
                      {audience.headline}
                    </h3>
                    <p
                      style={{
                        margin: "18px 0 0",
                        color: COLORS.body,
                        fontSize: 20,
                        lineHeight: 1.55,
                        maxWidth: 620,
                      }}
                    >
                      {audience.body}
                    </p>
                    <div style={{ marginTop: 26 }}>
                      <Link
                        to="/auth?signup=true"
                        style={{
                          ...primaryButtonStyle,
                          background: audience.color,
                          borderColor: audience.color,
                          boxShadow: `0 18px 50px ${audience.color}33`,
                        }}
                      >
                        {audience.cta}
                      </Link>
                    </div>
                  </div>

                  <div
                    className="tcc-audience-panel"
                    aria-hidden="true"
                    style={{
                      order: alignedRight ? 1 : 2,
                      minHeight: 280,
                      borderRadius: 30,
                      background: `linear-gradient(145deg, ${audience.color}1A 0%, rgba(255,255,255,0.02) 70%)`,
                      border: `1px solid ${audience.color}33`,
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 90px ${audience.color}16`,
                      position: "relative",
                      overflow: "hidden",
                      ...getRevealStyle(audienceRef.inView, {
                        delay: 180,
                        direction: alignedRight ? "left" : "right",
                      }),
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 38%), radial-gradient(circle at 20% 18%, rgba(255,255,255,0.16), transparent 36%)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 26,
                        borderRadius: 24,
                        border: `1px solid ${audience.color}55`,
                        background: `linear-gradient(180deg, rgba(34,35,37,0.08) 0%, rgba(34,35,37,0.38) 100%)`,
                        padding: 24,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 10,
                            color: COLORS.heading,
                            fontFamily: '"Oswald", sans-serif',
                            fontSize: 18,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          <Users size={18} color={audience.color} />
                          Visibility
                        </div>
                        <div
                          style={{
                            color: audience.color,
                            fontFamily: '"Oswald", sans-serif',
                            fontSize: 13,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                          }}
                        >
                          Live
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: 12 }}>
                        {["Commitment", "Effort", "Follow-through"].map((label, itemIndex) => (
                          <div
                            key={label}
                            style={{
                              display: "grid",
                              gap: 8,
                              padding: "14px 16px",
                              borderRadius: 18,
                              background: "rgba(255,255,255,0.04)",
                              border: `1px solid ${COLORS.border}`,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                color: COLORS.heading,
                                fontSize: 15,
                                fontWeight: 600,
                              }}
                            >
                              <span>{label}</span>
                              <span style={{ color: COLORS.body }}>{88 - itemIndex * 9}%</span>
                            </div>
                            <div
                              style={{
                                height: 8,
                                borderRadius: 999,
                                background: "rgba(255,255,255,0.08)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${88 - itemIndex * 9}%`,
                                  height: "100%",
                                  borderRadius: 999,
                                  background: audience.color,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ padding: "84px 0 12px" }}>
          <div ref={quoteSection.ref} style={sectionStyle}>
            <div
              style={{
                borderRadius: 34,
                padding: "52px 28px",
                textAlign: "center",
                background: `${GREEN_WASH}, linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.02))`,
                border: `1px solid ${COLORS.border}`,
                ...getRevealStyle(quoteSection.inView),
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: '"Oswald", sans-serif',
                  fontStyle: "italic",
                  fontSize: "clamp(28px, 5vw, 48px)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.015em",
                }}
              >
                Accountability turns intention into action.
              </p>
              <p
                style={{
                  margin: "18px 0 0",
                  color: COLORS.body,
                  fontSize: 18,
                }}
              >
                — TeachCoachConnect
              </p>
            </div>
          </div>
        </section>

        <section style={{ padding: "88px 0 96px" }}>
          <div ref={finalCtaSection.ref} style={sectionStyle}>
            <SectionDivider color={COLORS.orange} />
            <div
              style={{
                textAlign: "center",
                maxWidth: 720,
                margin: "0 auto",
                ...getRevealStyle(finalCtaSection.inView),
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontFamily: '"Oswald", sans-serif',
                  fontSize: "clamp(34px, 5vw, 58px)",
                  lineHeight: 0.98,
                  textTransform: "uppercase",
                  letterSpacing: "-0.015em",
                }}
              >
                Ready To Build Real Habits?
              </h2>
              <p
                style={{
                  margin: "18px 0 0",
                  color: COLORS.body,
                  fontSize: 22,
                  lineHeight: 1.45,
                }}
              >
                Start free. No credit card required.
              </p>
              <div style={{ marginTop: 28 }}>
                <Link to="/auth?signup=true" style={primaryButtonStyle}>
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer
        className="tcc-footer"
        style={{
          ...sectionStyle,
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 12,
          padding: "24px 0 36px",
          borderTop: `1px solid ${COLORS.border}`,
          color: COLORS.body,
          fontSize: 15,
        }}
      >
        <span style={{ color: COLORS.heading }}>TeachCoachConnect</span>
        <span>Built by Noctworks</span>
      </footer>
    </div>
  );
}
