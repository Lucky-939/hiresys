import { StageType } from "@prisma/client";

export const DEFAULT_PIPELINE_STAGES: Array<{
  name: string;
  order: number;
  color: string;
  type: StageType;
}> = [
  { name: "Applied", order: 0, color: "#3B82F6", type: "STANDARD" },
  { name: "Screening", order: 1, color: "#8B5CF6", type: "STANDARD" },
  { name: "Technical Interview", order: 2, color: "#F59E0B", type: "STANDARD" },
  { name: "Offer", order: 3, color: "#10B981", type: "STANDARD" },
  { name: "Hired", order: 4, color: "#059669", type: "POSITIVE_TERMINAL" },
  { name: "Rejected", order: 5, color: "#EF4444", type: "NEGATIVE_TERMINAL" },
];
