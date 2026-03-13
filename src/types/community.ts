export type ReportStatus = "pending" | "approved" | "rejected" | "flagged";

export interface CommunityReport {
  id: string;
  sanitized_content: string;
  summary: string;
  tags: string[];
  region: string | null;
  city: string | null;
  industry: string | null;
  scam_type: string | null;
  upvotes: number;
  view_count: number;
  created_at: string;
}

export interface ReportDetail extends CommunityReport {
  status: ReportStatus;
}

export interface SubmitReportRequest {
  content: string;
  visitor_id: string;
}

export interface SubmitReportResponse {
  id: string;
  status: ReportStatus;
  sanitized_content?: string;
  summary?: string;
  tags?: string[];
  reject_reason?: string;
}

export interface VoteResponse {
  success: boolean;
  upvotes: number;
  error?: string;
}

export interface RegionStat {
  region: string;
  report_count: number;
  top_tags: string[];
}

export interface CommunityStats {
  total_reports: number;
  regions: RegionStat[];
  top_tags: { tag: string; count: number }[];
  top_industries: { industry: string; count: number }[];
}

export interface ModerationResult {
  sanitized_content: string;
  summary: string;
  tags: string[];
  region: string | null;
  city: string | null;
  industry: string | null;
  scam_type: string | null;
  approved: boolean;
  reject_reason: string | null;
}

export const SCAM_TAGS = [
  "贷款陷阱",
  "培训坑",
  "传销变种",
  "黑中介",
  "试用期陷阱",
  "合同欺诈",
  "工资拖欠",
  "虚假招聘",
  "押金骗局",
  "加班剥削",
  "社保违规",
  "劳务派遣陷阱",
] as const;

export type ScamTag = (typeof SCAM_TAGS)[number];
