"use client";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        textAlign: "center",
        borderRadius: "var(--radius-xl)",
        border: "1px dashed var(--border-default)",
        background: "#FFFFFF",
      }}
    >
      {icon && (
        <div
          style={{
            width: "48px",
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "var(--radius-lg)",
            background: "var(--bg-elevated)",
            color: "var(--text-tertiary)",
            marginBottom: "16px",
            fontSize: "20px",
          }}
        >
          {icon}
        </div>
      )}
      <p
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: "4px",
        }}
      >
        {title}
      </p>
      {description && (
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-tertiary)",
            marginBottom: action ? "20px" : "0",
            maxWidth: "320px",
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
