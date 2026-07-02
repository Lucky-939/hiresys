"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "sonner";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    setMounted(true);
    if (!token && !localStorage.getItem("token") && !localStorage.getItem("auth-storage")?.includes("token")) {
      router.replace("/login");
    }
  }, [token, router]);

  if (!mounted) return null;
  if (!token) return null; // Prevent flash

  return (
    <>
      <AppShell>
        {children}
      </AppShell>
      {/* Global Toaster for the App Shell */}
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          className: "bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)] shadow-[var(--shadow-md)] rounded-[var(--radius-card)]",
          style: {
            fontFamily: "var(--font-sans)",
          }
        }} 
      />
    </>
  );
}
