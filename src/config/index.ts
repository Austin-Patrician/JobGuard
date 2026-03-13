export const config = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || "JobGuard",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },
} as const;
