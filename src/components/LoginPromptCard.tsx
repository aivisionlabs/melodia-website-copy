"use client";

import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { CloudUpload, LogIn } from "lucide-react";

export function LoginPromptCard() {
  const router = useRouter();

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-amber-200 bg-gradient-to-br from-white to-amber-50">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-primary-yellow rounded-full flex items-center justify-center">
            <CloudUpload className="w-8 h-8 text-text-teal" />
          </div>
        </div>
        <h3 className="text-xl font-heading font-bold text-text-teal mb-2">
          Don&apos;t Lose Your Masterpieces!
        </h3>
        <p className="font-body text-neutral-600 mb-6 max-w-sm">
          Log in or create an account to safely back up your songs and access
          them from any device.
        </p>
        <Button
          onClick={() => router.push("/login")}
          className="bg-accent-coral text-white hover:bg-accent-coral/90 w-full max-w-xs"
          size="lg"
        >
          <LogIn className="w-5 h-5 mr-2" />
          Login or Sign Up
        </Button>
      </div>
    </div>
  );
}
