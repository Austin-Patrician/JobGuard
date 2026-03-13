import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();

    // Get total count
    const { count: totalReports } = await supabase
      .from("community_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    // Get region aggregates
    const { data: regionData } = await supabase
      .from("community_reports")
      .select("region, tags")
      .eq("status", "approved")
      .not("region", "is", null);

    const regionMap = new Map<string, { count: number; tagCounts: Map<string, number> }>();
    for (const row of regionData ?? []) {
      if (!row.region) continue;
      const entry = regionMap.get(row.region) ?? { count: 0, tagCounts: new Map() };
      entry.count++;
      for (const tag of row.tags ?? []) {
        entry.tagCounts.set(tag, (entry.tagCounts.get(tag) ?? 0) + 1);
      }
      regionMap.set(row.region, entry);
    }

    const regions = Array.from(regionMap.entries()).map(([region, data]) => ({
      region,
      report_count: data.count,
      top_tags: Array.from(data.tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag),
    }));

    // Aggregate tags
    const tagCounts = new Map<string, number>();
    const industryCounts = new Map<string, number>();
    for (const row of regionData ?? []) {
      for (const tag of row.tags ?? []) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    // Get industry data
    const { data: industryData } = await supabase
      .from("community_reports")
      .select("industry")
      .eq("status", "approved")
      .not("industry", "is", null);

    for (const row of industryData ?? []) {
      if (row.industry) {
        industryCounts.set(row.industry, (industryCounts.get(row.industry) ?? 0) + 1);
      }
    }

    const top_tags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([tag, count]) => ({ tag, count }));

    const top_industries = Array.from(industryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([industry, count]) => ({ industry, count }));

    return NextResponse.json({
      total_reports: totalReports ?? 0,
      regions,
      top_tags,
      top_industries,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
