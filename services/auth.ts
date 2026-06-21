import api from "./api";

export const authService = {
  loginWithPhone: async (phone: string) => {
    const response = await api.post("/auth/login-phone", { phone });
    return response.data;
  },
  loginWithEmail: async (email: string) => {
    const response = await api.post("/auth/login-email", { email });
    return response.data;
  },
  verifyOtp: async (phone: string, code: string) => {
    const response = await api.post("/auth/verify-otp", { phone, code });
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};

export default authService;
