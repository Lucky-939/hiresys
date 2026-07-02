import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-[var(--text-muted)]">
        <div className="relative w-12 h-12 animate-pulse">
          <Image
            src="/branding/logo-icon.svg"
            alt="HireSys Logo"
            fill
            priority
            className="object-contain"
          />
        </div>
        <p className="text-sm font-medium tracking-wide">Loading...</p>
      </div>
    </div>
  );
}
