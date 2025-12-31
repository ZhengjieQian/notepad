// Validation Schemas using Zod
// Zod provides runtime type validation and parsing for TypeScript
// Learn more: https://zod.dev/

import * as z from 'zod';

// Login form validation schema
// This ensures login form data is valid before processing
export const LoginSchema = z.object({
  // Email field: must be a valid email format
  email: z.string().email({
    message: 'Email is required',
  }),
  
  // Password field: must not be empty
  // Note: We use min(1) here instead of a longer minimum because
  // this is for login (existing passwords), not registration
  password: z.string().min(1, {
    message: 'Password is required',
  }),
}); 

// Registration form validation schema
export const RegisterSchema = z.object({
  email: z.string().email({
    message: 'Enter a valid email address',
  }),
  password: z.string().min(8, {
    message: 'Password must be at least 8 characters long',
  }),
});