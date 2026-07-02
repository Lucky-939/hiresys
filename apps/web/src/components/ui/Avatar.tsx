import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * HireSys Avatar v2.0
 * Circle only. Sizes: 24/32/40/48/64px.
 * Color: accent background / white initials.
 * Never random colors.
 */

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: "xs" | "sm" | "md" | "lg" | "hero";
  className?: string;
  alt?: string;
}

const sizeMap = {
  xs:   { outer: "h-6 w-6",   text: "text-[9px]  font-semibold" },
  sm:   { outer: "h-8 w-8",   text: "text-[11px] font-semibold" },
  md:   { outer: "h-10 w-10", text: "text-[13px] font-semibold" },
  lg:   { outer: "h-12 w-12", text: "text-[15px] font-semibold" },
  hero: { outer: "h-16 w-16", text: "text-[20px] font-bold"     },
};

export function Avatar({ name, src, size = "md", className, alt }: AvatarProps) {
  const { outer, text } = sizeMap[size];
  const initials = name
    ? name.trim().split(/\s+/).map(n => n[0]).join("").substring(0, 2).toUpperCase()
    : "?";

  return (
    <div
      className={cn(
        "rounded-full shrink-0 overflow-hidden flex items-center justify-center select-none",
        "bg-[var(--accent)] text-white",
        outer,
        text,
        className
      )}
    >
      {src ? (
        <img src={src} alt={alt || name || "avatar"} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

/* ——— Avatar Group ——— */
export function AvatarGroup({ names, max = 3 }: { names: string[]; max?: number }) {
  const visible = names.slice(0, max);
  const overflow = names.length - max;
  return (
    <div className="flex -space-x-2">
      {visible.map((name, i) => (
        <Avatar
          key={i}
          name={name}
          size="sm"
          className="border-2 border-[var(--bg-surface)] ring-0"
          style={{ zIndex: visible.length - i } as React.CSSProperties}
        />
      ))}
      {overflow > 0 && (
        <div
          className="h-8 w-8 rounded-full border-2 border-[var(--bg-surface)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-[10px] font-semibold flex items-center justify-center"
          style={{ zIndex: 0 } as React.CSSProperties}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
