// User Data Access Layer
// This file contains database queries related to user operations
// Following the Repository/Data Access Layer pattern for better code organization

import prisma from '@/lib/prisma';

// Get user by email address
// This is a common query used for login authentication and user lookups
export const getUserByEmail = async (email: string) => {
  try {
    // Use Prisma to find a unique user by email
    // findUnique is used because email has a unique constraint in the database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Return the user object if found, or null if not found
    return user;
  } catch {
    // If any database error occurs, return null instead of throwing
    // This provides a consistent API that doesn't crash the application
    return null;
  }
}; 