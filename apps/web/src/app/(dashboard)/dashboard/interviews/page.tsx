"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700",
  ACTIVE: "bg-green-50 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-50 text-red-700",
};

type Interview = {
  id: string;
  title: string;
  status: string;
  createdBy: {
    name: string;
  };
};

export default function InterviewsPage() {
  const params = useSearchParams();
  const orgId = params.get("org");
  const router = useRouter();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    api.get(`/interviews/org/${orgId}`).then((r) => {
      setInterviews(r.data.data);
      setLoading(false);
    });
  }, [orgId]);

  async function createInterview() {
    const title = prompt("Interview title:");

    if (!title) return;

    const { data } = await api.post("/interviews", {
      title,
      organizationId: orgId,
    });

    setInterviews((prev) => [data.data, ...prev]);
  }

  if (!orgId) {
    return (
      <p className="text-gray-500 text-sm">Select an organization first.</p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Interviews</h1>

        <button
          onClick={createInterview}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          New interview
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : interviews.length === 0 ? (
        <p className="text-gray-500 text-sm">No interviews yet.</p>
      ) : (
        <div className="space-y-3">
          {interviews.map((iv) => (
            <div
              key={iv.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-gray-300 cursor-pointer"
              onClick={() => router.push(`/room/${iv.id}`)}
            >
              <div>
                <p className="font-medium text-gray-900">{iv.title}</p>

                <p className="text-sm text-gray-500 mt-0.5">
                  Created by {iv.createdBy.name}
                </p>
              </div>

              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[iv.status]}`}
              >
                {iv.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
