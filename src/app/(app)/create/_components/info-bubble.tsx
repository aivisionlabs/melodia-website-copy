"use client";

import { useRef, useState } from "react";
import { Info } from "lucide-react";

export function InfoBubble({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [openLeft, setOpenLeft] = useState(false);

  const handleClick = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setOpenLeft(rect.left > window.innerWidth / 2);
    }
    setShow((v) => !v);
  };

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        onBlur={() => setTimeout(() => setShow(false), 150)}
        className="text-text-teal/35 hover:text-accent-coral transition-colors"
        aria-label="More info"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <span
          className={`absolute ${openLeft ? "right-6 -top-1" : "left-6 -top-1"} z-[70] w-56 text-[11px] bg-text-teal text-white rounded-2xl px-3.5 py-2.5 shadow-2xl leading-relaxed pointer-events-none`}
        >
          {text}
        </span>
      )}
    </span>
  );
}
