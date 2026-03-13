"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GameState, GameActions, LevelId, Rating } from "@/types/game";
import { GAME_CONFIG } from "@/lib/constants";

const initialLevels: GameState["levels"] = {
  "golden-eye": { unlocked: true, completed: false, score: 0, rating: null, bestScore: 0 },
  debate: { unlocked: false, completed: false, score: 0, rating: null, bestScore: 0 },
  "contract-maze": { unlocked: false, completed: false, score: 0, rating: null, bestScore: 0 },
};

const initialState: GameState = {
  hp: GAME_CONFIG.MAX_HP,
  maxHp: GAME_CONFIG.MAX_HP,
  exp: 0,
  phase: "idle",
  currentLevel: null,
  levels: initialLevels,
};

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      startGame: () => {
        set({
          ...initialState,
          phase: "playing",
        });
      },

      resetGame: () => {
        set(initialState);
      },

      setCurrentLevel: (level: LevelId) => {
        set({ currentLevel: level, phase: "playing" });
      },

      completeLevel: (level: LevelId, score: number) => {
        const state = get();
        const rating = state.getRating(score);
        const levelOrder: LevelId[] = ["golden-eye", "debate", "contract-maze"];
        const currentIndex = levelOrder.indexOf(level);
        const nextLevel = levelOrder[currentIndex + 1];

        set((s) => ({
          levels: {
            ...s.levels,
            [level]: {
              ...s.levels[level],
              completed: true,
              score,
              rating,
              bestScore: Math.max(s.levels[level].bestScore, score),
            },
            ...(nextLevel
              ? { [nextLevel]: { ...s.levels[nextLevel], unlocked: true } }
              : {}),
          },
          currentLevel: null,
          phase: nextLevel ? "playing" : "victory",
        }));
      },

      adjustHp: (delta: number) => {
        set((s) => {
          const newHp = Math.max(0, Math.min(s.maxHp, s.hp + delta));
          return {
            hp: newHp,
            phase: newHp <= 0 ? "game-over" : s.phase,
          };
        });
      },

      adjustExp: (delta: number) => {
        set((s) => ({ exp: Math.max(0, s.exp + delta) }));
      },

      setPhase: (phase) => {
        set({ phase });
      },

      getRating: (score: number): Rating => {
        if (score >= GAME_CONFIG.RATING_THRESHOLDS.S) return "S";
        if (score >= GAME_CONFIG.RATING_THRESHOLDS.A) return "A";
        if (score >= GAME_CONFIG.RATING_THRESHOLDS.B) return "B";
        if (score >= GAME_CONFIG.RATING_THRESHOLDS.C) return "C";
        return "D";
      },
    }),
    {
      name: "jobguard-game",
      partialize: (state) => ({
        hp: state.hp,
        maxHp: state.maxHp,
        exp: state.exp,
        phase: state.phase,
        currentLevel: state.currentLevel,
        levels: state.levels,
      }),
    }
  )
);
