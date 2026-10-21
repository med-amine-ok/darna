import { create } from "zustand";
import { ListingVertical } from "@/types";

interface VerticalStore {
  activeVertical: ListingVertical;
  setActiveVertical: (vertical: ListingVertical) => void;
}

export const useVertical = create<VerticalStore>((set) => ({
  activeVertical: "home",
  setActiveVertical: (activeVertical) => set({ activeVertical }),
}));
