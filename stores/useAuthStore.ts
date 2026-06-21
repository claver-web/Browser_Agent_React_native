import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { User } from "../types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  useBiometrics: boolean;
  setUseBiometrics: (value: boolean) => Promise<void>;
  loadBiometricPreference: () => Promise<void>;
  syncWithClerk: (clerkUser: any) => void;
  logout: () => void;
  updateProfile: (name: string, email?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  useBiometrics: false,
  setUseBiometrics: async (value) => {
    try {
      await SecureStore.setItemAsync("use_biometrics", value ? "true" : "false");
      set({ useBiometrics: value });
    } catch (e) {
      console.error("Failed to save biometric preference:", e);
    }
  },
  loadBiometricPreference: async () => {
    try {
      const value = await SecureStore.getItemAsync("use_biometrics");
      set({ useBiometrics: value === "true" });
    } catch (e) {
      console.error("Failed to load biometric preference:", e);
    }
  },
  syncWithClerk: (clerkUser) => {
    if (clerkUser) {
      // Map Clerk User structure to our internal User interface
      const addresses = (clerkUser.publicMetadata?.addresses as any[]) || [];
      const user: User = {
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.firstName || "E-Store User",
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        phone: clerkUser.primaryPhoneNumber?.phoneNumber || "",
        avatar: clerkUser.imageUrl,
        addresses: addresses,
        createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt).toISOString() : new Date().toISOString(),
      };
      set({ user, isAuthenticated: true });
    } else {
      set({ user: null, isAuthenticated: false });
    }
  },
  logout: () => {
    set({ user: null, isAuthenticated: false });
  },
  updateProfile: async (name, email) => {
    const currentUser = get().user;
    if (currentUser) {
      set({
        user: {
          ...currentUser,
          name,
          email: email || currentUser.email,
        },
      });
    }
  },
}));

export default useAuthStore;
