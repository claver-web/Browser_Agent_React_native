import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform, ToastAndroid } from "react-native";
import { apiClient } from "../lib/api-client";
import { CartItem, Cart, ApiResponse, Product } from "../types";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, GST_RATE } from "../lib/constants";

interface CartComputed {
  subtotal: number;
  itemCount: number;
  shipping: number;
  tax: number;
  total: number;
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string | null;
  
  getComputed: () => CartComputed;
  
  fetchCart: () => Promise<void>;
  addToCart: (product: Product, quantity: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
}

const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert("Cart", message);
  }
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      error: null,
      
      getComputed: () => {
        const { items } = get();
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemCount = items.reduce((count, item) => count + item.quantity, 0);
        const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_FEE;
        const tax = subtotal * GST_RATE;
        const total = subtotal + shipping + tax;
        
        return { subtotal, itemCount, shipping, tax, total };
      },

      syncWithBackend: async () => {
        try {
          const { items } = get();
          await apiClient.post("/cart/sync", items);
        } catch (error) {
          console.error("Failed to sync cart to backend:", error);
        }
      },

      fetchCart: async () => {
        set({ loading: true, error: null });
        try {
          const response = await apiClient.get<ApiResponse<Cart>>("/cart/sync");
          set({ items: response.data.data.items || [], loading: false });
        } catch (error: any) {
          // It's okay if fetch fails for unauthenticated users
          set({ loading: false });
        }
      },

      addToCart: async (product: Product, quantity: number) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex(i => i.productId === product.id);
          const newItems = [...state.items];

          if (existingItemIndex >= 0) {
            newItems[existingItemIndex].quantity += quantity;
          } else {
            newItems.push({
              id: `temp_${Date.now()}_${Math.random()}`,
              cartId: 'local',
              productId: product.id,
              product,
              quantity,
              price: product.price,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          return { items: newItems };
        });
        
        showToast("Item added to cart");
        await get().syncWithBackend();
      },

      updateQuantity: async (itemId: string, quantity: number) => {
        set((state) => {
          const newItems = state.items.map(item => 
            item.id === itemId ? { ...item, quantity } : item
          );
          return { items: newItems };
        });
        
        await get().syncWithBackend();
      },

      removeItem: async (itemId: string) => {
        set((state) => ({
          items: state.items.filter(item => item.id !== itemId)
        }));
        
        showToast("Item removed");
        await get().syncWithBackend();
      },

      clearCart: async () => {
        set({ items: [] });
        await get().syncWithBackend();
      },
    }),
    {
      name: "shopai-cart-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
