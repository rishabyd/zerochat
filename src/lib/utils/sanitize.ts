import xss from 'xss';
import { isValidSessionId } from '../utils';

const plainTextOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
};

export function sanitizeText(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  const sanitized = xss(input, plainTextOptions);
  return sanitized.trim();
}

export function sanitizeSessionTitle(title: string): string {
  if (typeof title !== 'string') {
    throw new Error('Title must be a string');
  }

  const sanitized = sanitizeText(title);

  if (sanitized.length > 200) {
    throw new Error('Title too long (max 200 characters)');
  }

  if (sanitized.length === 0) {
    throw new Error('Title cannot be empty');
  }

  return sanitized;
}

export function validateSessionId(sessionId: string): string {
  if (typeof sessionId !== 'string') {
    throw new Error('Session ID must be a string');
  }

  if (!isValidSessionId(sessionId)) {
    throw new Error('Invalid session ID format');
  }

  return sessionId;
}
