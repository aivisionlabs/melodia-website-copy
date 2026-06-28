"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function GoogleAuthButton() {
  const handleGoogleSignIn = () => {
    // Anonymous user ID is stored in httpOnly cookie server-side
    // The OAuth merge logic in auth config will automatically read from cookie
    // No need to pass it client-side

    // Sign in with Google
    signIn("google", { callbackUrl: "/profile" });
  };

  return (
    <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
      Sign in with Google
    </Button>
  );
}
