import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { COMMUNITY_CONFIG, BODY_SIZE_LIMITS } from "@/lib/constants";
import { parseJsonBody } from "@/lib/request-guard";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params;
    const parsed = await parseJsonBody<{ visitor_id?: string }>(request, BODY_SIZE_LIMITS.COMMUNITY_VOTE);
    if (!parsed.ok) return parsed.response;
    const { visitor_id } = parsed.data;

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

    const pool = getDbPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const reportRes = await client.query<{ id: string; upvotes: number }>(
        "SELECT id, upvotes FROM community_reports WHERE id = $1 AND status = 'approved' FOR UPDATE",
        [reportId]
      );
      const report = reportRes.rows[0];
      if (!report) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      try {
        await client.query(
          "INSERT INTO community_votes (report_id, visitor_id) VALUES ($1, $2)",
          [reportId, visitor_id]
        );
      } catch (err) {
        if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "23505") {
          await client.query("ROLLBACK");
          return NextResponse.json(
            { success: false, error: "ALREADY_VOTED", upvotes: report.upvotes },
            { status: 409 }
          );
        }
        throw err;
      }

      const updatedRes = await client.query<{ upvotes: number }>(
        "UPDATE community_reports SET upvotes = upvotes + 1 WHERE id = $1 RETURNING upvotes",
        [reportId]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        upvotes: updatedRes.rows[0]?.upvotes ?? report.upvotes + 1,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch {
    return NextResponse.json(
      { error: "投票失败，请稍后再试" },
      { status: 500 }
    );
  }
}
