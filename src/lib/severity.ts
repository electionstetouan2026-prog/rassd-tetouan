export type Severity = "high" | "medium" | "neutral" | "pending";

export function severityOf(mention: {
  analyzed_at: string | null;
  threat_score: number | null;
}): Severity {
  if (!mention.analyzed_at || mention.threat_score === null) return "pending";
  if (mention.threat_score >= 66) return "high";
  if (mention.threat_score >= 33) return "medium";
  return "neutral";
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  high: "عالي",
  medium: "متوسط",
  neutral: "محايد",
  pending: "فالانتظار",
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  high: "var(--severity-high)",
  medium: "var(--severity-medium)",
  neutral: "var(--severity-neutral)",
  pending: "var(--severity-pending)",
};

export const PLATFORM_LABEL: Record<string, string> = {
  facebook: "فيسبوك",
  instagram: "انستغرام",
  tiktok: "تيكتوك",
  press: "الصحافة",
  other: "أخرى",
};
