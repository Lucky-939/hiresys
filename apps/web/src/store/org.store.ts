import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OrgState {
  selectedOrgId: string | null;
  setSelectedOrgId: (id: string) => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      selectedOrgId: null,
      setSelectedOrgId: (id) => set({ selectedOrgId: id }),
    }),
    { name: "hire-sys-org" },
  ),
);
