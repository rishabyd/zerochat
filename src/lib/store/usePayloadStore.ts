import { create } from 'zustand';
import { payloadType } from '../types';

type PayloadStore = payloadType & {
  setPrompt: (prompt: string) => void; // Update current prompt text
  setAll: (values: Partial<payloadType>) => void; // Update multiple values at once
  reset: () => void; // Reset all values to defaults
  setMode: (mode: string) => void;
  setModel: (model: string) => void; // Set AI model
  setChatMode: (chatMode: 'agent' | 'simple') => void; // Set chat mode
};

const defaultPayload: payloadType = {
  prompt: '', // Empty prompt by default
  mode: 'General', // Default chat mode
  model: 'auto', // Default AI model
  chatMode: 'agent', // Default chat mode (agent or simple)
};

export const usePayloadStore = create<PayloadStore>((set) => ({
  ...defaultPayload,

  setPrompt: (prompt) => set({ prompt }), // Set current prompt text
  setMode: (mode) => set({ mode }), // Set chat mode
  setModel: (model) => set({ model }), // Set AI model
  setChatMode: (chatMode) => set({ chatMode }), // Set chat mode (agent or simple)

  setAll: (values) => set((state) => ({ ...state, ...values })), // Update multiple values
  reset: () => set(defaultPayload), // Reset to default values
}));
