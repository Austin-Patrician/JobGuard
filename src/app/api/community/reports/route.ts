import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createHash } from "crypto";
import { openai, AI_MODEL } from "@/lib/ai";
import { COMMUNITY_MODERATION_PROMPT } from "@/lib/prompts";
import { COMMUNITY_CONFIG, BODY_SIZE_LIMITS } from "@/lib/constants";
import { dbQuery } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";
import { parseJsonBody } from "@/lib/request-guard";
import type { ModerationResult } from "@/types/community";

function hashIP(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "jobguard-default-salt";
  return createHash("sha256").update(`${ip}${salt}`).digest("hex");
}

function tryParseModerationJSON(text: string): ModerationResult | null {
  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned) as ModerationResult;
  } catch {
    return null;
  }
}

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || String(COMMUNITY_CONFIG.DEFAULT_PAGE_SIZE))));
    const region = searchParams.get("region");
    const tag = searchParams.get("tag");
    const sort = searchParams.get("sort") === "popular" ? "popular" : "newest";

    const whereClauses = ["status = 'approved'"];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (region) {
      whereClauses.push(`region = $${paramIndex}`);
      params.push(region);
      paramIndex++;
    }
    if (tag) {
      whereClauses.push(`tags IS NOT NULL AND to_jsonb(tags) ? $${paramIndex}`);
      params.push(tag);
      paramIndex++;
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countSql = `SELECT COUNT(*)::int AS count FROM community_reports ${whereSql}`;
    const { rows: countRows } = await dbQuery<{ count: number }>(countSql, params);

    const orderBy = sort === "popular"
      ? "ORDER BY upvotes DESC, created_at DESC"
      : "ORDER BY created_at DESC";

    const listSql = `
      SELECT id, sanitized_content, summary, tags, region, city, industry, scam_type, upvotes, view_count, created_at
      FROM community_reports
      ${whereSql}
      ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const listParams = [...params, pageSize, (page - 1) * pageSize];
    const { rows } = await dbQuery(listSql, listParams);

    const items = rows.map((row: Record<string, unknown>) => ({
      ...row,
      tags: normalizeTags((row as { tags?: unknown }).tags),
    }));

    return NextResponse.json({
      items,
      total: countRows[0]?.count ?? 0,
      page,
      pageSize,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const ipHash = hashIP(ip);

    const { limit: ipLimit, windowMs: ipWindow } = COMMUNITY_CONFIG.RATE_LIMITS.IP_SUBMIT;
    if (!checkRateLimit(`ip:${ipHash}`, ipLimit, ipWindow)) {
      return NextResponse.json(
        { error: "提交过于频繁，请稍后再试", code: "RATE_LIMIT" },
        { status: 429 }
      );
    }

    const parsed = await parseJsonBody<{ content?: string; visitor_id?: string }>(request, BODY_SIZE_LIMITS.COMMUNITY_REPORT);
    if (!parsed.ok) return parsed.response;
    const { content, visitor_id } = parsed.data;

    if (!visitor_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitor_id)) {
      return NextResponse.json(
        { error: "无效的访客标识", code: "INVALID_VISITOR" },
        { status: 400 }
      );
    }

    const { limit: vidLimit, windowMs: vidWindow } = COMMUNITY_CONFIG.RATE_LIMITS.VISITOR_SUBMIT;
    if (!checkRateLimit(`vid:${visitor_id}`, vidLimit, vidWindow)) {
      return NextResponse.json(
        { error: "提交过于频繁，请稍后再试", code: "RATE_LIMIT" },
        { status: 429 }
      );
    }

    if (!content || content.length < COMMUNITY_CONFIG.CONTENT_MIN_LENGTH) {
      return NextResponse.json(
        { error: `内容至少需要${COMMUNITY_CONFIG.CONTENT_MIN_LENGTH}个字符`, code: "CONTENT_TOO_SHORT" },
        { status: 400 }
      );
    }
    if (content.length > COMMUNITY_CONFIG.CONTENT_MAX_LENGTH) {
      return NextResponse.json(
        { error: `内容不能超过${COMMUNITY_CONFIG.CONTENT_MAX_LENGTH}个字符`, code: "CONTENT_TOO_LONG" },
        { status: 400 }
      );
    }

    const insertSql = `
      INSERT INTO community_reports (visitor_id, raw_content, status, ip_hash)
      VALUES ($1, $2, 'pending', $3)
      RETURNING id
    `;
    const { rows: insertRows } = await dbQuery<{ id: string }>(insertSql, [visitor_id, content, ipHash]);
    const reportId = insertRows[0]?.id;
    if (!reportId) {
      throw new Error("Failed to insert report");
    }

    // AI moderation
    let moderationResult: ModerationResult | null = null;
    try {
      const { text: aiText } = await generateText({
        model: openai(AI_MODEL),
        system: COMMUNITY_MODERATION_PROMPT,
        messages: [{ role: "user", content }],
        maxOutputTokens: 2000,
        temperature: 0.3,
      });
      moderationResult = tryParseModerationJSON(aiText);
    } catch {
      // AI failed — flag for manual review
    }

    if (moderationResult) {
      const newStatus = moderationResult.approved ? "approved" : "rejected";
      const updateSql = `
        UPDATE community_reports
        SET sanitized_content = $1,
            summary = $2,
            tags = $3,
            region = $4,
            city = $5,
            industry = $6,
            scam_type = $7,
            status = $8,
            reject_reason = $9
        WHERE id = $10
      `;
      await dbQuery(updateSql, [
        moderationResult.sanitized_content,
        moderationResult.summary,
        moderationResult.tags ?? [],
        moderationResult.region,
        moderationResult.city,
        moderationResult.industry,
        moderationResult.scam_type,
        newStatus,
        moderationResult.reject_reason,
        reportId,
      ]);

      return NextResponse.json({
        id: reportId,
        status: newStatus,
        sanitized_content: moderationResult.approved ? moderationResult.sanitized_content : undefined,
        summary: moderationResult.approved ? moderationResult.summary : undefined,
        tags: moderationResult.approved ? moderationResult.tags : undefined,
        reject_reason: moderationResult.reject_reason,
      });
    }

    // AI response unparseable → flag
    await dbQuery(
      `UPDATE community_reports SET status = 'flagged' WHERE id = $1`,
      [reportId]
    );

    return NextResponse.json({
      id: reportId,
      status: "flagged" as const,
    });
  } catch {
    return NextResponse.json(
      { error: "提交失败，请稍后再试", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
