"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CommunityState {
  selectedRegion: string | null;
  selectedTag: string | null;
  sortBy: "newest" | "popular";
  votedReportIds: string[];
}

interface CommunityActions {
  setSelectedRegion: (region: string | null) => void;
  setSelectedTag: (tag: string | null) => void;
  setSortBy: (sort: "newest" | "popular") => void;
  addVotedReport: (id: string) => void;
  hasVoted: (id: string) => boolean;
}

export const useCommunityStore = create<CommunityState & CommunityActions>()(
  persist(
    (set, get) => ({
      selectedRegion: null,
      selectedTag: null,
      sortBy: "newest",
      votedReportIds: [],

      setSelectedRegion: (region) => set({ selectedRegion: region }),
      setSelectedTag: (tag) => set({ selectedTag: tag }),
      setSortBy: (sort) => set({ sortBy: sort }),
      addVotedReport: (id) =>
        set((state) => ({
          votedReportIds: [...state.votedReportIds, id],
        })),
      hasVoted: (id) => get().votedReportIds.includes(id),
    }),
    {
      name: "jobguard-community",
      partialize: (state) => ({
        votedReportIds: state.votedReportIds,
      }),
    }
  )
);
