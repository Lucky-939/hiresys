"use client";

import { useEffect, useState } from "react";
import { useOrgStore } from "@/store/org.store";
import { api } from "@/lib/api";

export type Org = {
  id: string;
  name: string;
};

export function useOrganizations() {
  const { selectedOrgId, setSelectedOrgId } = useOrgStore();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    api.get("/organizations/mine")
      .then((res) => {
        const fetchedOrgs = res.data.data;
        setOrgs(fetchedOrgs);
        if (fetchedOrgs.length > 0) {
          const exists = fetchedOrgs.some((o: Org) => o.id === selectedOrgId);
          if (!exists) {
            setSelectedOrgId(fetchedOrgs[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]); // Run once after hydration

  return { 
    orgs, 
    loading: loading || !hydrated, 
    isReady: hydrated && !loading,
    selectedOrgId 
  };
}

export function OrganizationSelector({ orgs }: { orgs: Org[] }) {
  const { selectedOrgId, setSelectedOrgId } = useOrgStore();

  if (orgs.length <= 1) return null;

  return (
    <div style={{ position: "relative" }}>
      <select
        value={selectedOrgId || ""}
        onChange={(e) => setSelectedOrgId(e.target.value)}
        className="filter-select"
      >
        {orgs.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  );
}
