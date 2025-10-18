import type { UnifiedProfile } from "@/lib/types";
import { create } from "zustand";

interface UserProfileStore {
  profile: UnifiedProfile | null;
  isLoading: boolean;
  error: string | null;
  setProfile: (profile: UnifiedProfile) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchProfile: () => Promise<void>;
  clearProfile: () => void;
}

export const useUserProfileStore = create<UserProfileStore>((set, _get) => ({
  profile: null,
  isLoading: false,
  error: null,

  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  fetchProfile: async () => {
    try {
      set({ isLoading: true, error: null });

      const response = await fetch("/api/user/profile");
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      set({ profile: data as UnifiedProfile, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Failed to fetch profile",
        isLoading: false,
      });
    }
  },

  clearProfile: () => set({ profile: null, error: null }),
}));
