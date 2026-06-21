import { create } from "zustand";

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image?: string;
}

interface WishlistState {
  items: WishlistItem[];
  toggleItem: (item: WishlistItem) => void;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>((set) => ({
  items: [],
  toggleItem: (item) =>
    set((state) => {
      const exists = state.items.some((i) => i.id === item.id);
      if (exists) {
        return { items: state.items.filter((i) => i.id !== item.id) };
      }
      return { items: [...state.items, item] };
    }),
  clearWishlist: () => set({ items: [] }),
}));
