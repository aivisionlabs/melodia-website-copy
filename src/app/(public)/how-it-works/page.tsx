"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { HeaderLogo } from "@/components/OptimizedLogo";
import Footer from "@/components/Footer";
import { trackCTAEvent } from "@/lib/analytics";

/* ─── Keyframes ─────────────────────────────────────────────────────────── */
const KEYFRAMES = `
  @keyframes hiw-fade-up {
    from { opacity:0; transform:translateY(10px); }
    to   { opacity:1; transform:translateY(0);    }
  }
  @keyframes hiw-blink {
    0%,100% { opacity:1; } 50% { opacity:0; }
  }
  @keyframes hiw-bar {
    0%,8% { width:0%; } 80%,100% { width:70%; }
  }
  @keyframes hiw-check {
    0%   { transform:scale(0) rotate(-20deg); opacity:0; }
    60%  { transform:scale(1.2) rotate(5deg); opacity:1; }
    100% { transform:scale(1) rotate(0deg);   opacity:1; }
  }
  @keyframes hiw-dl-pulse {
    0%,100% { box-shadow:0 4px 16px rgba(239,71,111,0.4); transform:scale(1);    }
    50%     { box-shadow:0 6px 24px rgba(239,71,111,0.65); transform:scale(1.02); }
  }
  @keyframes hiw-note-a {
    0%   { transform:translate(0,0) rotate(-6deg);       opacity:.9; }
    100% { transform:translate(6px,-40px) rotate(14deg); opacity:0;  }
  }
  @keyframes hiw-note-b {
    0%   { transform:translate(0,0) rotate(5deg);          opacity:.75; }
    100% { transform:translate(-8px,-32px) rotate(-12deg); opacity:0;   }
  }
  @keyframes hiw-expert-pulse {
    0%,100% { box-shadow:0 0 0 0 rgba(255,209,102,0.4); }
    50%     { box-shadow:0 0 0 10px rgba(255,209,102,0); }
  }
`;

/* ─── Light-mode shared styles ───────────────────────────────────────────── */
const VC: React.CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};
const ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "9px 12px",
  borderRadius: 10,
  background: "rgba(7,59,76,0.04)",
  border: "1.5px solid rgba(7,59,76,0.09)",
};
const LABEL: React.CSSProperties = {
  fontFamily: "var(--font-montserrat),sans-serif",
  fontSize: 9,
  fontWeight: 600,
  color: "rgba(7,59,76,0.45)",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  marginBottom: 3,
};
const BOLD: React.CSSProperties = {
  fontFamily: "var(--font-poppins),sans-serif",
  fontWeight: 700,
  fontSize: 11,
  color: "#073B4C",
};
const ACCENT: React.CSSProperties = { ...BOLD, color: "#EF476F" };
const YELLOW_ACCENT: React.CSSProperties = { ...BOLD, color: "#073B4C" };

/* ═══════════════════════════════════════════════════════════════════════════
   VISUAL COMPONENTS
══════════════════════════════════════════════════════════════════════════ */

/* Occasion picker — Plan 1 Step 1 */
const OCCASIONS = [
  { e: "🎂", l: "Birthday" },
  { e: "💍", l: "Anniversary" },
  { e: "💒", l: "Wedding" },
  { e: "🎓", l: "Graduation" },
];
function OccasionPickVisual({ active }: { active: boolean }) {
  const [sel, setSel] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(
      () => setSel((p) => (p + 1) % OCCASIONS.length),
      3000,
    );
    return () => clearInterval(id);
  }, [active]);
  return (
    <div style={VC}>
      {OCCASIONS.map((o, i) => {
        const on = i === sel;
        return (
          <div
            key={o.l}
            style={{
              ...ROW,
              background: on ? "rgba(255,209,102,0.16)" : "rgba(7,59,76,0.04)",
              border: `1.5px solid ${on ? "rgba(255,209,102,0.7)" : "rgba(7,59,76,0.09)"}`,
              transform: on ? "scale(1.02)" : "scale(1)",
              transition: "all 0.45s ease",
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{o.e}</span>
            <span
              style={{
                fontFamily: "var(--font-poppins),sans-serif",
                fontWeight: 700,
                fontSize: 12,
                color: on ? "#073B4C" : "rgba(7,59,76,0.5)",
                transition: "color 0.35s",
                flex: 1,
              }}
            >
              {o.l}
            </span>
            {on && (
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#FFD166",
                  color: "#073B4C",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 900,
                  flexShrink: 0,
                  animation:
                    "hiw-check 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
                  fontFamily: "var(--font-poppins),sans-serif",
                }}
              >
                ✓
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* Song select + name entry — Plan 1 Step 2 */
const LIBRARY_SONGS = [
  { e: "🎂", title: "Happy Birthday To You", genre: "Upbeat Pop" },
  { e: "💍", title: "Anniversary Serenade", genre: "Romantic Ballad" },
  { e: "💒", title: "Forever & Always", genre: "Wedding Waltz" },
];
const NAME_PAIRS = [
  { from: "Rahul", to: "Arjun" },
  { from: "Priya", to: "Sneha" },
  { from: "Anil", to: "Vikram" },
];

function ChooseSongNameVisual({ active }: { active: boolean }) {
  const [songIdx, setSongIdx] = useState(0);
  const [nameIdx, setNameIdx] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setSongIdx((p) => (p + 1) % LIBRARY_SONGS.length);
      setNameIdx((p) => (p + 1) % NAME_PAIRS.length);
    }, 3600);
    return () => clearInterval(id);
  }, [active]);
  const song = LIBRARY_SONGS[songIdx];
  const pair = NAME_PAIRS[nameIdx];
  return (
    <div style={VC}>
      <div
        style={{
          ...ROW,
          background: "rgba(255,209,102,0.12)",
          border: "1.5px solid rgba(255,209,102,0.4)",
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0 }}>{song.e}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            key={songIdx}
            style={{
              ...BOLD,
              fontSize: 10,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              animation: "hiw-fade-up 0.35s ease both",
            }}
          >
            {song.title}
          </div>
          <div style={{ ...LABEL, marginBottom: 0, marginTop: 2 }}>
            {song.genre} · Selected
          </div>
        </div>
        <div
          style={{
            width: 17,
            height: 17,
            borderRadius: "50%",
            background: "#FFD166",
            color: "#073B4C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            fontWeight: 900,
            flexShrink: 0,
            fontFamily: "var(--font-poppins),sans-serif",
          }}
        >
          ✓
        </div>
      </div>
      <div style={ROW}>
        <div style={{ flex: 1 }}>
          <div style={LABEL}>Original song is for:</div>
          <div
            style={{
              ...BOLD,
              fontSize: 12,
              color: "rgba(7,59,76,0.3)",
              textDecoration: "line-through",
            }}
          >
            {pair.from}
          </div>
        </div>
      </div>
      <div
        style={{
          ...ROW,
          border: "1.5px solid rgba(255,209,102,0.55)",
          background: "rgba(255,209,102,0.08)",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={LABEL}>Enter recipient name:</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              key={nameIdx}
              style={{
                ...BOLD,
                fontSize: 13,
                animation: "hiw-fade-up 0.35s ease both",
              }}
            >
              {pair.to}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 300,
                color: "#EF476F",
                animation: "hiw-blink 0.85s ease-in-out infinite",
              }}
            >
              |
            </span>
          </div>
        </div>
        <span style={{ fontSize: 13 }}>✏️</span>
      </div>
    </div>
  );
}

/* Pay & get instantly */
function PayInstantVisual({
  price,
  twoVersions,
  active,
}: {
  price: string;
  twoVersions?: boolean;
  active: boolean;
}) {
  const [paid, setPaid] = useState(false);
  useEffect(() => {
    if (!active) return;
    const t1 = setTimeout(() => setPaid(true), 2200);
    const t2 = setTimeout(() => setPaid(false), 5400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [paid, active]);
  return (
    <div style={VC}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          ...ROW,
        }}
      >
        <span style={{ ...BOLD, fontSize: 10 }}>Your Personalised Song</span>
        <span style={{ ...ACCENT, fontSize: 15 }}>{price}</span>
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
      {!paid ? (
        <div
          style={{
            background: "#EF476F",
            color: "#fff",
            fontFamily: "var(--font-poppins),sans-serif",
            fontWeight: 700,
            fontSize: 12,
            textAlign: "center",
            padding: "10px 0",
            borderRadius: 10,
          }}
        >
          Pay {price} →
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
            padding: "10px 0",
            borderRadius: 10,
            animation: "hiw-fade-up 0.4s ease both",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#22c55e",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 900,
              fontFamily: "var(--font-poppins),sans-serif",
              animation: "hiw-check 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
            }}
          >
            ✓
          </div>
          <span
            style={{
              fontFamily: "var(--font-poppins),sans-serif",
              fontWeight: 700,
              fontSize: 11,
              color: "#16a34a",
            }}
          >
            {twoVersions
              ? "2 versions ready to download!"
              : "Song ready instantly!"}
          </span>
        </div>
      )}
    </div>
  );
}

/* Share details form */
function ShareDetailsVisual({
  fields,
  active,
}: {
  fields: { label: string; value: string }[];
  active: boolean;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (shown < fields.length) {
      const t = setTimeout(() => setShown((p) => p + 1), 1050);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setShown(0), 3200);
      return () => clearTimeout(t);
    }
  }, [shown, fields.length, active]);
  return (
    <div style={VC}>
      {fields.map((f, i) => (
        <div
          key={f.label}
          style={{
            ...ROW,
            opacity: i < shown ? 1 : 0.65,
            border: `1.5px solid ${i < shown ? "rgba(255,209,102,0.7)" : "rgba(7,59,76,0.09)"}`,
            background:
              i < shown ? "rgba(255,209,102,0.14)" : "rgba(7,59,76,0.04)",
            transition: "all 0.5s ease",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={LABEL}>{f.label}</div>
            <div
              style={{
                ...BOLD,
                fontSize: 10,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: i < shown ? "#073B4C" : "rgba(7,59,76,0.45)",
              }}
            >
              {i < shown ? f.value : "…"}
            </div>
          </div>
          {i < shown && (
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#FFD166",
                color: "#073B4C",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 900,
                flexShrink: 0,
                animation: "hiw-check 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
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

/* Review lyrics */
const LYRICS_LINES = [
  "Happy Birthday Priya, today's your day,",
  "Your laughter lights up every room you grace,",
  "Through all the years, through work and play,",
  "No one could ever take your place.",
];
function ReviewLyricsVisual({ active }: { active: boolean }) {
  const [shown, setShown] = useState(0);
  const [approved, setApproved] = useState(false);
  useEffect(() => {
    if (!active) return;
    if (shown < LYRICS_LINES.length) {
      const t = setTimeout(() => setShown((p) => p + 1), 800);
      return () => clearTimeout(t);
    } else if (!approved) {
      const t = setTimeout(() => setApproved(true), 600);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setShown(0);
        setApproved(false);
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [shown, approved, active]);
  return (
    <div style={VC}>
      <div
        style={{
          borderRadius: 10,
          padding: "10px 12px",
          background: "rgba(7,59,76,0.05)",
          border: "1px solid rgba(7,59,76,0.09)",
          minHeight: 80,
        }}
      >
        {LYRICS_LINES.slice(0, shown).map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: "var(--font-poppins),sans-serif",
              fontSize: 9,
              fontWeight: 500,
              lineHeight: 1.7,
              color: "#073B4C",
              animation: "hiw-fade-up 0.4s ease both",
            }}
          >
            {line}
          </div>
        ))}
        {shown < LYRICS_LINES.length && (
          <span
            style={{
              fontSize: 12,
              color: "#EF476F",
              animation: "hiw-blink 0.75s ease-in-out infinite",
            }}
          >
            |
          </span>
        )}
      </div>
      {approved && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 10,
            background: "rgba(34,197,94,0.1)",
            border: "1.5px solid rgba(34,197,94,0.4)",
            animation: "hiw-fade-up 0.4s ease both",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: "#22c55e",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 900,
              flexShrink: 0,
              fontFamily: "var(--font-poppins),sans-serif",
            }}
          >
            ✓
          </div>
          <div style={{ ...BOLD, fontSize: 10, color: "#16a34a" }}>
            Lyrics Approved!
          </div>
        </div>
      )}
    </div>
  );
}

/* Pay only (Plan 3 Step 2) */
function PayOnlyVisual({ active }: { active: boolean }) {
  const [paid, setPaid] = useState(false);
  useEffect(() => {
    if (!active) return;
    const t1 = setTimeout(() => setPaid(true), 2400);
    const t2 = setTimeout(() => setPaid(false), 5600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [paid, active]);
  return (
    <div style={VC}>
      <div
        style={{
          ...ROW,
          background: "rgba(255,209,102,0.08)",
          border: "1.5px solid rgba(255,209,102,0.35)",
        }}
      >
        <span style={{ fontSize: 16 }}>🏆</span>
        <div style={{ flex: 1 }}>
          <div style={LABEL}>Premium Maestro Song</div>
          <div style={{ ...ACCENT, fontSize: 13 }}>₹1,499</div>
        </div>
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
      {!paid ? (
        <div
          style={{
            background: "#EF476F",
            color: "#fff",
            fontFamily: "var(--font-poppins),sans-serif",
            fontWeight: 700,
            fontSize: 12,
            textAlign: "center",
            padding: "10px 0",
            borderRadius: 10,
          }}
        >
          Pay ₹1,499 →
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,209,102,0.1)",
            border: "1.5px solid rgba(255,209,102,0.45)",
            padding: "10px 14px",
            borderRadius: 10,
            animation: "hiw-fade-up 0.4s ease both",
          }}
        >
          <div style={{ ...YELLOW_ACCENT, fontSize: 11 }}>
            ✓ Payment Successful!
          </div>
          <div style={{ ...LABEL, marginBottom: 0, textAlign: "center" }}>
            Our team will call you shortly
          </div>
        </div>
      )}
    </div>
  );
}

/* Expert calls + 24hr delivery — Plan 3 Step 3 */
function ExpertDeliveryVisual({ active }: { active: boolean }) {
  return (
    <div style={VC}>
      <div
        style={{
          borderRadius: 10,
          padding: "10px 12px",
          textAlign: "center",
          background: "rgba(255,209,102,0.1)",
          border: "1.5px solid rgba(255,209,102,0.4)",
          animation: active
            ? "hiw-expert-pulse 2.5s ease-in-out infinite"
            : "none",
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 4 }}>👩‍🎤</div>
        <div style={{ ...BOLD, fontSize: 11, color: "#073B4C" }}>
          Expert Songwriter
        </div>
        <div style={{ ...LABEL, marginTop: 3, marginBottom: 0 }}>
          Hand-crafting your song
        </div>
      </div>
      <div
        style={{
          ...ROW,
          background: "rgba(239,71,111,0.07)",
          border: "1.5px solid rgba(239,71,111,0.3)",
        }}
      >
        <span style={{ fontSize: 15 }}>📞</span>
        <div style={{ flex: 1 }}>
          <div style={LABEL}>Personal Consultation</div>
          <div style={{ ...ACCENT, fontSize: 10 }}>
            Team calls you to discuss your vision
          </div>
        </div>
      </div>
      <div
        style={{
          ...ROW,
          background: "rgba(255,209,102,0.08)",
          border: "1.5px solid rgba(255,209,102,0.35)",
        }}
      >
        <span style={{ fontSize: 14 }}>⏱️</span>
        <div style={{ flex: 1 }}>
          <div style={LABEL}>Delivery</div>
          <div style={{ ...BOLD, fontSize: 10 }}>
            Song delivered within 24 hours
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step card ─────────────────────────────────────────────────────────── */
function StepCard({
  num,
  title,
  Visual,
  accentColor,
  active,
}: {
  num: string;
  title: string;
  Visual: React.ComponentType<{ active: boolean }>;
  accentColor: string;
  active: boolean;
}) {
  const accent = accentColor === "#073B4C" ? "#EF476F" : accentColor;
  const badgeText = accent === "#FFD166" ? "#073B4C" : "#ffffff";
  return (
    <div
      className="w-[78vw] sm:w-64 md:w-auto flex-1 h-full rounded-2xl flex flex-col overflow-hidden"
      style={{
        background: "#ffffff",
        border: `1px solid rgba(7,59,76,0.1)`,
        boxShadow: "0 2px 12px rgba(7,59,76,0.07)",
      }}
    >
      <div
        className="h-[3px] w-full flex-shrink-0"
        style={{ background: accent }}
      />
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2.5">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-heading font-bold text-[10px]"
            style={{ background: accent, color: badgeText }}
          >
            {num}
          </div>
          <span
            className="font-body text-[9px] font-semibold uppercase tracking-widest"
            style={{ color: "rgba(7,59,76,0.4)" }}
          >
            Step {num}
          </span>
        </div>
        <h4 className="font-heading font-bold text-text-teal text-sm leading-snug mb-3">
          {title}
        </h4>
        <div
          className="flex-1 rounded-xl flex items-center"
          style={{
            background: "#F5F7FA",
            padding: "12px 10px",
            border: "1px solid rgba(7,59,76,0.07)",
          }}
        >
          <Visual active={active} />
        </div>
      </div>
    </div>
  );
}

/* ─── Plan section with scroll animation ───────────────────────────────── */
interface Step {
  title: string;
  Visual: React.ComponentType<{ active: boolean }>;
  barColor?: string;
}
interface PlanConfig {
  price: string;
  name: string;
  oneLiner: string;
  topBarColor: string;
  planId: string;
  steps: Step[];
}

function PlanSection({ plan }: { plan: PlanConfig }) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.55 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const accent = plan.topBarColor;
  const btnColor = "#EF476F";

  return (
    <section
      ref={ref}
      id={plan.planId}
      className="py-5 md:py-7 bg-secondary-cream"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Plan header */}
        <div
          className="flex items-center justify-between mb-4 gap-3"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.45s ease, transform 0.45s ease",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-1 h-5 rounded-full flex-shrink-0"
              style={{ background: accent }}
            />
            <h2 className="font-heading font-bold text-text-teal text-base sm:text-lg leading-none">
              {plan.name}
            </h2>
            <span className="font-body text-text-teal/40 text-sm">
              {plan.price}
            </span>
          </div>
          <Link
            href={`/create?plan=${plan.planId}`}
            className="flex-shrink-0 flex items-center gap-1.5 font-heading font-bold text-sm px-4 py-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              background: btnColor,
              color: "#fff",
              boxShadow: `0 3px 10px ${btnColor}30`,
            }}
            onClick={() => trackCTAEvent.ctaClick(`how_it_works_select_${plan.planId}`, window.location.href)}
          >
            Select <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <p
          className="font-body text-text-teal/70 text-xs sm:text-sm mb-4 -mt-1"
          style={{
            opacity: inView ? 1 : 0,
            transition: "opacity 0.45s ease 0.08s",
          }}
        >
          {plan.oneLiner}
        </p>

        {/* Step cards — staggered */}
        <div
          className="flex items-stretch md:grid md:grid-cols-3 md:gap-4"
          style={{
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            gap: "0.75rem",
          }}
        >
          {plan.steps.map((step, i) => (
            <div
              key={step.title}
              className="flex flex-col flex-shrink-0 md:flex-shrink md:block"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 0.5s ease ${0.15 + i * 0.1}s, transform 0.5s ease ${0.15 + i * 0.1}s`,
              }}
            >
              <StepCard
                num={String(i + 1).padStart(2, "0")}
                title={step.title}
                Visual={step.Visual}
                accentColor={step.barColor ?? plan.topBarColor}
                active={inView}
              />
            </div>
          ))}
          <div className="flex-none md:hidden w-2" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

/* ─── Plans config ───────────────────────────────────────────────────────── */
const PLAN_599_FIELDS = [
  { label: "Occasion", value: "Birthday 🎂" },
  { label: "For", value: "My best friend Priya" },
  { label: "Your story", value: "She always makes me laugh…" },
];
const PLAN_1499_FIELDS = [
  { label: "For", value: "My parents' 25th anniversary 💍" },
  { label: "Their story", value: "Met in college, 1999, Mumbai…" },
  { label: "Language", value: "Hindi + English mix" },
  { label: "Music style", value: "Ghazal / Sufi feel" },
];

const PLANS: PlanConfig[] = [
  {
    price: "₹199",
    name: "NameDrop",
    oneLiner: "Pick a song, add their name, get your track instantly.",
    topBarColor: "#FFD166",
    planId: "package_1",
    steps: [
      {
        title: "Choose Occasion",
        Visual: OccasionPickVisual,
        barColor: "#FFD166",
      },
      {
        title: "Choose Song & Enter Name",
        Visual: ChooseSongNameVisual,
        barColor: "#EF476F",
      },
      {
        title: "Pay & Get Song Instantly",
        Visual: (p) => <PayInstantVisual price="₹199" active={p.active} />,
        barColor: "#073B4C",
      },
    ],
  },
  {
    price: "₹599",
    name: "Fully Custom",
    oneLiner:
      "Share your story, Our AI writes custom lyrics and you get two versions.",
    topBarColor: "#EF476F",
    planId: "package_2",
    steps: [
      {
        title: "Share Details",
        Visual: (p) => (
          <ShareDetailsVisual fields={PLAN_599_FIELDS} active={p.active} />
        ),
        barColor: "#FFD166",
      },
      {
        title: "Review Lyrics",
        Visual: ReviewLyricsVisual,
        barColor: "#EF476F",
      },
      {
        title: "Pay & Get Song Instantly",
        Visual: (p) => (
          <PayInstantVisual price="₹599" twoVersions active={p.active} />
        ),
        barColor: "#073B4C",
      },
    ],
  },
  {
    price: "₹1,499",
    name: "Pro Studio",
    oneLiner:
      "Expert songwriter calls you, crafts your song, delivers in 24 hours.",
    topBarColor: "#FFD166",
    planId: "package_3",
    steps: [
      {
        title: "Share Details",
        Visual: (p) => (
          <ShareDetailsVisual fields={PLAN_1499_FIELDS} active={p.active} />
        ),
        barColor: "#FFD166",
      },
      { title: "Pay", Visual: PayOnlyVisual, barColor: "#EF476F" },
      {
        title: "Expert Team Calls Back & Delivers in 24 hrs",
        Visual: ExpertDeliveryVisual,
        barColor: "#073B4C",
      },
    ],
  },
];

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function HowItWorksPage() {
  return (
    <div className="bg-secondary-cream min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      {/* Desktop header */}
      <header className="hidden md:flex w-full bg-secondary-cream/90 backdrop-blur-sm items-center justify-between px-4 sm:px-6 md:px-8 py-2 sm:py-3 shadow-elegant border-b border-text-teal/8 sticky top-0 z-40">
        <Link href="/" aria-label="Go to homepage">
          <HeaderLogo alt="Melodia Logo" />
        </Link>
        <Link
          href="/pricing"
          className="flex items-center gap-1.5 text-sm font-semibold font-body text-text-teal hover:text-accent-coral transition-colors"
          onClick={() => trackCTAEvent.ctaClick("how_it_works_see_pricing", window.location.href)}
        >
          See Pricing <ArrowRight className="w-4 h-4" />
        </Link>
      </header>

      {/* Page context — white/cream, NO dark teal */}
      <section className="bg-secondary-cream border-b border-text-teal/8 px-4 sm:px-6 md:px-8 pt-6 pb-7 md:pt-8 md:pb-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-body text-sm font-medium text-text-teal/55 hover:text-text-teal transition-colors mb-5"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <p className="font-body text-accent-coral text-xs font-bold uppercase tracking-widest mb-2">
            3 plans · pick what fits you
          </p>
          <h1 className="font-heading font-bold text-text-teal text-2xl sm:text-3xl md:text-4xl leading-tight mb-2">
            How to
          </h1>
          <p className="font-body text-text-teal/60 text-sm sm:text-base max-w-lg mb-5">
            From a quick name-drop to a fully custom song crafted by our team —
            choose your experience below.
          </p>
          {/* Plan quick-jump pills */}
          <div className="flex flex-wrap gap-2">
            {PLANS.map((plan) => (
              <a
                key={plan.planId}
                href={`#${plan.planId}`}
                className="inline-flex items-center gap-1 font-body text-xs font-semibold px-3 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95"
                style={{
                  borderColor: plan.topBarColor,
                  color:
                    plan.topBarColor === "#FFD166"
                      ? "#073B4C"
                      : plan.topBarColor,
                  background: `${plan.topBarColor}18`,
                }}
              >
                {plan.name}
                <span className="font-normal opacity-60 ml-0.5">
                  · {plan.price}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Plan sections */}
      {PLANS.map((plan, i) => (
        <div key={plan.planId}>
          <PlanSection plan={plan} />
          {i < PLANS.length - 1 && <div className="h-px bg-text-teal/8" />}
        </div>
      ))}

      <Footer />
    </div>
  );
}
