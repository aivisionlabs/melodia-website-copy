import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFormValidation } from './use-form-validation';
import { formatDateOfBirth, formatPhoneNumber, convertDateFormat } from '@/lib/validation';
import { useAuth } from '@/contexts/AuthContext';
import { trackAuthEvent } from '@/lib/analytics';

// Single Responsibility: Hook manages profile info form state and logic
export interface ProfileInfoFormState {
  // Form data
  email: string;
  name: string;
  dateOfBirth: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  isSubmitting: boolean;

  // Validation
  validation: ReturnType<typeof useFormValidation>;

  // Actions
  setEmail: (email: string) => void;
  setName: (name: string) => void;
  setDateOfBirth: (dateOfBirth: string) => void;
  setPhoneNumber: (phoneNumber: string) => void;
  setPassword: (password: string) => void;
  setConfirmPassword: (confirmPassword: string) => void;

  // Handlers
  handleEmailChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleNameChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleDateOfBirthChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handlePhoneNumberChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handlePasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleConfirmPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;

  // Computed values
  isFormValid: boolean;
}

export const useProfileInfoForm = (): ProfileInfoFormState => {
  // Form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dependencies
  const router = useRouter();
  const validation = useFormValidation();
  const { register } = useAuth();

  // Single Responsibility: Handle email changes with validation
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (value.trim()) {
      validation.validateField("email", value);
    }
  }, [validation]);

  // Single Responsibility: Handle name changes with validation
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setName(value);
    if (value.trim()) {
      validation.validateField("name", value);
    }
  }, [validation]);

  // Single Responsibility: Handle date of birth changes with formatting and validation
  const handleDateOfBirthChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    const formatted = formatDateOfBirth(value);
    setDateOfBirth(formatted);
    if (formatted.trim()) {
      validation.validateField("dateOfBirth", formatted);
    }
  }, [validation]);

  // Single Responsibility: Handle phone number changes with formatting and validation
  const handlePhoneNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    const formatted = formatPhoneNumber(value);
    setPhoneNumber(formatted);
    if (formatted.trim()) {
      validation.validateField("phoneNumber", formatted);
    }
  }, [validation]);

  // Single Responsibility: Handle password changes with validation
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (value.trim()) {
      validation.validateField("password", value);
      // Re-validate confirm password if it exists
      if (confirmPassword.trim()) {
        validation.validateField("confirmPassword", confirmPassword, value);
      }
    }
  }, [validation, confirmPassword]);

  // Single Responsibility: Handle confirm password changes with validation
  const handleConfirmPasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (value.trim()) {
      validation.validateField("confirmPassword", value, password);
    }
  }, [validation, password]);

  // Single Responsibility: Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    trackAuthEvent.signupAttempt('email');
    setIsSubmitting(true);
    validation.clearErrors();

    // Validate all fields
    const nameValid = validation.validateField("name", name);
    const emailValid = validation.validateField("email", email);
    const dobValid = validation.validateField("dateOfBirth", dateOfBirth);
    const phoneValid = phoneNumber.trim() ? validation.validateField("phoneNumber", phoneNumber) : true;
    const passwordValid = validation.validateField("password", password);
    const confirmPasswordValid = validation.validateField("confirmPassword", confirmPassword, password);

    if (!nameValid || !emailValid || !dobValid || !phoneValid || !passwordValid || !confirmPasswordValid) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Get anonymous user ID from API (reads from cookie server-side)
      // The registration API will automatically read from cookie if anonymousId not provided
      let anonymousId: string | undefined;
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

      // Convert dateOfBirth from DD/MM/YYYY to YYYY-MM-DD format
      const formattedDateOfBirth = convertDateFormat(dateOfBirth.trim(), 'DD/MM/YYYY', 'YYYY-MM-DD');

      const result = await register(
        name.trim(),
        email.trim().toLowerCase(),
        password.trim(),
        formattedDateOfBirth,
        phoneNumber.trim() || undefined,
        anonymousId || undefined
      );

      if (result.success) {
        trackAuthEvent.signupSuccess('email');
        // Store email and password in sessionStorage for verification page
        // Note: anonymous_user_id will be cleared by AuthContext after login
        const userEmail = email.trim().toLowerCase();
        sessionStorage.setItem('signup_email', userEmail);
        sessionStorage.setItem('signup_password', password.trim());

        // Use Next.js router for navigation (proper Next.js way)
        router.push(`/signup/verify?email=${encodeURIComponent(userEmail)}`);
        return; // Exit early to prevent any further code execution
      } else {
        // Handle API errors - set field-specific errors if available
        if (result.fieldErrors) {
          Object.entries(result.fieldErrors).forEach(([field, message]) => {
            validation.setFieldError(field, message);
          });
        } else {
          // Fallback to email field if no field-specific errors
          validation.setFieldError("email", result.error || "Signup failed. Please try again.");
        }
      }
    } catch (error) {
      console.error('Profile info submission error:', error);
      validation.setFieldError("email", "Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    name,
    email,
    dateOfBirth,
    phoneNumber,
    password,
    confirmPassword,
    validation,
    register,
    router,
  ]);

  // Computed values
  const isFormValid =
    name.trim() &&
    email.trim() &&
    dateOfBirth.trim() &&
    password.trim() &&
    confirmPassword.trim() &&
    !validation.errors.name &&
    !validation.errors.email &&
    !validation.errors.dateOfBirth &&
    !validation.errors.password &&
    !validation.errors.confirmPassword &&
    (!phoneNumber.trim() || !validation.errors.phoneNumber);

  // Interface Segregation: Return only what's needed for profile info
  return {
    // Form data
    email,
    name,
    dateOfBirth,
    phoneNumber,
    password,
    confirmPassword,
    isSubmitting,

    // Validation
    validation,

    // Actions
    setEmail,
    setName,
    setDateOfBirth,
    setPhoneNumber,
    setPassword,
    setConfirmPassword,

    // Handlers
    handleEmailChange,
    handleNameChange,
    handleDateOfBirthChange,
    handlePhoneNumberChange,
    handlePasswordChange,
    handleConfirmPasswordChange,
    handleSubmit,

    // Computed values
    isFormValid: !!isFormValid
  };
};
