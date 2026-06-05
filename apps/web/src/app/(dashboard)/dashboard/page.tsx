"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

type Organization = {
  id: string;
  name: string;
  _count?: {
    interviews?: number;
    members?: number;
  };
};

export default function DashboardPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return; // ← removed setLoading(false) from here

    api
      .get("/organizations/mine")
      .then((r) => {
        setOrgs(r.data.data);
      })
      .catch((err) => {
        console.error("Failed to load orgs:", err.response?.status);
      })
      .finally(() => {
        setLoading(false); // ← always runs, whether success or failure
      });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Your organizations
        </h1>

        <button
          onClick={async () => {
            const name = prompt("Organization name:");
            if (!name) return;

            const { data } = await api.post("/organizations", { name });

            setOrgs((prev) => [...prev, data.data]);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          New organization
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : orgs.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No organizations yet. Create your first one.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/dashboard/interviews?org=${org.id}`}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors"
            >
              <h2 className="font-medium text-gray-900">{org.name}</h2>

              <p className="text-sm text-gray-500 mt-1">
                {org._count?.interviews ?? 0} interviews ·{" "}
                {org._count?.members ?? 0} members
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
