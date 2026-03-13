"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ToolkitState, ToolkitActions } from "@/types/toolkit";

const MAX_HISTORY = 20;

export const useToolkitStore = create<ToolkitState & ToolkitActions>()(
  persist(
    (set) => ({
      history: [],
      currentMirrorResult: null,
      currentContractResult: null,
      isAnalyzing: false,

      setMirrorResult: (result) => set({ currentMirrorResult: result }),
      setContractResult: (result) => set({ currentContractResult: result }),
      setIsAnalyzing: (value) => set({ isAnalyzing: value }),

      addHistory: (record) =>
        set((state) => ({
          history: [record, ...state.history].slice(0, MAX_HISTORY),
        })),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "jobguard-toolkit",
      partialize: (state) => ({
        history: state.history,
      }),
    }
  )
);
