"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { trackCTAEvent } from "@/lib/analytics";

const KEYFRAMES = `
  @keyframes hiw-fade-in-up {
    from { opacity:0; transform:translateY(8px); }
    to   { opacity:1; transform:translateY(0);   }
  }
  @keyframes hiw-bar-fill {
    0%,12%   { width:0%;  }
    78%,100% { width:64%; }
  }
  @keyframes hiw-note-a {
    0%   { transform:translate(0,0)       rotate(-6deg);  opacity:.9; }
    100% { transform:translate(5px,-38px)  rotate(14deg); opacity:0;  }
  }
  @keyframes hiw-note-b {
    0%   { transform:translate(0,0)        rotate(5deg);   opacity:.75; }
    100% { transform:translate(-7px,-30px) rotate(-12deg); opacity:0;   }
  }
  @keyframes hiw-dot-travel {
    0%   { left:4px;                opacity:0; }
    12%  {                          opacity:1; }
    88%  {                          opacity:1; }
    100% { left:calc(100% - 12px); opacity:0; }
  }
  @keyframes hiw-download-pulse {
    0%,100% { box-shadow:0 4px 16px rgba(239,71,111,0.45); transform:scale(1);    }
    50%     { box-shadow:0 6px 24px rgba(239,71,111,0.7);  transform:scale(1.02); }
  }
  @keyframes hiw-check-pop {
    0%   { transform:scale(0) rotate(-20deg); opacity:0; }
    60%  { transform:scale(1.2) rotate(5deg); opacity:1; }
    100% { transform:scale(1)  rotate(0deg); opacity:1; }
  }
`;

/* ── light-mode shared styles for visual inner components ── */
const VL = {
  fontFamily: "var(--font-montserrat),sans-serif",
  fontSize: 9,
  fontWeight: 600 as const,
  color: "rgba(7,59,76,0.45)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  marginBottom: 3,
};
const VB = {
  fontFamily: "var(--font-poppins),sans-serif",
  fontWeight: 700 as const,
  fontSize: 12,
  color: "#073B4C",
};
const VR = {
  display: "flex" as const,
  alignItems: "center" as const,
  gap: 10,
  padding: "10px 12px",
  borderRadius: 10,
};

/* ── STEP 1 ── */
const SHARE_FIELDS = [
  { label: "Occasion", value: "Birthday 🎂" },
  { label: "Recipient's name", value: "Priya" },
  { label: "Your story", value: "She's my best friend since college…" },
];

function ShareStoryVisual({ active }: { active: boolean }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (shown < SHARE_FIELDS.length) {
      const t = setTimeout(() => setShown((p) => p + 1), 1100);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setShown(0), 3200);
      return () => clearTimeout(t);
    }
  }, [shown, active]);

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {SHARE_FIELDS.map((f, i) => (
        <div
          key={f.label}
          style={{
            ...VR,
            background:
              i < shown ? "rgba(255,209,102,0.18)" : "rgba(7,59,76,0.04)",
            border: `1.5px solid ${i < shown ? "rgba(255,209,102,0.65)" : "rgba(7,59,76,0.09)"}`,
            opacity: i < shown ? 1 : 0.6,
            transition: "all 0.55s ease",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={VL}>{f.label}</div>
            <div
              style={{
                ...VB,
                color: i < shown ? "#073B4C" : "rgba(7,59,76,0.35)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {i < shown ? f.value : "…"}
            </div>
          </div>
          {i < shown && (
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#FFD166",
                color: "#073B4C",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 900,
                flexShrink: 0,
                animation:
                  "hiw-check-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
                fontFamily: "var(--font-poppins),sans-serif",
              }}
            >
              ✓
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── STEP 2 ── */
const PAYMENT_LYRIC_LINES = [
  "Happy birthday dear Priya,",
  "Through every high and low you stay—",
  "This song's for you in every way.",
];

function PaymentVisual({ active }: { active: boolean }) {
  type Stage = "lyrics" | "checkout" | "paid";
  const [stage, setStage] = useState<Stage>("lyrics");
  const [lyricShown, setLyricShown] = useState(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!cancelled) resolve();
        }, ms);
      });

    (async () => {
      while (!cancelled) {
        setStage("lyrics");
        setLyricShown(0);
        for (let i = 1; i <= PAYMENT_LYRIC_LINES.length; i++) {
          await wait(680);
          if (cancelled) return;
          setLyricShown(i);
        }
        await wait(520);
        if (cancelled) return;
        setStage("checkout");
        await wait(2400);
        if (cancelled) return;
        setStage("paid");
        await wait(2600);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active]);

  if (stage === "lyrics") {
    return (
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            ...VR,
            flexDirection: "column",
            alignItems: "stretch",
            background: "#fff",
            border: "1.5px solid rgba(239,71,111,0.22)",
            boxShadow: "0 2px 10px rgba(7,59,76,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  ...VL,
                  fontSize: 8,
                  color: "#EF476F",
                  marginBottom: 4,
                }}
              >
                AI-generated lyrics
              </div>
              <div style={{ ...VB, fontSize: 11 }}>Birthday Song for Priya</div>
            </div>
            <span
              style={{
                fontFamily: "var(--font-montserrat),sans-serif",
                fontSize: 8,
                fontWeight: 600,
                color: "rgba(7,59,76,0.45)",
                flexShrink: 0,
              }}
            >
              Edit
            </span>
          </div>
          <div
            style={{
              marginTop: 6,
              paddingTop: 8,
              borderTop: "1px solid rgba(7,59,76,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            {PAYMENT_LYRIC_LINES.slice(0, lyricShown).map((line) => (
              <div
                key={line}
                style={{
                  fontFamily: "var(--font-montserrat),sans-serif",
                  fontSize: 9,
                  fontWeight: 500,
                  fontStyle: "italic",
                  color: "rgba(7,59,76,0.85)",
                  lineHeight: 1.35,
                  animation: "hiw-fade-in-up 0.45s ease both",
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-montserrat),sans-serif",
            fontSize: 8,
            fontWeight: 600,
            color: "rgba(7,59,76,0.4)",
            textAlign: "center",
          }}
        >
          Review, edit if you like — then continue to pay
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        animation: "hiw-fade-in-up 0.45s ease both",
      }}
    >
      <div
        style={{
          ...VR,
          justifyContent: "space-between",
          background: "rgba(7,59,76,0.04)",
          border: "1.5px solid rgba(7,59,76,0.09)",
        }}
      >
        <div>
          <div style={VL}>Your Song</div>
          <div style={VB}>Birthday Song for Priya</div>
        </div>
        <span
          style={{
            fontFamily: "var(--font-poppins),sans-serif",
            fontWeight: 700,
            fontSize: 16,
            color: "#EF476F",
          }}
        >
          ₹199
        </span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {["UPI", "Card", "Net Banking"].map((m) => (
          <div
            key={m}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "6px 4px",
              borderRadius: 8,
              background: "rgba(7,59,76,0.04)",
              border: "1px solid rgba(7,59,76,0.09)",
              fontFamily: "var(--font-montserrat),sans-serif",
              fontSize: 9,
              fontWeight: 600,
              color: "rgba(7,59,76,0.5)",
            }}
          >
            {m}
          </div>
        ))}
      </div>
      {stage === "checkout" ? (
        <div
          style={{
            background: "#EF476F",
            color: "#fff",
            fontFamily: "var(--font-poppins),sans-serif",
            fontWeight: 700,
            fontSize: 12,
            textAlign: "center",
            padding: "11px 0",
            borderRadius: 10,
          }}
        >
          Pay ₹199 →
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: "rgba(34,197,94,0.1)",
            border: "1.5px solid rgba(34,197,94,0.4)",
            padding: "11px 0",
            borderRadius: 10,
            animation: "hiw-fade-in-up 0.4s ease both",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#22c55e",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 900,
              fontFamily: "var(--font-poppins),sans-serif",
              animation:
                "hiw-check-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
          >
            ✓
          </div>
          <span
            style={{
              fontFamily: "var(--font-poppins),sans-serif",
              fontWeight: 700,
              fontSize: 12,
              color: "#16a34a",
            }}
          >
            Payment Successful!
          </span>
        </div>
      )}
    </div>
  );
}

/* ── STEP 3 ── */
function ReceiveVisual({ active }: { active: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          borderRadius: 10,
          padding: "11px 13px",
          background: "rgba(7,59,76,0.04)",
          border: "1px solid rgba(7,59,76,0.09)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginBottom: 11,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "rgba(255,209,102,0.2)",
              border: "1px solid rgba(255,209,102,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            🎵
          </div>
          <div>
            <div style={VB}>Birthday Song for Priya</div>
            <div
              style={{
                fontFamily: "var(--font-montserrat),sans-serif",
                fontSize: 10,
                color: "rgba(7,59,76,0.5)",
                marginTop: 1,
              }}
            >
              Heartfelt Ballad · 3:24
            </div>
          </div>
        </div>
        <div
          style={{
            height: 5,
            borderRadius: 5,
            background: "rgba(7,59,76,0.1)",
            marginBottom: 9,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              borderRadius: 5,
              background: "linear-gradient(90deg,#FFD166,#EF476F)",
              animation: active
                ? "hiw-bar-fill 3.5s ease-out 0.3s infinite"
                : "none",
              width: 0,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          {(["⏮", "⏪", "▶", "⏩", "⏭"] as const).map((c) => (
            <span
              key={c}
              style={{
                fontSize: c === "▶" ? 17 : 11,
                color: c === "▶" ? "#EF476F" : "rgba(7,59,76,0.4)",
              }}
              aria-hidden="true"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
      <div style={{ position: "relative" }}>
        <div
          style={{
            background: "#EF476F",
            color: "#fff",
            fontFamily: "var(--font-poppins),sans-serif",
            fontWeight: 700,
            fontSize: 12,
            textAlign: "center",
            padding: "9px 0",
            borderRadius: 8,
            letterSpacing: "0.03em",
            animation: active
              ? "hiw-download-pulse 2s ease-in-out infinite"
              : "none",
          }}
        >
          ⬇&nbsp; Download Your Song
        </div>
        <span
          style={{
            position: "absolute",
            right: 30,
            top: -7,
            fontSize: 16,
            color: "#FFD166",
            animation: active
              ? "hiw-note-a 2.2s ease-out 0.2s infinite"
              : "none",
            pointerEvents: "none",
            userSelect: "none",
          }}
          aria-hidden="true"
        >
          ♪
        </span>
        <span
          style={{
            position: "absolute",
            right: 10,
            top: -2,
            fontSize: 13,
            color: "#FFD166",
            animation: active ? "hiw-note-b 2.2s ease-out 1s infinite" : "none",
            pointerEvents: "none",
            userSelect: "none",
          }}
          aria-hidden="true"
        >
          ♫
        </span>
      </div>
    </div>
  );
}

/* ── CONNECTOR ── */
function Connector() {
  return (
    <div
      className="hidden md:flex items-center flex-shrink-0"
      style={{ width: 52, position: "relative", alignSelf: "center" }}
      aria-hidden="true"
    >
      <div
        style={{
          width: "100%",
          height: 2,
          background:
            "repeating-linear-gradient(90deg,rgba(7,59,76,0.2) 0 5px,transparent 5px 10px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -2,
          top: "50%",
          transform: "translateY(-50%)",
          width: 0,
          height: 0,
          borderTop: "5px solid transparent",
          borderBottom: "5px solid transparent",
          borderLeft: "8px solid rgba(7,59,76,0.3)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#FFD166",
          boxShadow: "0 0 10px 3px rgba(255,209,102,0.5)",
          animation: "hiw-dot-travel 1.9s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* ── STEPS CONFIG ── */
const STEPS = [
  {
    num: "01",
    badgeBg: "#FFD166",
    badgeColor: "#073B4C",
    title: "Share Name & Story",
    subtitle: "Tell us the occasion, who it's for, and their story in minutes",
    Visual: ShareStoryVisual,
  },
  {
    num: "02",
    badgeBg: "#EF476F",
    badgeColor: "#ffffff",
    title: "Review AI generated lyrics and pay",
    subtitle: "Simple, secure payment — plans starting from just ₹199",
    Visual: PaymentVisual,
  },
  {
    num: "03",
    badgeBg: "#FFD166",
    badgeColor: "#073B4C",
    title: "Get Your Song Instantly",
    subtitle: "Your 2 personalised songs are ready to listen, share & download",
    Visual: ReceiveVisual,
  },
];

/* ── MAIN ── */
export default function HowItWorksRow() {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <section
        ref={sectionRef}
        id="how-it-works-section"
        className="relative overflow-hidden py-7 sm:py-9 md:py-12 bg-secondary-cream"
        aria-labelledby="how-it-works-heading"
      >
        {/* Ambient glows */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div
            style={{
              position: "absolute",
              left: "-8%",
              top: "15%",
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: "rgba(255,209,102,0.12)",
              filter: "blur(72px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: "-8%",
              bottom: "15%",
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: "rgba(239,71,111,0.07)",
              filter: "blur(72px)",
            }}
          />
        </div>

        <div className="relative max-w-screen-xl mx-auto px-4 sm:px-5 md:px-8 lg:px-12">
          {/* Header — fades in first */}
          <div
            className="mb-5 md:mb-7"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.5s ease, transform 0.5s ease",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="how-it-works-heading"
                className="font-heading font-bold text-text-teal leading-tight"
                style={{ fontSize: "clamp(1.5rem,4vw,2.4rem)" }}
              >
                How to
              </h2>
              <Link
                href="/how-it-works"
                className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white border border-text-teal/25 text-text-teal/70 hover:text-text-teal hover:border-text-teal/50 font-semibold font-body text-xs px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95 whitespace-nowrap shadow-sm"
                onClick={() =>
                  trackCTAEvent.ctaClick(
                    "how_it_works_know_more",
                    window.location.href,
                  )
                }
              >
                Know More
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
            <p
              className="font-body mt-3"
              style={{
                color: "rgba(7,59,76,0.6)",
                fontSize: "clamp(0.8rem,2vw,1rem)",
              }}
            >
              3 simple steps to your perfect personalised song ♪
            </p>
          </div>

          {/* Cards — staggered fade-up */}
          <div
            className="flex items-stretch"
            style={{
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              gap: 0,
            }}
          >
            {STEPS.map((step, index) => {
              const { Visual } = step;
              const delay = `${0.1 + index * 0.12}s`;
              return (
                <div
                  key={step.num}
                  className="flex items-stretch flex-shrink-0 md:flex-1"
                >
                  <div
                    className="flex flex-col rounded-2xl overflow-hidden w-[82vw] sm:w-80 md:w-auto md:flex-1"
                    style={{
                      scrollSnapAlign: "start",
                      background: "#ffffff",
                      border: "1px solid rgba(7,59,76,0.1)",
                      boxShadow: "0 2px 16px rgba(7,59,76,0.07)",
                      opacity: inView ? 1 : 0,
                      transform: inView ? "translateY(0)" : "translateY(28px)",
                      transition: `opacity 0.55s ease ${delay}, transform 0.55s ease ${delay}`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        "0 6px 24px rgba(7,59,76,0.12)";
                      (e.currentTarget as HTMLDivElement).style.borderColor =
                        "rgba(7,59,76,0.18)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        "0 2px 16px rgba(7,59,76,0.07)";
                      (e.currentTarget as HTMLDivElement).style.borderColor =
                        "rgba(7,59,76,0.1)";
                    }}
                  >
                    {/* Top accent bar */}
                    <div
                      style={{
                        height: 3,
                        background: step.badgeBg,
                        flexShrink: 0,
                      }}
                    />

                    <div
                      className="flex flex-col flex-1 p-5 sm:p-6"
                      style={{ gap: 0 }}
                    >
                      {/* Badge */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 14,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: step.badgeBg,
                            color: step.badgeColor,
                            fontFamily: "var(--font-poppins),sans-serif",
                            fontWeight: 700,
                            fontSize: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow:
                              step.badgeBg === "#FFD166"
                                ? "0 0 12px rgba(255,209,102,0.4)"
                                : "0 0 12px rgba(239,71,111,0.4)",
                          }}
                        >
                          {step.num}
                        </div>
                        <span
                          style={{
                            fontFamily: "var(--font-poppins),sans-serif",
                            fontWeight: 600,
                            fontSize: 10,
                            color: "rgba(7,59,76,0.4)",
                            textTransform: "uppercase",
                            letterSpacing: "0.15em",
                          }}
                        >
                          Step {step.num}
                        </span>
                      </div>

                      {/* Title */}
                      <h3
                        className="font-heading font-bold text-text-teal"
                        style={{
                          fontSize: "clamp(0.95rem,2.5vw,1.2rem)",
                          lineHeight: 1.25,
                          margin: 0,
                          marginBottom: 14,
                        }}
                      >
                        {step.title}
                      </h3>

                      {/* Visual area */}
                      <div
                        style={{
                          flex: 1,
                          borderRadius: 12,
                          padding: "14px 12px",
                          background: "#F5F7FA",
                          border: "1px solid rgba(7,59,76,0.07)",
                          minHeight: 164,
                          display: "flex",
                          alignItems: "center",
                          marginBottom: 14,
                        }}
                      >
                        <Visual active={inView} />
                      </div>

                      {/* Subtitle */}
                      <p
                        className="font-body"
                        style={{
                          fontSize: "clamp(0.75rem,1.8vw,0.875rem)",
                          color: "rgba(7,59,76,0.65)",
                          lineHeight: 1.6,
                          margin: 0,
                        }}
                      >
                        {step.subtitle}
                      </p>
                    </div>
                  </div>

                  {index < STEPS.length - 1 && (
                    <>
                      <div
                        className="flex-none md:hidden"
                        style={{ width: 10 }}
                        aria-hidden="true"
                      />
                      <Connector />
                    </>
                  )}
                </div>
              );
            })}

            <div
              className="flex-none md:hidden"
              style={{ width: 16 }}
              aria-hidden="true"
            />
          </div>
        </div>
      </section>
    </>
  );
}
