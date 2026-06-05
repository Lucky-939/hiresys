"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/login");
    }
  }, [hydrated, user, router]); // ← added router to dependency array

  if (!hydrated) return null;
  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <span className="font-semibold text-gray-900">InterviewAI</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 text-gray-700"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/interviews"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 text-gray-700"
          >
            Interviews
          </Link>
          <Link
            href="/dashboard/resume"
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 text-gray-700"
          >
            Resume Analyzer
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">{user.name}</p>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="text-sm text-red-600 hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
