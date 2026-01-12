import { create } from "zustand";

type PayloadStore = {
  prompt: string;
  model: string;
  webSearch: boolean;

  setPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setWebSearch: (enabled: boolean) => void;

  setAll: (
    values: Partial<
      Omit<PayloadStore, "setPrompt" | "setModel" | "setWebSearch" | "setAll" | "reset">
    >,
  ) => void;
  reset: () => void;
};

const defaultPayload = {
  prompt: "",
  model: "google/gemini-2.5-flash-lite",
  webSearch: false,
};

export const usePayloadStore = create<PayloadStore>((set) => ({
  ...defaultPayload,

  setPrompt: (prompt) => set({ prompt }),
  setModel: (model) => set({ model }),
  setWebSearch: (webSearch) => set({ webSearch }),

  setAll: (values) => set((state) => ({ ...state, ...values })),
  reset: () => set(defaultPayload),
}));
