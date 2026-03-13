import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("community_reports")
      .select("id, sanitized_content, summary, tags, region, city, industry, scam_type, upvotes, view_count, created_at")
      .eq("id", id)
      .eq("status", "approved")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Increment view count via service client (bypasses RLS)
    const serviceClient = getSupabaseServiceClient();
    await serviceClient
      .from("community_reports")
      .update({ view_count: data.view_count + 1 })
      .eq("id", id);

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}
