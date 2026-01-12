import { create } from "zustand";

export type AppError = {
  code?: string | number;
  message: string;
  status?: number;
  context?: Record<string, unknown>;
};

type ErrorStore = {
  error: AppError | null;
  setError: (error: AppError | null) => void;
  clear: () => void;
};

export const useErrorStore = create<ErrorStore>((set) => ({
  error: null,
  setError: (error) => set({ error }),
  clear: () => set({ error: null }),
}));

// Unified helper to derive user-facing toast message
export function getUserFriendlyError(e: unknown): string {
  if (!e) return "Unexpected error";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message || "Unexpected error";
  try {
    const obj = e as { message?: string; status?: number };
    if (obj?.message) return obj.message;
  } catch {}
  return "Unexpected error";
}
