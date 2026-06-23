"use client";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width,
  height = "16px",
  borderRadius,
  className = "",
  style,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width ?? "100%",
        height,
        borderRadius: borderRadius ?? "6px",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/** A row of skeleton lines simulating text */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="12px"
          width={i === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}

/** Skeleton card for loading dashboard items */
export function SkeletonCard() {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--border-subtle)",
        borderRadius: "12px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <Skeleton width="40px" height="40px" borderRadius="8px" />
      <Skeleton height="14px" width="60%" />
      <Skeleton height="12px" width="40%" />
    </div>
  );
}
