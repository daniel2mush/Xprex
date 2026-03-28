export const REPORT_REASONS = [
  "SPAM",
  "ABUSE",
  "HARASSMENT",
  "MISINFORMATION",
  "IMPERSONATION",
  "OTHER",
] as const;

export const REPORT_STATUSES = ["OPEN", "REVIEWED", "DISMISSED"] as const;

export type ReportReasonValue = (typeof REPORT_REASONS)[number];
export type ReportStatusValue = (typeof REPORT_STATUSES)[number];

export const isReportReason = (value: string): value is ReportReasonValue =>
  REPORT_REASONS.includes(value as ReportReasonValue);

export const isReportStatus = (value: string): value is ReportStatusValue =>
  REPORT_STATUSES.includes(value as ReportStatusValue);

export const normalizeReportDetails = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};
