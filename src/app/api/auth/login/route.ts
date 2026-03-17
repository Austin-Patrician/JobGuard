import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/get-client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMIT_CONFIG } from "@/lib/constants";

// POST /api/auth/login
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { limit, windowMs } = RATE_LIMIT_CONFIG.AUTH;
  if (!checkRateLimit(`auth:${ip}`, limit, windowMs)) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试", code: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } }
    );
  }

  return NextResponse.json(
    { error: "认证功能尚未上线", code: "NOT_IMPLEMENTED" },
    { status: 501 }
  );
}
