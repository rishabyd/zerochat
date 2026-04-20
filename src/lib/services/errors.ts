import { useErrorStore, getUserFriendlyError } from '@/lib/store/useErrorStore';
import { toast } from 'sonner';

// Global error handler that stops all operations immediately
export class CriticalError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'CriticalError';
  }
}

// Function to check if an error is critical and should stop all operations
export function isCriticalError(error: unknown): error is CriticalError {
  return (
    error instanceof CriticalError || (error instanceof Error && error.message.includes('CRITICAL'))
  );
}

// Function to handle critical errors by stopping all operations
export function handleCriticalError(error: unknown): never {
  if (isCriticalError(error)) {
    console.error('🚨 CRITICAL ERROR DETECTED - STOPPING ALL OPERATIONS:', {
      message: error.message,
      code: error instanceof CriticalError ? error.code : 'UNKNOWN',
      details: error instanceof CriticalError ? error.details : undefined,
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Force stop by throwing a critical error
    throw new CriticalError(
      `CRITICAL: System stopped due to error - ${error instanceof Error ? error.message : 'Unknown error'}`,
      'SYSTEM_STOP',
      { originalError: error }
    );
  }

  // If not critical, re-throw as critical to ensure stopping
  throw new CriticalError(
    `CRITICAL: Non-critical error escalated - ${error instanceof Error ? error.message : 'Unknown error'}`,
    'ESCALATED_ERROR',
    { originalError: error }
  );
}

// Utility to wrap functions with critical error handling
export function withCriticalErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R> | R,
  context: string
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`Critical error in ${context}:`, error);
      handleCriticalError(error);
    }
  };
}

// Function to convert any error to a critical error that stops operations
export function escalateToCritical(error: unknown, context: string): never {
  const criticalError = new CriticalError(
    `CRITICAL: ${context} failed - ${error instanceof Error ? error.message : 'Unknown error'}`,
    'ESCALATED',
    { originalError: error, context }
  );

  handleCriticalError(criticalError);
}

// Client-side unified error handler
export function handleClientError(e: unknown, extra?: Record<string, unknown>) {
  const message = getUserFriendlyError(e);
  try {
    // Safe import toast only on client
    if (typeof window !== 'undefined') {
      toast.error(message);
    }
  } catch {}
  try {
    useErrorStore.getState().setError({ message, context: extra });
  } catch {}
}

// Server-side unified error response helper
export function toErrorResponse(e: unknown, fallback = 'Internal server error') {
  const message = getUserFriendlyError(e) || fallback;
  const status = (e as { status?: number })?.status || 500;
  return { status, body: { error: message } } as const;
}
