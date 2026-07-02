import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  withText?: boolean;
}

/**
 * Logo component rendering official HireSys brand assets.
 *
 * The SVGs (both logo-full.svg and logo-icon.svg) have a native viewBox
 * of 810 × 1012.5 (portrait orientation, ~0.8:1 aspect ratio).
 * Sizes here are tuned so the logo is clearly visible at each tier.
 */
export function Logo({ className, size = "md", withText = true }: LogoProps) {
  // Aspect ratio from the SVG viewBox: 810 / 1012.5 ≈ 0.8
  const dimensions = {
    sm: withText
      ? { width: 120, height: 48 }
      : { width: 32, height: 40 },
    md: withText
      ? { width: 150, height: 60 }
      : { width: 40, height: 50 },
    lg: withText
      ? { width: 180, height: 72 }
      : { width: 48, height: 60 },
  }[size];

  const src = withText ? "/branding/logo-full.svg" : "/branding/logo-icon.svg";

  return (
    <div className={cn("flex items-center shrink-0", className)}>
      <Image
        src={src}
        alt="HireSys Logo"
        width={dimensions.width}
        height={dimensions.height}
        priority
        className="object-contain"
      />
    </div>
  );
}

