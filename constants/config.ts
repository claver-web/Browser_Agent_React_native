export const CONFIG = {
  APP_NAME: "E-Store",
  APP_VERSION: "1.0.0",
  CONTACT_EMAIL: "support@estore.com",
  API_BASE_URL: "http://localhost:3000/api",
  RAZORPAY_KEY_ID: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || "your_razorpay_key",
  CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "your_clerk_key",
};

export default CONFIG;
