import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Merge Tailwind CSS classes with proper conflict resolution
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate secure client-side session ID using crypto API for uniqueness
export function generateClientSessionId(): string {
  return crypto.randomUUID();
}

// Generate secure client-side message ID using crypto API for uniqueness
export function generateMessageId(): string {
  return crypto.randomUUID();
}

// Generate secure client-side ID for any purpose using crypto API
export function generateSecureId(): string {
  return crypto.randomUUID();
}

// Validate session ID format to ensure it's a valid UUID v4
export function isValidSessionId(sessionId: string): boolean {
  // Type and length checks for basic validation
  if (typeof sessionId !== 'string' || sessionId.length !== 36) {
    return false;
  }

  // Only accept v4 UUIDs for consistency with generator function
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(sessionId);
}
