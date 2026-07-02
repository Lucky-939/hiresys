import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

export type Org = {
  id: string;
  name: string;
};

interface OrgState {
  selectedOrgId: string | null;
  orgs: Org[];
  setSelectedOrgId: (id: string) => void;
  fetchOrgs: () => Promise<void>;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set, get) => ({
      selectedOrgId: null,
      orgs: [],
      setSelectedOrgId: (id) => set({ selectedOrgId: id }),
      fetchOrgs: async () => {
        try {
          const res = await api.get("/organizations/mine");
          const fetchedOrgs = res.data.data;
          set({ orgs: fetchedOrgs });
          
          const currentSelected = get().selectedOrgId;
          if (fetchedOrgs.length > 0) {
            const exists = fetchedOrgs.some((o: Org) => o.id === currentSelected);
            if (!exists) {
              set({ selectedOrgId: fetchedOrgs[0].id });
            }
          } else if (currentSelected) {
            set({ selectedOrgId: null });
          }
        } catch (err) {
          console.error("Failed to fetch orgs:", err);
        }
      }
    }),
    { name: "hire-sys-org" },
  ),
);
