export interface ReportRow {
  id: string;
  visitor_id: string;
  raw_content: string;
  sanitized_content: string | null;
  summary: string | null;
  tags: string[];
  region: string | null;
  city: string | null;
  industry: string | null;
  scam_type: string | null;
  status: "pending" | "approved" | "rejected" | "flagged";
  reject_reason: string | null;
  upvotes: number;
  view_count: number;
  ip_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoteRow {
  id: string;
  report_id: string;
  visitor_id: string;
  created_at: string;
}
