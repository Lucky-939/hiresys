"use client";

interface KPICardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  subtitle?: string;
  iconBg?: string;
}

export function KPICard({ label, value, icon, trend, subtitle, iconBg }: KPICardProps) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-xl)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        transition: "all var(--ease-base)",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--text-secondary)",
          }}
        >
          {label}
        </span>
        {icon && (
          <div
            style={{
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-lg)",
              background: iconBg || "var(--accent-light)",
              color: "var(--accent)",
              fontSize: "16px",
            }}
          >
            {icon}
          </div>
        )}
      </div>
      <div>
        <span
          style={{
            fontSize: "32px",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
      </div>
      {(trend || subtitle) && (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {trend && (
            <span
              style={{
                fontSize: "12px",
                color: "var(--success-text)",
                fontWeight: 500,
              }}
            >
              {trend}
            </span>
          )}
          {subtitle && (
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-tertiary)",
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
