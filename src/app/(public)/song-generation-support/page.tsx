"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, Mail, MessageCircle } from "lucide-react";
import Footer from "@/components/Footer";
import { trackCTAEvent } from "@/lib/analytics";

function SongGenerationSupportContent() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");
  const requestLine = requestId ? ` (Request #${requestId})` : "";

  useEffect(() => {
    trackCTAEvent.ctaImpression(
      "song_generation_support_page_view",
      "song_generation_support_page",
    );
  }, []);

  return (
    <div className="min-h-screen bg-secondary-cream flex flex-col font-body">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-accent-coral/10 border border-accent-coral/25 flex items-center justify-center mb-5">
          <AlertTriangle className="w-7 h-7 text-accent-coral" />
        </div>

        <h1 className="text-2xl font-bold font-heading text-text-teal mb-3 leading-tight">
          We are sorry - something went wrong
        </h1>

        <p className="text-sm text-text-teal/65 leading-relaxed max-w-md mb-2">
          Your payment is successful, but we hit an issue while processing your
          song{requestLine}.
        </p>
        <p className="text-sm text-text-teal/65 leading-relaxed max-w-md mb-7">
          Our support team has already been notified and will help you complete
          your song as quickly as possible.
        </p>

        <div className="w-full max-w-md rounded-2xl border border-text-teal/10 bg-white p-4 text-left mb-6">
          <p className="text-sm font-semibold text-text-teal mb-3">
            Contact support team
          </p>
          <div className="space-y-2">
            <a
              href="mailto:info@melodia-songs.com?subject=Error%20while%20processing%20song"
              onClick={() =>
                trackCTAEvent.ctaClick(
                  "song_generation_support_email",
                  "song_generation_support_page",
                )
              }
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-text-teal/15 text-text-teal font-semibold hover:bg-text-teal/5 transition-colors"
            >
              <Mail className="w-4 h-4" />
              Email info@melodia-songs.com
            </a>
            <a
              href="https://wa.me/917483464565?text=Hi%20Melodia%20team%2C%20my%20song%20processing%20failed%20after%20payment.%20Please%20help."
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackCTAEvent.whatsappContact("song_generation_support_page");
                trackCTAEvent.ctaClick(
                  "song_generation_support_whatsapp",
                  "song_generation_support_page",
                );
              }}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-[#25D366] text-white font-semibold hover:opacity-95 transition-opacity"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Support
            </a>
          </div>
        </div>

        <Link
          href="/my-songs"
          onClick={() =>
            trackCTAEvent.ctaClick(
              "song_generation_support_go_to_my_songs",
              "song_generation_support_page",
            )
          }
          className="w-full max-w-md h-12 bg-accent-coral text-white font-bold rounded-full inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ boxShadow: "0 6px 24px rgba(239,71,111,0.35)" }}
        >
          Go to My Songs
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <Footer />
    </div>
  );
}

export default function SongGenerationSupportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-secondary-cream flex flex-col font-body">
          <div className="flex-1 flex flex-col items-center justify-center px-5 py-12">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-text-teal/10" />
          </div>
          <Footer />
        </div>
      }
    >
      <SongGenerationSupportContent />
    </Suspense>
  );
}
