"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    setMounted(true);
    
    const checkAuth = async () => {
      const currentToken = useAuthStore.getState().token;
      
      // If there's no token in the store, redirect to login
      if (!currentToken) {
        localStorage.removeItem("token");
        localStorage.removeItem("auth-storage");
        localStorage.removeItem("hire-sys-org");
        router.replace("/login");
        return;
      }

      // Verify session with backend
      try {
        const res = await api.get("/organizations/mine");
        const orgs = res.data.data;
        if (orgs.length === 0 && pathname !== "/dashboard/organization") {
          router.replace("/dashboard/organization");
        }
      } catch (err: any) {
        if (err.response?.status === 401) {
          useAuthStore.getState().logout();
          localStorage.removeItem("token");
          localStorage.removeItem("auth-storage");
          localStorage.removeItem("hire-sys-org");
          router.replace("/login");
        }
      }
    };
    
    checkAuth();
  }, [token, router, pathname]);

  if (!mounted) return null;
  if (!token) return null; // Prevent flash while redirecting

  return (
    <>
      <AppShell>
        {children}
      </AppShell>
    </>
  );
}
