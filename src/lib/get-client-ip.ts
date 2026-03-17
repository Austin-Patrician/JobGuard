import type { NextRequest } from "next/server";

/**
 * Extract client IP from request, taking the first IP from x-forwarded-for
 * (assumes Nginx reverse proxy sets this header).
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}
