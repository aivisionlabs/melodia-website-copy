import { useState, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useFormValidation } from './use-form-validation';
import { formatDateOfBirth, formatPhoneNumber, convertDateFormat } from '@/lib/validation';

// Single Responsibility: Hook manages authentication form state and logic
export interface AuthFormState {
  // Form data
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
  phoneNumber: string;
  isSignUp: boolean;
  showPassword: boolean;
  isSubmitting: boolean;

  // Validation
  validation: ReturnType<typeof useFormValidation>;

  // Actions
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setName: (name: string) => void;
  setDateOfBirth: (dateOfBirth: string) => void;
  setPhoneNumber: (phoneNumber: string) => void;
  setIsSignUp: (isSignUp: boolean) => void;
  setShowPassword: (showPassword: boolean) => void;

  // Handlers
  handleEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDateOfBirthChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePhoneNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  toggleSignUpMode: () => void;

  // Computed values
  isFormValid: boolean;
}

export const useAuthForm = (): AuthFormState => {
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dependencies
  const { login, register, clearError } = useAuth();
  const validation = useFormValidation();

  // Single Responsibility: Handle email changes with validation
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Single Responsibility: Handle name changes with validation
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (value.trim()) {
      validation.validateField("name", value);
    }
  }, [validation]);

  // Single Responsibility: Handle date of birth changes with formatting and validation
  const handleDateOfBirthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatDateOfBirth(value);
    setDateOfBirth(formatted);
    if (formatted.trim()) {
      validation.validateField("dateOfBirth", formatted);
    }
  }, [validation]);

  // Single Responsibility: Handle phone number changes with formatting and validation
  const handlePhoneNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPhoneNumber(value);
    setPhoneNumber(formatted);
    if (formatted.trim()) {
      validation.validateField("phoneNumber", formatted);
    }
  }, [validation]);

  // Single Responsibility: Toggle between sign up and login modes
  const toggleSignUpMode = useCallback(() => {
    setIsSignUp(!isSignUp);
    clearError();
    validation.clearErrors();

    // Clear additional fields when switching to login mode
    if (!isSignUp) {
      setDateOfBirth("");
      setPhoneNumber("");
    }
  }, [isSignUp, clearError, validation]);

  // Single Responsibility: Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError();
    validation.clearErrors();

    // Validate all fields
    let isValid = true;

    if (isSignUp) {
      isValid = validation.validateField("name", name) && isValid;
      isValid = validation.validateField("dateOfBirth", dateOfBirth) && isValid;
      if (phoneNumber.trim()) {
        isValid = validation.validateField("phoneNumber", phoneNumber) && isValid;
      }
    }

    isValid = validation.validateField("email", email) && isValid;
    isValid = validation.validateField("password", password) && isValid;

    if (!isValid) {
      setIsSubmitting(false);
      return;
    }

    try {
      let result;
      if (isSignUp) {
        // Get anonymous user ID from API (reads from cookie server-side)
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

        result = await register(
          name.trim(),
          email.trim().toLowerCase(),
          password.trim(),
          formattedDateOfBirth,
          phoneNumber.trim() || undefined,
          anonymousId || undefined
        );
      } else {
        result = await login(email, password);
      }

      // Note: Navigation is handled by the parent component
      // This keeps the hook focused on form logic only
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isSignUp,
    name,
    dateOfBirth,
    phoneNumber,
    email,
    password,
    validation,
    clearError,
    register,
    login
  ]);

  // Computed values
  const isFormValid = Boolean(
    email.trim() &&
    password.trim() &&
    !validation.errors.email &&
    !validation.errors.password &&
    (!isSignUp || (
      !!name.trim() &&
      !!dateOfBirth.trim() &&
      !validation.errors.name &&
      !validation.errors.dateOfBirth &&
      (!phoneNumber.trim() || !validation.errors.phoneNumber)
    ))
  );

  // Interface Segregation: Return only what's needed
  return {
    // Form data
    email,
    password,
    name,
    dateOfBirth,
    phoneNumber,
    isSignUp,
    showPassword,
    isSubmitting,

    // Validation
    validation,

    // Actions
    setEmail,
    setPassword,
    setName,
    setDateOfBirth,
    setPhoneNumber,
    setIsSignUp,
    setShowPassword,

    // Handlers
    handleEmailChange,
    handlePasswordChange,
    handleNameChange,
    handleDateOfBirthChange,
    handlePhoneNumberChange,
    handleSubmit,
    toggleSignUpMode,

    // Computed values
    isFormValid
  };
};
