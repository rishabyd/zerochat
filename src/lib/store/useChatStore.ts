import { create } from "zustand";
import { ChatType } from "../types";

type ChatStore = {
  error: string; // Store error messages for display in UI
  thinking: boolean; // Track if AI is currently processing/thinking
  stopResponse: boolean; // Control whether stop response button is enabled
  currentSessionId: string | null; // Store current active chat session ID
  setError: (error: string) => void; // Update error state
  setThinking: (thinking: boolean) => void; // Update thinking state
  setStopResponse: (stopResponse: boolean) => void; // Update stop response state
  setCurrentSessionId: (sessionId: string | null) => void; // Update current session ID
  reset: () => void; // Reset all state to default values
};

const defaultPayload: ChatType = {
  error: "",
  thinking: false,
  stopResponse: false,
};

export const useChatStore = create<ChatStore>((set) => ({
  ...defaultPayload,
  currentSessionId: null,

  setError: (error: string) => set({ error }), // Set error message
  setThinking: (thinking: boolean) => set({ thinking }), // Set thinking state
  setStopResponse: (stopResponse: boolean) => set({ stopResponse }), // Set stop response state
  setCurrentSessionId: (sessionId: string | null) =>
    set({ currentSessionId: sessionId }), // Set current session ID
  reset: () => set({ ...defaultPayload, currentSessionId: null }), // Reset all state
}));
