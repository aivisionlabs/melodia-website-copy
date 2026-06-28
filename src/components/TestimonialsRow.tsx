"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { textualTestimonials } from "@/lib/textual-testimonials-data";

const AVATAR_GRADIENTS = [
  "from-rose-400 to-orange-400",
  "from-teal-400 to-cyan-500",
  "from-violet-400 to-purple-500",
  "from-amber-400 to-yellow-300",
  "from-emerald-400 to-teal-500",
  "from-pink-400 to-rose-500",
  "from-sky-400 to-blue-500",
];

const TIMES = ["9:41 AM","10:02 AM","11:15 AM","2:30 PM","3:47 PM","5:10 PM","7:22 PM","8:55 AM"];
const DATES = ["Today","Yesterday","Mon, 3 Mar","Sun, 2 Mar","Sat, 1 Mar","Fri, 28 Feb","Thu, 27 Feb"];

const PRE_MESSAGES = [
  "Hey just wanted to share my experience 😊",
  "Bhai kamaal ho gaya yaar 🔥",
  "I had to tell you this!",
  "You guys are literally insane 😭",
  "Okay so I wasn't expecting this at all...",
  "My friends won't believe me lol",
  "Real talk —",
  "No cap this actually worked 👀",
  "I've been using it for a week now...",
  "Wanted to drop this review somewhere 🙏",
];

function SeenTick() {
  return (
    <svg width="15" height="10" viewBox="0 0 18 11" fill="none" aria-hidden="true" className="inline-block flex-shrink-0">
      <path d="M1 5.5L4.5 9 11.5 1" stroke="#53BDEB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 5.5L9.5 9 16.5 1" stroke="#53BDEB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function WaBubble({ text, time, isSmall = false }: { text: string; time: string; isSmall?: boolean }) {
  return (
    <div className="flex justify-end">
      <div
        className="relative rounded-[18px] rounded-tr-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.15)] px-3 pt-2 pb-1.5"
        style={{ backgroundColor: "#DCF8C6", maxWidth: "82%" }}
      >
        <div
          className="absolute -right-[8px] top-0 w-0 h-0"
          style={{ borderLeft: "9px solid #DCF8C6", borderBottom: "9px solid transparent" }}
          aria-hidden="true"
        />
        <p className={`text-[#111B21] leading-[1.45] break-words pr-12 ${isSmall ? "text-[13px]" : "text-[14.5px]"}`}>
          {text}
        </p>
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span className="text-[#8696A0] text-[11px] leading-none select-none">{time}</span>
          <SeenTick />
        </div>
      </div>
    </div>
  );
}

function IncomingBubble({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex justify-start">
      <div
        className="relative rounded-[18px] rounded-tl-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.12)] px-3 pt-2 pb-1.5"
        style={{ backgroundColor: "#FFFFFF", maxWidth: "75%" }}
      >
        <div
          className="absolute -left-[8px] top-0 w-0 h-0"
          style={{ borderRight: "9px solid #FFFFFF", borderBottom: "9px solid transparent" }}
          aria-hidden="true"
        />
        <p className="text-[#111B21] text-[14px] leading-[1.45] break-words">
          {text}
        </p>
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span className="text-[#8696A0] text-[11px] leading-none select-none">{time}</span>
        </div>
      </div>
    </div>
  );
}

const TOTAL = textualTestimonials.length;
const AUTO_PLAY_MS = 6000;

export default function TestimonialsRow() {
  const [current, setCurrent] = useState(0);
  const [entered, setEntered] = useState(true);

  const goTo = useCallback((idx: number) => {
    setEntered(false);
    setTimeout(() => {
      setCurrent(idx);
      setEntered(true);
    }, 200);
  }, []);

  const prev = useCallback(() => goTo((current - 1 + TOTAL) % TOTAL), [current, goTo]);
  const next = useCallback(() => goTo((current + 1) % TOTAL), [current, goTo]);

  useEffect(() => {
    const id = setTimeout(next, AUTO_PLAY_MS);
    return () => clearTimeout(id);
  }, [current, next]);

  const t         = textualTestimonials[current];
  const gradient  = AVATAR_GRADIENTS[current % AVATAR_GRADIENTS.length];
  const initial   = t.name.charAt(0).toUpperCase();
  const mainTime  = TIMES[current % TIMES.length];
  const preTime   = (() => {
    const [h, rest] = mainTime.split(":");
    const [m, ampm] = rest.split(" ");
    return `${h}:${String(Math.max(0, parseInt(m) - 4)).padStart(2, "0")} ${ampm}`;
  })();
  const dateLabel = DATES[current % DATES.length];
  const preMsg    = PRE_MESSAGES[current % PRE_MESSAGES.length];

  const sidebarItems = textualTestimonials.slice(0, 6).map((item, i) => ({
    ...item,
    gradient: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length],
    time: TIMES[i % TIMES.length],
  }));

  return (
    <section aria-labelledby="testimonials-heading" className="py-7 md:py-12 px-4 sm:px-6 md:px-10 lg:px-16 max-w-screen-2xl mx-auto">

      {/* Heading */}
      <div className="mb-5 md:mb-7">
        <h2 id="testimonials-heading" className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-text-teal leading-tight">
          What People Are Saying
        </h2>
        <p className="text-text-teal/45 text-sm mt-1.5 font-body">
          Words from our users.
        </p>
      </div>

      {/* Phone UI wrapper */}
      <div className="flex items-start max-w-[860px]" style={{ filter: "drop-shadow(0 8px 40px rgba(0,0,0,0.13))" }}>

        {/* LEFT: chat list */}
        <div
          className="hidden lg:flex flex-col w-[285px] flex-shrink-0 overflow-hidden bg-white"
          style={{ borderRadius: "22px 0 0 22px", border: "1.5px solid #E9EDEF", borderRight: "1px solid #E9EDEF", height: 490 }}
        >
          {/* header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ background: "linear-gradient(90deg,#075E54,#128C7E)" }}>
            <span className="text-white font-bold text-[17px]">WhatsApp</span>
            <div className="flex items-center gap-3 opacity-80">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </div>
          </div>
          {/* tabs */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border-b border-[#E9EDEF] flex-shrink-0">
            <span className="text-[11.5px] font-semibold text-white bg-[#25D366] px-3 py-0.5 rounded-full">All</span>
            <span className="text-[11.5px] text-[#667781] px-2 py-0.5 rounded-full">Unread</span>
            <span className="text-[11.5px] text-[#667781] px-2 py-0.5 rounded-full">Groups</span>
          </div>
          {/* list */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#F0F2F5]">
            {sidebarItems.map((item, i) => {
              const isActive = i === current % sidebarItems.length;
              return (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isActive ? "bg-[#F0F2F5]" : "hover:bg-[#FAFAFA]"}`}
                >
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}>
                    {item.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#111B21] text-[13.5px] truncate">{item.name}</span>
                      <span className={`text-[11px] flex-shrink-0 ${isActive ? "text-[#25D366] font-semibold" : "text-[#667781]"}`}>{item.time}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <SeenTick />
                      <p className="text-[#8696A0] text-[12px] truncate">{item.text.slice(0, 28)}…</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: active chat */}
        <div
          className="flex-1 min-w-0 flex flex-col overflow-hidden rounded-[22px] lg:rounded-l-none lg:rounded-r-[22px]"
          style={{ border: "1.5px solid #E9EDEF", height: 490 }}

        >
          {/* header */}
          <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0" style={{ background: "linear-gradient(90deg,#075E54,#128C7E)" }}>
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow`}>
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-[14px] leading-tight truncate">{t.name}</p>
              <p className="text-[11px] text-green-200/90 leading-tight">online</p>
            </div>
            <div className="flex items-center gap-4 opacity-80">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.56.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.01l-2.2 2.21z"/></svg>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </div>
          </div>

          {/* Chat body */}
          <div
            className="flex-1 overflow-y-auto flex flex-col justify-end px-3 py-4 gap-2"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23ddd5c8'/%3E%3Cpath d='M0 0h100M0 25h100M0 50h100M0 75h100M0 100h100M0 0v100M25 0v100M50 0v100M75 0v100M100 0v100' stroke='%23d0c8bb' stroke-width='0.6'/%3E%3C/svg%3E")`,
              backgroundColor: "#E5DDD5",
            }}
          >
            {/* date chip */}
            <div className="flex justify-center mb-1">
              <span className="text-[11.5px] text-[#667781] font-medium px-3 py-0.5 rounded-full shadow-sm" style={{ backgroundColor: "rgba(255,255,255,0.85)" }}>
                {dateLabel}
              </span>
            </div>

            {/* Incoming: our question */}
            <IncomingBubble text="How was your experience? 😊" time={preTime} />

            {/* Outgoing: context opener */}
            <div
              key={`pre-${current}`}
              style={{
                opacity: entered ? 1 : 0,
                transform: entered ? "translateY(0)" : "translateY(6px)",
                transition: "opacity 180ms, transform 180ms",
              }}
            >
              <WaBubble text={preMsg} time={preTime} isSmall />
            </div>

            {/* Outgoing: main testimonial */}
            <div
              key={`main-${current}`}
              style={{
                opacity: entered ? 1 : 0,
                transform: entered ? "translateY(0)" : "translateY(6px)",
                transition: "opacity 220ms 50ms, transform 220ms 50ms",
              }}
            >
              <WaBubble text={t.text} time={mainTime} />
            </div>
          </div>

        </div>
      </div>

      {/* Dots + arrows */}
      <div className="flex items-center justify-between mt-5 max-w-[860px]">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: Math.min(TOTAL, 9) }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Testimonial ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{ width: i === current ? 22 : 7, height: 7, backgroundColor: i === current ? "#EF476F" : "#D1D5DB" }}
            />
          ))}
          {TOTAL > 9 && <span className="text-xs text-text-teal/40 ml-1">+{TOTAL - 9}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="w-9 h-9 rounded-full bg-white border border-text-teal/30 flex items-center justify-center text-text-teal hover:border-accent-coral hover:text-accent-coral shadow-sm transition-all active:scale-95" aria-label="Previous">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={next} className="w-9 h-9 rounded-full bg-accent-coral flex items-center justify-center text-white shadow transition-all active:scale-95 hover:bg-accent-coral/90" aria-label="Next">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </section>
  );
}