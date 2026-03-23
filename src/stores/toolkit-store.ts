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
      currentResumeResult: null,
      isAnalyzing: false,

      setMirrorResult: (result) => set({ currentMirrorResult: result }),
      setContractResult: (result) => set({ currentContractResult: result }),
      setResumeResult: (result) => set({ currentResumeResult: result }),
      setIsAnalyzing: (value) => set({ isAnalyzing: value }),

      addHistory: (record) =>
        set((state) => ({
          history: [record, ...state.history].slice(0, MAX_HISTORY),
        })),

      removeHistory: (id) =>
        set((state) => ({
          history: state.history.filter((record) => record.id !== id),
        })),

      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "jobguard-toolkit",
      partialize: (state) => ({
        history: state.history,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.history = state.history.filter((record: any) => !!record?.result);
      },
    }
  )
);
