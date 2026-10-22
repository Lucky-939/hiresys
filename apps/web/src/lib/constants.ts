export const STAGES = ["APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "HIRED", "REJECTED"];

export const STAGE_MAP: Record<string, { label: string; variant: "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "outline" | "destructive" | "live" | "error" }> = {
  APPLIED:      { label: "Applied",    variant: "outline"     },
  SCREENING:    { label: "Screening",  variant: "neutral"     },
  INTERVIEWING: { label: "Interview",  variant: "accent"      },
  OFFER:        { label: "Offer",      variant: "success"     },
  HIRED:        { label: "Hired",      variant: "success"     },
  REJECTED:     { label: "Rejected",   variant: "danger"      },
};

// Map variants to specific border colors so there's one source of truth
export const STAGE_BORDER_COLORS: Record<string, string> = {
  APPLIED: "border-t-[var(--text-disabled)]",
  SCREENING: "border-t-[var(--text-disabled)]", // neutral
  INTERVIEWING: "border-t-[var(--accent)]",
  OFFER: "border-t-[var(--success-text)]", // success
  HIRED: "border-t-[var(--success)]",
  REJECTED: "border-t-[var(--danger)]"
};
