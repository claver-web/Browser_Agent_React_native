// lib/constants.ts

// Centralized API URLs
const LOCAL_API = 'http://localhost:3000/api';
const NETWORK_API = 'http://192.168.18.118:3000/api';

// Toggle this between LOCAL_API and NETWORK_API as needed for device testing
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || NETWORK_API;
export const FREE_SHIPPING_THRESHOLD = 500;
export const SHIPPING_FEE = 50;
export const GST_RATE = 0.18;
