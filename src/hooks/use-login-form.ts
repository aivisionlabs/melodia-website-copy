import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './use-auth';
import { useFormValidation } from './use-form-validation';
import { trackAuthEvent } from '@/lib/analytics';

// Single Responsibility: Hook manages login form state and logic
export interface LoginFormState {
  // Form data
  email: string;
  password: string;
  showPassword: boolean;
  isSubmitting: boolean;
  error: string | null;
  // Validation
  validation: ReturnType<typeof useFormValidation>;
  // Actions
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setShowPassword: (showPassword: boolean) => void;
  clearError: () => void;

  // Handlers
  handleEmailChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handlePasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;

  // Computed values
  isFormValid: boolean;
}

export const useLoginForm = (): LoginFormState => {
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dependencies
  const router = useRouter();
  const { login } = useAuth();
  const validation = useFormValidation();

  // Single Responsibility: Handle email changes with validation
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value.trim()) {
      validation.validateField("email", value);
    }
  }, [validation]);

  // Single Responsibility: Handle password changes with validation
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (value.trim()) {
      validation.validateField("password", value);
    }
  }, [validation]);

  // Single Responsibility: Clear error message
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Single Responsibility: Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    trackAuthEvent.loginAttempt('email');
    setIsSubmitting(true);
    setError(null); // Clear any previous errors
    validation.clearErrors();

    // Validate all fields
    const emailValid = validation.validateField("email", email);
    const passwordValid = validation.validateField("password", password);

    if (!emailValid || !passwordValid) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Get anonymous user ID from API (reads from cookie server-side)
      // The login API will automatically read from cookie if anonymousId not provided
      let anonymousId: string | null = null;
      try {
        const anonymousResponse = await fetch('/api/users/anonymous', {
          credentials: 'include',
        });
        if (anonymousResponse.ok) {
          const anonymousData = await anonymousResponse.json();
          anonymousId = anonymousData.anonymousUserId;
        }
      } catch (err) {
        // If anonymous user fetch fails, proceed without it (API will read from cookie)
        console.warn('Could not fetch anonymous user ID:', err);
      }

      const result = await login(email, password, anonymousId);

      if (result.success) {
        // Clear form on successful login
        setEmail("");
        setPassword("");

        // Use Next.js router for navigation (proper Next.js way)
        router.push('/profile');
      } else {
        // Set specific error message for failed login
        if (result.error === 'Invalid email or password.') {
          setError('This email address is not registered. Please sign up first or check your email address.');
        } else {
          setError(result.error || 'Login failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, validation, login, router]);

  // Computed values
  const isFormValid = Boolean(
    email.trim() &&
    password.trim() &&
    !validation.errors.email &&
    !validation.errors.password
  );

  // Interface Segregation: Return only what's needed for login
  return {
    // Form data
    email,
    password,
    showPassword,
    isSubmitting,
    error,
    // Validation
    validation,
    // Actions
    setEmail,
    setPassword,
    setShowPassword,
    clearError,
    // Handlers
    handleEmailChange,
    handlePasswordChange,
    handleSubmit,

    // Computed values
    isFormValid
  };
};
