import DOMPurify from "isomorphic-dompurify";

// Sanitize text input to prevent XSS
export function sanitizeText(input: string): string {
  if (typeof input !== "string") {
    throw new Error("Input must be a string");
  }

  // Remove HTML tags and dangerous characters
  const sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });

  // Trim whitespace
  return sanitized.trim();
}

// Validate and sanitize session title
export function sanitizeSessionTitle(title: string): string {
  if (typeof title !== "string") {
    throw new Error("Title must be a string");
  }

  // Sanitize the title
  const sanitized = sanitizeText(title);

  // Limit length to prevent DoS
  if (sanitized.length > 200) {
    throw new Error("Title too long (max 200 characters)");
  }

  // Ensure it's not empty
  if (sanitized.length === 0) {
    throw new Error("Title cannot be empty");
  }

  return sanitized;
}

// Validate session ID format and ownership
export function validateSessionId(sessionId: string): string {
  if (typeof sessionId !== "string") {
    throw new Error("Session ID must be a string");
  }

  // Check UUID format
  if (!isValidSessionId(sessionId)) {
    throw new Error("Invalid session ID format");
  }

  return sessionId;
}

// Import the existing function
import { isValidSessionId } from "../utils";
