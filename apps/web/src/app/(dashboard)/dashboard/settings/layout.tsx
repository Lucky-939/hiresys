"use client";

import { PageHeader } from "@/components/ui/PageHeader";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-6 px-4">
      <PageHeader
        title="Settings"
        description="Manage your account profile and organization preferences."
        backHref="/dashboard"
        backLabel="Back to Dashboard"
      />
      {children}
    </div>
  );
}
