import { create } from "zustand";
import { payloadType } from "../types";

type PayloadStore = payloadType & {
  setPrompt: (prompt: string) => void; // Update current prompt text
  setAll: (values: Partial<payloadType>) => void; // Update multiple values at once
  reset: () => void; // Reset all values to defaults
  setMode: (mode: string) => void;
};

const defaultPayload: payloadType = {
  prompt: "", // Empty prompt by default
  mode: "General", // Default chat mode
};

export const usePayloadStore = create<PayloadStore>((set) => ({
  ...defaultPayload,

  setPrompt: (prompt) => set({ prompt }), // Set current prompt text
  setMode: (mode) => set({ mode }), // Set chat mode

  setAll: (values) => set((state) => ({ ...state, ...values })), // Update multiple values
  reset: () => set(defaultPayload), // Reset to default values
}));
