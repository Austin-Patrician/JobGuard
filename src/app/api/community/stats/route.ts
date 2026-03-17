import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

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

export async function GET() {
  try {
    // Get total count
    const { rows: totalRows } = await dbQuery<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM community_reports WHERE status = 'approved'"
    );
    const totalReports = totalRows[0]?.count ?? 0;

    // Get region aggregates
    const { rows: regionData } = await dbQuery<{ region: string | null; tags: unknown }>(
      "SELECT region, tags FROM community_reports WHERE status = 'approved' AND region IS NOT NULL"
    );

    const regionMap = new Map<string, { count: number; tagCounts: Map<string, number> }>();
    for (const row of regionData ?? []) {
      if (!row.region) continue;
      const entry = regionMap.get(row.region) ?? { count: 0, tagCounts: new Map() };
      entry.count++;
      for (const tag of normalizeTags(row.tags)) {
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
      for (const tag of normalizeTags(row.tags)) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    // Get industry data
    const { rows: industryData } = await dbQuery<{ industry: string | null }>(
      "SELECT industry FROM community_reports WHERE status = 'approved' AND industry IS NOT NULL"
    );

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
      total_reports: totalReports,
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
