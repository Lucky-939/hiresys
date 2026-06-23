import React from "react";
import { cn } from "@/lib/utils";
import { Icons } from "./Icons";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  withText?: boolean;
}

export function Logo({ className, size = "md", withText = true }: LogoProps) {
  const iconSize = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }[size];

  const textSize = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  }[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "rounded-lg bg-[var(--accent)] flex items-center justify-center text-white shadow-sm",
          iconSize,
          size === "sm" ? "[&>svg]:w-3 [&>svg]:h-3" : size === "md" ? "[&>svg]:w-4 [&>svg]:h-4" : "[&>svg]:w-5 [&>svg]:h-5"
        )}
      >
        {Icons.activity}
      </div>
      {withText && (
        <span className={cn("font-bold tracking-tight text-[var(--text-primary)]", textSize)}>
          HireSys
        </span>
      )}
    </div>
  );
}
