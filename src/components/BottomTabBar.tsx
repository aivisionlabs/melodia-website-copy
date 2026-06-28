"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Music2, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  consumePendingMySongsNudge,
  getMySongsNudgeMessage,
  hasSeenMySongsNudge,
  markMySongsNudgeSeen,
  type MySongsNudgeType,
} from "@/lib/my-songs-nudge";
import {
  trackMySongsNudgeEvent,
  trackNavigationEvent,
  trackCTAEvent,
} from "@/lib/analytics";
import { resolveStartCreatingHref } from "@/lib/navigation/start-creating-href-rules";

// Pages where the tab bar should be hidden (focused flows + full-screen song pages)
const HIDDEN_ON_PATHS = [
  "/create",
  "/create-song",
  "/generate-lyrics",
  "/song",
  "/song-options",
  "/song-template/song",
  "/song-admin-portal",
  "/vendor",
];

type ActiveNudge = {
  requestId: number;
  type: MySongsNudgeType;
  shownAt: number;
};

export default function BottomTabBar() {
  const pathname = usePathname();
  const [activeNudge, setActiveNudge] = useState<ActiveNudge | null>(null);

  // Hide on song creation & checkout flow pages
  const isHidden = HIDDEN_ON_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  useEffect(() => {
    if (isHidden) return;

    const pending = consumePendingMySongsNudge();
    if (!pending) return;

    if (hasSeenMySongsNudge(pending.requestId, pending.type)) return;

    markMySongsNudgeSeen(pending.requestId, pending.type);
    const shownAt = Date.now();
    setActiveNudge({ ...pending, shownAt });
    trackMySongsNudgeEvent.impression(
      pending.type,
      pending.requestId,
      pathname,
    );
  }, [isHidden, pathname]);

  useEffect(() => {
    if (!activeNudge) return;

    const timer = window.setTimeout(() => {
      trackMySongsNudgeEvent.autoDismiss(
        activeNudge.type,
        activeNudge.requestId,
        pathname,
        Date.now() - activeNudge.shownAt,
      );
      setActiveNudge(null);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [activeNudge, pathname]);

  const nudgeMessage = useMemo(
    () => (activeNudge ? getMySongsNudgeMessage(activeNudge.type) : ""),
    [activeNudge],
  );

  const startCreatingHref = useMemo(
    () => resolveStartCreatingHref({ pathname }),
    [pathname],
  );

  if (isHidden) return null;

  const isActive = (id: string) => {
    if (id === "home") return pathname === "/";
    if (id === "library") return pathname.startsWith("/library");
    if (id === "my-songs")
      return (
        pathname === "/my-songs" ||
        pathname.startsWith("/my-songs/") ||
        pathname.startsWith("/song-template/song/")
      );
    if (id === "profile") return pathname.startsWith("/profile");
    return false;
  };

  const tabClass = (id: string) =>
    `relative flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 gap-0.5 transition-colors duration-150 ${
      isActive(id) ? "text-accent-coral" : "text-text-teal/35"
    }`;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[60] md:hidden"
      aria-label="Main navigation"
    >
      <div
        className="bg-secondary-cream border-t border-text-teal/10"
        style={{ boxShadow: "0 -4px 24px rgba(7,59,76,0.10)" }}
      >
        <div className="flex items-stretch justify-around">
          {/* Home */}
          <Link
            href="/"
            aria-current={isActive("home") ? "page" : undefined}
            className={tabClass("home")}
            aria-label="Home"
            onClick={() =>
              trackNavigationEvent.click("home", "/", "bottom_tab")
            }
          >
            <span
              className={`absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] rounded-b-full transition-all duration-200 ${isActive("home") ? "w-8 bg-accent-coral" : "w-0"}`}
            />
            <Home
              className="w-5 h-5"
              strokeWidth={isActive("home") ? 2.5 : 1.8}
            />
            <span
              className={`text-[10px] font-body leading-none ${isActive("home") ? "font-bold" : "font-medium"}`}
            >
              Home
            </span>
          </Link>

          {/* Library */}
          <Link
            href="/library"
            aria-current={isActive("library") ? "page" : undefined}
            className={tabClass("library")}
            aria-label="Library"
            onClick={() =>
              trackNavigationEvent.click("library", "/library", "bottom_tab")
            }
          >
            <span
              className={`absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] rounded-b-full transition-all duration-200 ${isActive("library") ? "w-8 bg-accent-coral" : "w-0"}`}
            />
            <BookOpen
              className="w-5 h-5"
              strokeWidth={isActive("library") ? 2.5 : 1.8}
            />
            <span
              className={`text-[10px] font-body leading-none ${isActive("library") ? "font-bold" : "font-medium"}`}
            >
              Library
            </span>
          </Link>

          {/* Start Creating — pill half out of bar */}
          <Link
            href={startCreatingHref}
            className="flex flex-col items-center justify-center flex-1 py-1 -mt-4"
            aria-label="Start creating a song"
            onClick={() =>
              trackCTAEvent.ctaClick("start_creating", "bottom_tab_bar")
            }
          >
            <style>{`
              @keyframes ctaBacklight {
                0%, 100% { opacity: 0.85; transform: translateX(-50%) scale(1);   }
                50%       { opacity: 1;    transform: translateX(-50%) scale(1.2); }
              }
              @keyframes borderSpin {
                from { transform: rotate(0deg);   }
                to   { transform: rotate(360deg); }
              }
            `}</style>

            <div className="relative flex items-center justify-center">
              {/* Backlight */}
              <div
                className="absolute pointer-events-none"
                style={{
                  width: 140,
                  height: 80,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse, rgba(239,71,111,0.95) 0%, rgba(239,71,111,0.5) 40%, transparent 72%)",
                  filter: "blur(18px)",
                  bottom: -28,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 0,
                  animation: "ctaBacklight 2.8s ease-in-out infinite",
                }}
              />

              {/* Cream gap */}
              <div className="relative z-10 rounded-full p-[3px] bg-secondary-cream active:scale-95 transition-transform duration-150">
                {/* Moving white border container */}
                <div className="relative rounded-full p-[2.5px] overflow-hidden bg-secondary-cream">
                  {/* Rotating white arc */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      width: "200%",
                      height: "200%",
                      top: "-50%",
                      left: "-50%",
                      background:
                        "conic-gradient(from 0deg, transparent 0%, transparent 72%, white 83%, transparent 94%)",
                      animation: "borderSpin 2s linear infinite",
                    }}
                  />
                  {/* Coral button */}
                  <div
                    className="relative bg-accent-coral rounded-full px-4 py-2 flex items-center justify-center"
                    style={{ boxShadow: "0 2px 12px rgba(239,71,111,0.45)" }}
                  >
                    <span className="text-white font-bold text-[13px] font-body leading-tight text-center max-w-[60px]">
                      Start Creating
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <span className="text-[10px] font-semibold text-accent-coral mt-0.5 font-body leading-none invisible">
              Create
            </span>
          </Link>
          {/* My Songs */}
          <Link
            href="/my-songs"
            aria-current={isActive("my-songs") ? "page" : undefined}
            className={tabClass("my-songs")}
            aria-label="My Songs"
            onClick={() => {
              trackNavigationEvent.click("my_songs", "/my-songs", "bottom_tab");
              if (!activeNudge) return;
              trackMySongsNudgeEvent.click(
                activeNudge.type,
                activeNudge.requestId,
                pathname,
              );
              setActiveNudge(null);
            }}
          >
            {activeNudge ? (
              <>
                <style>{`
                  @keyframes mySongsNudgeBounceOnce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                  }
                  .my-songs-nudge-float {
                    animation: mySongsNudgeBounceOnce 1s ease-in-out 1 forwards;
                  }
                `}</style>
                <span
                  className="absolute bottom-[calc(100%+2px)] left-1/2 z-[1] flex -translate-x-1/2 flex-col items-center pointer-events-none"
                  aria-hidden
                >
                  <span className="my-songs-nudge-float flex max-w-[min(88vw,240px)] flex-col items-center">
                    <span className="rounded-2xl border border-accent-coral/35 bg-white px-2.5 py-1.5 text-center text-[10px] font-semibold leading-snug text-text-teal shadow-sm">
                      {nudgeMessage}
                    </span>
                    {/* Downward pointer toward My Songs tab */}
                    <svg
                      width="20"
                      height="9"
                      viewBox="0 0 20 9"
                      className="-mt-px flex-shrink-0 text-white"
                      aria-hidden
                    >
                      <path
                        d="M1 0 L10 8 L19 0"
                        fill="currentColor"
                        stroke="rgba(239,71,111,0.35)"
                        strokeWidth="1"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </span>
              </>
            ) : null}
            <span
              className={`absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] rounded-b-full transition-all duration-200 ${isActive("my-songs") ? "w-8 bg-accent-coral" : "w-0"}`}
            />
            <Music2
              className="w-5 h-5"
              strokeWidth={isActive("my-songs") ? 2.5 : 1.8}
            />
            <span
              className={`text-[10px] font-body leading-none ${isActive("my-songs") ? "font-bold" : "font-medium"}`}
            >
              My Songs
            </span>
          </Link>

          {/* Profile */}
          <Link
            href="/profile"
            aria-current={isActive("profile") ? "page" : undefined}
            className={tabClass("profile")}
            aria-label="Profile"
            onClick={() =>
              trackNavigationEvent.click("profile", "/profile", "bottom_tab")
            }
          >
            <span
              className={`absolute top-0 left-1/2 -translate-x-1/2 h-[2.5px] rounded-b-full transition-all duration-200 ${isActive("profile") ? "w-8 bg-accent-coral" : "w-0"}`}
            />
            <User
              className="w-5 h-5"
              strokeWidth={isActive("profile") ? 2.5 : 1.8}
            />
            <span
              className={`text-[10px] font-body leading-none ${isActive("profile") ? "font-bold" : "font-medium"}`}
            >
              Profile
            </span>
          </Link>
        </div>
        {/* iOS home-indicator safe area */}
        <div style={{ height: "env(safe-area-inset-bottom)" }} />
      </div>
    </nav>
  );
}
