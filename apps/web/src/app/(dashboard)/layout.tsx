import React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "sonner";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppShell>
        {children}
      </AppShell>
      {/* Global Toaster for the App Shell */}
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          className: "bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)] shadow-lg rounded-xl",
          style: {
            fontFamily: "var(--font-sans)",
          }
        }} 
      />
    </>
  );
}
