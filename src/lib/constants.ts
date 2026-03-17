export const APP_NAME = "JobGuard";

export const GAME_CONFIG = {
  MAX_HP: 100,
  RATING_THRESHOLDS: {
    S: 90,
    A: 80,
    B: 70,
    C: 60,
  },
  LEVEL1: {
    TIMER_SECONDS: 90,
    SCORE: {
      CORRECT: 12,
      WRONG: -6,
      MISSED: -8,
    },
    EXP_PER_CORRECT: 6,
    HP_PENALTY_WRONG: -10,
    OBJECTION_THRESHOLD: 4,
  },
  LEVEL2: {
    TYPEWRITER_SPEED: 35,
    HR_REPLY_DELAY: 800,
    HR_AUTO_ADVANCE_DELAY: 1200,
    OBJECTION_THRESHOLD: 3,
    SCORE: {
      CORRECT: 20,
      PARTIAL: 5,
      WRONG: -5,
    },
    FREE_INPUT: {
      HP_DELTA: -10,
      EXP_DELTA: 5,
    },
  },
  LEVEL3: {
    SCORE: {
      CRITICAL_FOUND: 7,
      WARNING_FOUND: 4,
      MAGNIFIER_FOUND: 3,
      FALSE_POSITIVE: -3,
    },
    HP_PENALTY_WRONG: -8,
    EXP_PER_CRITICAL: 8,
    EXP_PER_WARNING: 5,
    MAGNIFIER_USES: 3,
    OBJECTION_THRESHOLD: 4,
    SCAN_DURATION_MS: 2500,
  },
} as const;

export const API_ROUTES = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
  },
  TOOLKIT: {
    MIRROR: "/api/toolkit/mirror",
    CONTRACT: "/api/toolkit/contract",
  },
  COMMUNITY: {
    REPORTS: "/api/community/reports",
    REPORT_DETAIL: (id: string) => `/api/community/reports/${id}`,
    VOTE: (id: string) => `/api/community/reports/${id}/vote`,
    STATS: "/api/community/stats",
  },
  USERS: "/users",
  HEALTH: "/health",
} as const;

export const RATE_LIMIT_CONFIG = {
  GLOBAL: { limit: 60, windowMs: 60 * 1000 },
  AI: { limit: 5, windowMs: 60 * 1000 },
  AUTH: { limit: 3, windowMs: 15 * 60 * 1000 },
  VIEW_COUNT: { limit: 1, windowMs: 60 * 60 * 1000 },
} as const;

export const BODY_SIZE_LIMITS = {
  LAW_CHAT: 10 * 1024,          // 10KB
  MIRROR: 3 * 1024 * 1024,      // 3MB
  CONTRACT: 15 * 1024 * 1024,   // 15MB
  COMMUNITY_REPORT: 10 * 1024,  // 10KB
  COMMUNITY_VOTE: 1024,         // 1KB
} as const;

export const AI_INPUT_LIMITS = {
  LAW_CHAT_QUESTION: 2000,
  CONTRACT_TEXT: 50_000,
  IMAGE_SINGLE_BASE64: 2 * 1024 * 1024,  // 2MB base64 encoded
  IMAGE_TOTAL_BASE64: 10 * 1024 * 1024,  // 10MB total
} as const;

export const AI_ENDPOINTS = [
  "/api/law-chat",
  "/api/toolkit/mirror",
  "/api/toolkit/contract",
] as const;

export const COMMUNITY_CONFIG = {
  CONTENT_MIN_LENGTH: 50,
  CONTENT_MAX_LENGTH: 5000,
  DEFAULT_PAGE_SIZE: 10,
  RATE_LIMITS: {
    IP_SUBMIT: { limit: 5, windowMs: 10 * 60 * 1000 },
    VISITOR_SUBMIT: { limit: 3, windowMs: 30 * 60 * 1000 },
    VOTE: { limit: 20, windowMs: 10 * 60 * 1000 },
  },
} as const;
