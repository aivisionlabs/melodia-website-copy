import * as React from 'react';
import { useRef, useEffect, useState, useCallback } from 'react';

// Single Responsibility: Component handles 6-digit OTP input with auto-focus
interface OTPInputProps {
    value: string;
    onChange: (value: string) => void;
    onComplete?: (value: string) => void;
    disabled?: boolean;
    error?: boolean;
    className?: string;
}

export const OTPInput: React.FC<OTPInputProps> = ({
    value,
    onChange,
    onComplete,
    disabled = false,
    error = false,
    className = '',
}) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [digits, setDigits] = useState<string[]>(Array(6).fill(''));

    // Update digits when value prop changes
    useEffect(() => {
        // Create array of 6 digits, filling empty positions with empty strings
        const newDigits = Array(6)
            .fill('')
            .map((_, index) => value[index] || '');
        setDigits(newDigits);
        console.log('OTP digits updated:', newDigits, 'from value:', value);
    }, [value]);

    // Single Responsibility: Handle individual digit input
    const handleInputChange = useCallback(
        (index: number, digit: string) => {
            // Only allow numeric input
            if (digit && !/^\d$/.test(digit)) return;

            const newDigits = [...digits];
            newDigits[index] = digit;
            setDigits(newDigits);

            const newValue = newDigits.join('');
            onChange(newValue);

            // Auto-focus next input
            if (digit && index < 5) {
                inputRefs.current[index + 1]?.focus();
            }

             // Call onComplete when all digits are filled
             if (newValue.length === 6 && onComplete) {
                 // Pass the complete value to onComplete to avoid state timing issues
                 onComplete(newValue);
             }
        },
        [digits, onChange, onComplete]
    );

    // Single Responsibility: Handle backspace navigation
    const handleKeyDown = useCallback(
        (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Backspace') {
                if (!digits[index] && index > 0) {
                    // Move to previous input if current is empty
                    inputRefs.current[index - 1]?.focus();
                } else if (digits[index]) {
                    // Clear current input
                    handleInputChange(index, '');
                }
            } else if (e.key === 'ArrowLeft' && index > 0) {
                inputRefs.current[index - 1]?.focus();
            } else if (e.key === 'ArrowRight' && index < 5) {
                inputRefs.current[index + 1]?.focus();
            }
        },
        [digits, handleInputChange]
    );

    // Single Responsibility: Handle paste functionality
    const handlePaste = useCallback(
        (e: React.ClipboardEvent) => {
            e.preventDefault();
            const pasteData = e.clipboardData
                .getData('text')
                .replace(/\D/g, '')
                .slice(0, 6);

            if (pasteData) {
                const newDigits = pasteData.padEnd(6, '').split('').slice(0, 6);
                setDigits(newDigits);
                onChange(pasteData);

                // Focus the last filled input or the next empty one
                const nextIndex = Math.min(pasteData.length, 5);
                inputRefs.current[nextIndex]?.focus();

                 // Call onComplete if all digits are filled
                 if (pasteData.length === 6 && onComplete) {
                     onComplete(pasteData);
                 }
            }
        },
        [onChange, onComplete]
    );

    // Single Responsibility: Handle input focus
    const handleFocus = useCallback((index: number) => {
        // Select all text when focusing
        inputRefs.current[index]?.select();
    }, []);

    return (
        <div className={`flex justify-center space-x-2 ${className}`}>
            {digits.map((digit, index) => (
                <input
                    key={index}
                    ref={(el) => {
                        inputRefs.current[index] = el;
                    }}
                    type='text'
                    inputMode='numeric'
                    pattern='[0-9]*'
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    onFocus={() => handleFocus(index)}
                    disabled={disabled}
                    className={`
            w-11 h-14 text-center text-2xl font-semibold font-body
            bg-white border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
            transition-all duration-200
            ${
                error
                    ? 'border-red-500 text-red-600'
                    : 'border-melodia-teal/20 text-melodia-teal'
            }
            ${
                disabled
                    ? 'opacity-50 cursor-not-allowed bg-gray-50'
                    : 'hover:border-melodia-teal/40'
            }
          `}
                    aria-label={`Digit ${index + 1} of 6`}
                    aria-describedby={error ? 'otp-error' : undefined}
                />
            ))}
        </div>
    );
};
