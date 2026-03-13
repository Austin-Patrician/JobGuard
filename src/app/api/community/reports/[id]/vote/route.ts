import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { COMMUNITY_CONFIG } from "@/lib/constants";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params;
    const body = await request.json();
    const { visitor_id } = body as { visitor_id?: string };

    if (!visitor_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(visitor_id)) {
      return NextResponse.json(
        { error: "无效的访客标识", code: "INVALID_VISITOR" },
        { status: 400 }
      );
    }

    const { limit, windowMs } = COMMUNITY_CONFIG.RATE_LIMITS.VOTE;
    if (!checkRateLimit(`vote:${visitor_id}`, limit, windowMs)) {
      return NextResponse.json(
        { error: "操作过于频繁，请稍后再试", code: "RATE_LIMIT" },
        { status: 429 }
      );
    }

    // Verify report exists and is approved
    const supabase = getSupabaseServerClient();
    const { data: report } = await supabase
      .from("community_reports")
      .select("id, upvotes")
      .eq("id", reportId)
      .eq("status", "approved")
      .single();

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Insert vote (UNIQUE constraint prevents duplicates)
    const { error: voteError } = await supabase
      .from("community_votes")
      .insert({ report_id: reportId, visitor_id });

    if (voteError) {
      if (voteError.code === "23505") {
        return NextResponse.json(
          { success: false, error: "ALREADY_VOTED", upvotes: report.upvotes },
          { status: 409 }
        );
      }
      throw voteError;
    }

    // Increment upvotes via service client
    const serviceClient = getSupabaseServiceClient();
    const { data: updated } = await serviceClient
      .from("community_reports")
      .update({ upvotes: report.upvotes + 1 })
      .eq("id", reportId)
      .select("upvotes")
      .single();

    return NextResponse.json({
      success: true,
      upvotes: updated?.upvotes ?? report.upvotes + 1,
    });
  } catch {
    return NextResponse.json(
      { error: "投票失败，请稍后再试" },
      { status: 500 }
    );
  }
}
