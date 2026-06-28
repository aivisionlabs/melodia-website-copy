import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Single Responsibility: Component handles resend functionality with countdown
interface ResendButtonProps {
  onResend: () => void | Promise<void>;
  disabled?: boolean;
  cooldownSeconds?: number;
  className?: string;
}

export const ResendButton: React.FC<ResendButtonProps> = ({
  onResend,
  disabled = false,
  cooldownSeconds = 60,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(true);

  // Single Responsibility: Handle countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [countdown]);

  // Single Responsibility: Handle resend action
  const handleResend = useCallback(async () => {
    if (!canResend || disabled || isLoading) return;

    setIsLoading(true);
    setCanResend(false);

    try {
      await onResend();
      // Start countdown after successful resend
      setCountdown(cooldownSeconds);
    } catch (error) {
      // If resend fails, allow immediate retry
      setCanResend(true);
      console.error('Resend failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [canResend, disabled, isLoading, onResend, cooldownSeconds]);

  // Determine button state
  const isDisabled = disabled || isLoading || !canResend;
  const showCountdown = countdown > 0;

  return (
    <button
      onClick={handleResend}
      disabled={isDisabled}
      className={`
        font-semibold text-melodia-coral transition-colors duration-200
        ${isDisabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:text-melodia-coral/80 hover:underline'
        }
        ${className}
      `}
      aria-label={showCountdown ? `Resend code in ${countdown} seconds` : 'Resend verification code'}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <LoadingSpinner size="sm" className="mr-2" />
          Sending...
        </div>
      ) : showCountdown ? (
        `Resend Code (${countdown}s)`
      ) : (
        'Resend Code'
      )}
    </button>
  );
};
