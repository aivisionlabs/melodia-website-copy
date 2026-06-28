import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

interface AuthMessageDisplayProps {
  setSuccessMessage: (message: string | null) => void;
  setFormError: (error: string | null) => void;
}

export function AuthMessageDisplay({
  setSuccessMessage,
  setFormError,
}: AuthMessageDisplayProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { clearError } = useAuth();

  useEffect(() => {
    const message = searchParams.get("message");
    const error = searchParams.get("error");

    if (message === "password-reset-success") {
      setSuccessMessage(
        "Password reset successful! You can now log in with your new password."
      );
      clearError();
      setTimeout(() => setSuccessMessage(null), 5000);
    }

    if (message === "google-auth-success") {
      setSuccessMessage("Google authentication successful! Redirecting...");
      setTimeout(() => {
        router.push("/profile");
      }, 1500);
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        oauth_error: "Google authentication was cancelled or failed.",
        missing_code: "Authentication failed. Please try again.",
        auth_failed: "Authentication failed. Please try again.",
        server_error: "Server error occurred. Please try again later.",
      };

      const errorMessage =
        errorMessages[error] || "An error occurred during authentication.";
      const detailedMessage = searchParams.get("message");
      setFormError(
        detailedMessage
          ? `${errorMessage}: ${decodeURIComponent(detailedMessage)}`
          : errorMessage
      );
    }
  }, [searchParams, router, clearError, setSuccessMessage, setFormError]);

  return null;
}
