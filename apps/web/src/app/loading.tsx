import { Icons } from "@/components/ui/Icons";

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-[var(--text-muted)] animate-pulse">
        <div className="h-8 w-8 border-2 border-[var(--border-default)] border-t-[var(--accent)] rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}
