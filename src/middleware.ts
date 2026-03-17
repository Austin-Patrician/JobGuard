import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMIT_CONFIG, AI_ENDPOINTS } from "@/lib/constants";
import { getClientIp } from "@/lib/get-client-ip";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);

  // AI endpoint rate limit (stricter)
  const isAiEndpoint = AI_ENDPOINTS.some((ep) => pathname.startsWith(ep));
  if (isAiEndpoint) {
    const { limit, windowMs } = RATE_LIMIT_CONFIG.AI;
    if (!checkRateLimit(`ai:${ip}`, limit, windowMs)) {
      return NextResponse.json(
        { error: "AI 接口请求过于频繁，请稍后再试", code: "RATE_LIMIT" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) },
        }
      );
    }
  }

  // Global rate limit
  const { limit, windowMs } = RATE_LIMIT_CONFIG.GLOBAL;
  if (!checkRateLimit(`global:${ip}`, limit, windowMs)) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试", code: "RATE_LIMIT" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
