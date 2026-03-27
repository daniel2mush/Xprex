import { User } from "@/types/Types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void; // Added for convenience
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      // Simplified: no need for (state) => since we aren't using 'state'
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: "user-storage", // Standard kebab-case naming
    },
  ),
);
