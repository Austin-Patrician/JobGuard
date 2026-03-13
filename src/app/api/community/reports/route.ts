import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createHash } from "crypto";
import { openai, AI_MODEL } from "@/lib/ai";
import { COMMUNITY_MODERATION_PROMPT } from "@/lib/prompts";
import { COMMUNITY_CONFIG } from "@/lib/constants";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getVisitorIdFromRequest } from "@/lib/visitor";
import { checkRateLimit } from "@/lib/rate-limit";
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || String(COMMUNITY_CONFIG.DEFAULT_PAGE_SIZE))));
    const region = searchParams.get("region");
    const tag = searchParams.get("tag");
    const sort = searchParams.get("sort") === "popular" ? "popular" : "newest";

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("community_reports")
      .select("id, sanitized_content, summary, tags, region, city, industry, scam_type, upvotes, view_count, created_at", { count: "exact" })
      .eq("status", "approved");

    if (region) query = query.eq("region", region);
    if (tag) query = query.contains("tags", [tag]);

    if (sort === "popular") {
      query = query.order("upvotes", { ascending: false }).order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      items: data ?? [],
      total: count ?? 0,
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
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = hashIP(ip);

    const { limit: ipLimit, windowMs: ipWindow } = COMMUNITY_CONFIG.RATE_LIMITS.IP_SUBMIT;
    if (!checkRateLimit(`ip:${ipHash}`, ipLimit, ipWindow)) {
      return NextResponse.json(
        { error: "提交过于频繁，请稍后再试", code: "RATE_LIMIT" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { content, visitor_id } = body as { content?: string; visitor_id?: string };

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

    const supabase = getSupabaseServerClient();
    const { data: inserted, error: insertError } = await supabase
      .from("community_reports")
      .insert({
        visitor_id,
        raw_content: content,
        status: "pending",
        ip_hash: ipHash,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;
    const reportId = inserted.id;

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

    const serviceClient = getSupabaseServiceClient();

    if (moderationResult) {
      const newStatus = moderationResult.approved ? "approved" : "rejected";
      await serviceClient
        .from("community_reports")
        .update({
          sanitized_content: moderationResult.sanitized_content,
          summary: moderationResult.summary,
          tags: moderationResult.tags,
          region: moderationResult.region,
          city: moderationResult.city,
          industry: moderationResult.industry,
          scam_type: moderationResult.scam_type,
          status: newStatus,
          reject_reason: moderationResult.reject_reason,
        })
        .eq("id", reportId);

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
    await serviceClient
      .from("community_reports")
      .update({ status: "flagged" })
      .eq("id", reportId);

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
