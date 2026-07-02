"use client";

import { useEffect, useState } from "react";
import { useOrgStore, Org } from "@/store/org.store";

export function useOrganizations() {
  const { selectedOrgId, orgs, fetchOrgs } = useOrgStore();
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    fetchOrgs().finally(() => {
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]); // Run once after hydration

  return { 
    orgs, 
    loading: loading || !hydrated, 
    isReady: hydrated && !loading,
    selectedOrgId,
    refreshOrgs: fetchOrgs
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
