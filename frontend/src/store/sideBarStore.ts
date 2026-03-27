import { create } from "zustand";
import { persist } from "zustand/middleware";

interface collapsedValueTypes {
  collapsed: boolean;
  setCollapsedValue: (collapsedValue: boolean) => void;
}

export const useCollapsedStore = create<collapsedValueTypes>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsedValue: (value: boolean) => set({ collapsed: value }),
    }),
    {
      name: "collapsed-value",
    },
  ),
);
