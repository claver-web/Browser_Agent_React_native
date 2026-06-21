import api from "./api";

export const paymentService = {
  createOrder: async (amount: number, currency: string = "INR") => {
    const response = await api.post("/payments/create-order", { amount, currency });
    return response.data;
  },
  verifyPayment: async (paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    const response = await api.post("/payments/verify", paymentData);
    return response.data;
  },
};

export default paymentService;
