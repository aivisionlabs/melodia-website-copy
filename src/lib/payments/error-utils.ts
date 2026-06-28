type PaymentErrorLogDetails = {
  message: string;
  name?: string;
  stack?: string;
};

export function getPaymentErrorMessage(
  error: unknown,
  fallback = "Payment failed",
): string {
  try {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
  } catch {
    // Some checkout SDKs reject with cross-origin WindowProxy objects. Even
    // `instanceof Error` can throw when the browser tries to inspect them.
  }

  try {
    if (typeof error === "string" && error.trim()) {
      return error;
    }

    if (error && typeof error === "object") {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }
  } catch {
    // Avoid surfacing SecurityError from reading cross-origin object fields.
  }

  return fallback;
}

export function getPaymentErrorLogDetails(
  error: unknown,
  fallback = "Payment failed",
): PaymentErrorLogDetails {
  const details: PaymentErrorLogDetails = {
    message: getPaymentErrorMessage(error, fallback),
  };

  try {
    if (error instanceof Error) {
      if (error.name) details.name = error.name;
      if (error.stack) details.stack = error.stack;
    }
  } catch {
    details.name = "UnreadablePaymentError";
  }

  return details;
}
