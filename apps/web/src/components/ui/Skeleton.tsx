import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * HireSys Skeleton v2.0
 * Shimmer animation. Skeletons mirror final layout exactly.
 */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "card" | "full";
}

const radiusMap = {
  sm:   "var(--radius-sm)",
  md:   "var(--radius-md)",
  card: "var(--radius-card)",
  full: "var(--radius-full)",
};

export function Skeleton({ className, width, height, rounded = "md", style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton", className)}
      style={{
        width: width ?? "100%",
        height: height ?? "100%",
        borderRadius: radiusMap[rounded],
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

/* ——— Pre-built layout skeletons ——— */

export function KPICardSkeleton() {
  return (
    <div className="h-[148px] rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 flex flex-col justify-between">
      <div className="flex items-center gap-2">
        <Skeleton width={18} height={18} rounded="sm" />
        <Skeleton width={72} height={11} />
      </div>
      <Skeleton width={56} height={30} />
      <Skeleton width={80} height={10} />
    </div>
  );
}

export function CandidateCardSkeleton() {
  return (
    <div className="h-[76px] rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 flex items-center gap-3">
      <Skeleton width={36} height={36} rounded="full" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton width="55%" height={12} />
        <Skeleton width="38%" height={10} />
      </div>
      <Skeleton width={56} height={20} rounded="full" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <Skeleton height={13} width={i === 0 ? "75%" : "55%"} />
        </td>
      ))}
    </tr>
  );
}

export function InterviewCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 flex items-center gap-4">
      <Skeleton width={36} height={36} rounded="full" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton width="50%" height={13} />
        <Skeleton width="32%" height={11} />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton width={52} height={20} rounded="full" />
        <Skeleton width={68} height={34} rounded="md" />
      </div>
    </div>
  );
}
