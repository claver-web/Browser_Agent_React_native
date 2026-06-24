import { create } from "zustand";
import { ShippingAddress } from "../types";

interface CheckoutState {
  savedAddress: ShippingAddress | null;
  saveAddress: (address: ShippingAddress) => void;
  clearAddress: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  savedAddress: null,
  saveAddress: (address) => set({ savedAddress: address }),
  clearAddress: () => set({ savedAddress: null }),
}));
