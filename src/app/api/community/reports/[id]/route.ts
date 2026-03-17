import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getClientIp } from "@/lib/get-client-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMIT_CONFIG } from "@/lib/constants";

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((tag) => typeof tag === "string") as string[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((tag) => typeof tag === "string") as string[];
      }
    } catch {
      // fall through
    }
  }
  return [];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const selectSql = `
      SELECT id, sanitized_content, summary, tags, region, city, industry, scam_type, upvotes, view_count, created_at
      FROM community_reports
      WHERE id = $1 AND status = 'approved'
      LIMIT 1
    `;
    const { rows } = await dbQuery(selectSql, [id]);
    const data = rows[0];

    if (!data) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Increment view count (rate-limited: 1 per IP per report per hour)
    const ip = getClientIp(_request);
    const { limit: vcLimit, windowMs: vcWindow } = RATE_LIMIT_CONFIG.VIEW_COUNT;
    if (checkRateLimit(`view:${id}:${ip}`, vcLimit, vcWindow)) {
      await dbQuery(
        "UPDATE community_reports SET view_count = view_count + 1 WHERE id = $1",
        [id]
      );
    }

    return NextResponse.json({
      ...data,
      tags: normalizeTags((data as { tags?: unknown }).tags),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}
