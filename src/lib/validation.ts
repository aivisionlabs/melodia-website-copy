// Validation utilities following DRY principle and Single Responsibility

export interface ValidationResult {
  isValid: boolean;
  error: string;
}

export interface ValidationRule {
  field: string;
  validate: (value: any) => ValidationResult;
  message: string;
}

// Single Responsibility: Each validator handles one specific validation
export const validateEmail = (email: string): string => {
  if (!email.trim()) return "Email is required";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "Please enter a valid email address";
  return "";
};

export const validatePassword = (password: string): string => {
  if (!password.trim()) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  return "";
};

export const validateConfirmPassword = (confirmPassword: string, password: string): string => {
  if (!confirmPassword.trim()) return "Please confirm your password";
  if (confirmPassword !== password) return "Passwords do not match";
  return "";
};

export const validateName = (name: string): string => {
  if (!name.trim()) return "Name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters";
  if (!/^[a-zA-Z\s]+$/.test(name.trim())) return "Name can only contain letters and spaces";
  return "";
};

export const validateDateOfBirth = (dob: string): string => {
  if (!dob.trim()) return "Date of birth is required";

  // Check format DD/MM/YYYY
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (!dateRegex.test(dob)) return "Please enter date in DD/MM/YYYY format";

  const [, day, month, year] = dob.match(dateRegex)!;
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);

  // Check if date is valid
  if (monthNum < 1 || monthNum > 12) return "Invalid month";
  if (dayNum < 1 || dayNum > 31) return "Invalid day";
  if (yearNum < 1900 || yearNum > new Date().getFullYear()) return "Invalid year";

  // Check if date actually exists
  const date = new Date(yearNum, monthNum - 1, dayNum);
  if (date.getDate() !== dayNum || date.getMonth() !== monthNum - 1 || date.getFullYear() !== yearNum) {
    return "Invalid date";
  }

  // Check if user is at least 13 years old
  const today = new Date();
  const age = today.getFullYear() - yearNum;
  if (age < 13) return "You must be at least 13 years old";

  return "";
};

export const validatePhoneNumber = (phone: string): string => {
  if (!phone.trim()) return ""; // Phone is optional

  // Remove spaces, dashes, parentheses but keep + and digits
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Check for international format (starts with +)
  if (cleaned.startsWith('+')) {
    // International number: + followed by country code and number
    // Examples: +919090407368 (India), +16014635923 (US)
    const digitsOnly = cleaned.substring(1).replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return "International phone number should be 10-15 digits after country code";
    }
    return "";
  }

  // Indian mobile number format: 10 digits starting with 6, 7, 8, or 9
  // Examples: 9090407368, 9876543210
  const digitsOnly = cleaned.replace(/\D/g, '');

  if (digitsOnly.length !== 10) {
    return "Indian mobile number should be 10 digits";
  }

  // Must start with 6, 7, 8, or 9 (valid Indian mobile number prefixes)
  if (!/^[6-9]/.test(digitsOnly)) {
    return "Mobile number should start with 6, 7, 8, or 9";
  }

  return "";
};

// DRY: Reusable validation rule creators
export const createRequiredValidator = (fieldName: string): ValidationRule => ({
  field: fieldName,
  validate: (value: any) => ({
    isValid: !!value?.toString().trim(),
    error: `${fieldName} is required`
  }),
  message: `${fieldName} is required`
});

export const createEmailValidator = (): ValidationRule => ({
  field: 'email',
  validate: (email: string) => {
    const error = validateEmail(email);
    return {
      isValid: error === "",
      error
    };
  },
  message: "Please enter a valid email address"
});

export const createPasswordValidator = (minLength: number = 6): ValidationRule => ({
  field: 'password',
  validate: (password: string) => {
    const error = validatePassword(password);
    return {
      isValid: error === "",
      error
    };
  },
  message: `Password must be at least ${minLength} characters`
});

// Generic validation function following Single Responsibility
export const validateField = (fieldName: string, value: string): string => {
  switch (fieldName) {
    case "email":
      return validateEmail(value);
    case "password":
      return validatePassword(value);
    case "name":
      return validateName(value);
    case "dateOfBirth":
      return validateDateOfBirth(value);
    case "phoneNumber":
      return validatePhoneNumber(value);
    default:
      return "";
  }
};

// Input formatting utilities (Single Responsibility)
export const formatDateOfBirth = (value: string): string => {
  // Auto-format date as user types
  let formatted = value.replace(/\D/g, ''); // Remove non-digits
  if (formatted.length >= 2) {
    formatted = formatted.substring(0, 2) + '/' + formatted.substring(2);
  }
  if (formatted.length >= 5) {
    formatted = formatted.substring(0, 5) + '/' + formatted.substring(5, 9);
  }
  return formatted;
};

export const formatPhoneNumber = (value: string): string => {
  // Only allow digits, spaces, +, -, (, )
  return value.replace(/[^\d\s+\-()]/g, '');
};

/**
 * Normalize phone number for Cashfree API
 * Formats to: 10-digit Indian number (9090407368) or international format (+919090407368)
 * Cashfree accepts: +919090407368, 9090407368, or +16014635923
 */
export const normalizePhoneForCashfree = (phone: string): string => {
  if (!phone.trim()) return '';

  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // If starts with +, return as-is (international format)
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Remove all non-digits
  const digitsOnly = cleaned.replace(/\D/g, '');

  // If 10 digits and starts with 6-9, it's an Indian mobile number
  if (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) {
    return digitsOnly; // Return as 10-digit number (Cashfree accepts this)
  }

  // If 12 digits and starts with 91, it's Indian number with country code
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`; // Add + prefix for international format
  }

  // If 11 digits and starts with 0, remove leading 0 (Indian landline format)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return digitsOnly.substring(1); // Remove leading 0
  }

  // For other cases, try to format as international
  if (digitsOnly.length >= 10) {
    return `+${digitsOnly}`;
  }

  // Return cleaned digits if nothing else matches
  return digitsOnly;
};

// Date conversion utility
export const convertDateFormat = (dateString: string, fromFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD', toFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD'): string => {
  if (!dateString.trim()) return dateString;

  if (fromFormat === 'DD/MM/YYYY' && toFormat === 'YYYY-MM-DD') {
    // Convert DD/MM/YYYY to YYYY-MM-DD
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateString.match(dateRegex);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month}-${day}`;
    }
  } else if (fromFormat === 'YYYY-MM-DD' && toFormat === 'DD/MM/YYYY') {
    // Convert YYYY-MM-DD to DD/MM/YYYY
    const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
    const match = dateString.match(dateRegex);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
  }

  return dateString; // Return original if no conversion needed or format doesn't match
};
