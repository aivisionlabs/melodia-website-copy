"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function RequestCaptureSuccessPage() {
  const router = useRouter();

  // Auto redirect to home after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  const handleGoHome = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <div></div>
        <button
          onClick={handleGoHome}
          aria-label="Close"
          className="w-8 h-8 flex items-center justify-center text-text/60 hover:text-text transition-colors"
        >
          ✕
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-sm">
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-display font-bold text-text mb-4">
            Success!
          </h1>

          <p className="text-base font-body text-text/80 leading-relaxed mb-8">
            Your Song Request has been captured successfully. We will contact
            you soon.
          </p>

          {/* Action Button */}
          <Button
            onClick={handleGoHome}
            className="w-full h-14 bg-primary text-text font-display font-bold text-lg rounded-full shadow-md hover:bg-yellow-400 transition-colors duration-300"
          >
            Go to Home
          </Button>

          {/* Auto-redirect notice */}
          <p className="text-sm text-text/60 mt-4">
            You will be redirected automatically in a few seconds...
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center">
        <p className="text-sm text-text/60">Thank you for choosing Melodia!</p>
      </footer>
    </div>
  );
}
