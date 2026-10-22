import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hasCompletedInterview(candidate: any): boolean {
  return Array.isArray(candidate?.interviews) && 
         candidate.interviews.some((iv: any) => iv.status === "COMPLETED");
}
