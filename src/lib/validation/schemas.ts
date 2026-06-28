import { z } from 'zod';

// Signup validation schema
export const signupSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces')
    .transform(str => str.trim()),

  email: z.string()
    .email('Please enter a valid email address')
    .toLowerCase()
    .transform(str => str.trim()),

  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      // Adjust age if birthday hasn't occurred this year
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1 >= 13 && age - 1 <= 120;
      }

      return age >= 13 && age <= 120;
    }, 'You must be between 13 and 120 years old'),

  phoneNumber: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
    .refine((phone) => {
      if (!phone.trim()) return true; // Optional field
      const cleaned = phone.replace(/[\s\-\(\)]/g, '');

      // International format
      if (cleaned.startsWith('+')) {
        const digitsOnly = cleaned.substring(1).replace(/\D/g, '');
        return digitsOnly.length >= 10 && digitsOnly.length <= 15;
      }

      // Indian mobile: 10 digits starting with 6-9
      const digitsOnly = cleaned.replace(/\D/g, '');
      return digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly);
    }, 'Mobile number should be 10 digits (starting with 6-9) or international format (+country code)')
    .optional()
    .or(z.literal(''))
    .transform(str => str === '' ? undefined : str?.trim()),

  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .transform(str => str.trim()),

  anonymous_user_id: z.string()
    .uuid('Invalid anonymous user ID format')
    .optional()
});

// Email verification schema
export const verifyEmailSchema = z.object({
  code: z.string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'Verification code must contain only numbers')
});

// Send verification schema (no body needed, user from JWT)
export const sendVerificationSchema = z.object({});

// Type exports
export type SignupRequest = z.infer<typeof signupSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailSchema>;
export type SendVerificationRequest = z.infer<typeof sendVerificationSchema>;
