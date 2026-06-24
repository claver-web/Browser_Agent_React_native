import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { useCartStore } from '../../stores/useCartStore';
import { useCheckoutStore } from '../../stores/useCheckoutStore';
import { apiClient } from '../../lib/api-client';
import { trackEvent } from '../../components/ActivityTracker';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir'
];

const shippingSchema = z.object({
  fullName: z.string().min(3, "Name must be at least 3 characters"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Must be a valid 10-digit Indian phone number"),
  addressLine1: z.string().min(5, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  postalCode: z.string().regex(/^\d{6}$/, "Must be a 6-digit PIN code"),
});

type ShippingFormData = z.infer<typeof shippingSchema>;

type PaymentMethod = 'UPI' | 'CARD' | 'NET_BANKING' | 'COD';

const PAYMENT_METHODS: { id: PaymentMethod, title: string, icon: keyof typeof Ionicons.glyphMap, color: string }[] = [
  { id: 'UPI', title: 'UPI (GPay, PhonePe, Paytm)', icon: 'phone-portrait-outline', color: '#8b5cf6' },
  { id: 'CARD', title: 'Credit / Debit Card', icon: 'card-outline', color: '#3b82f6' },
  { id: 'NET_BANKING', title: 'Net Banking', icon: 'business-outline', color: '#10b981' },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  
  const { items, getComputed, fetchCart, clearCart } = useCartStore();
  const { savedAddress, saveAddress } = useCheckoutStore();
  const { subtotal, shipping, tax, total } = getComputed();

  const [isOrderSummaryExpanded, setIsOrderSummaryExpanded] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('UPI');
  const [shouldSaveAddress, setShouldSaveAddress] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: savedAddress || {
      fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: ''
    }
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      Alert.alert('Authentication Required', 'Please log in to checkout.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') }
      ]);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUseSavedAddress = () => {
    if (savedAddress) {
      Object.keys(savedAddress).forEach((key) => {
        setValue(key as keyof ShippingFormData, savedAddress[key as keyof ShippingFormData] || '');
      });
    }
  };

  const processPayment = async (data: ShippingFormData) => {
    setIsProcessing(true);
    
    if (shouldSaveAddress) {
      saveAddress(data);
    }

    try {
      const createRes = await apiClient.post('/razorpay/create-order', {
        amount: Math.round(total * 100),
        currency: 'INR',
        shippingAddress: data,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price }))
      });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const verifyRes = await apiClient.post('/razorpay/verify-payment', {
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_order_id: createRes.data.data.id,
          razorpay_signature: 'mock_signature_hash'
        });

      trackEvent('purchase', { orderId: verifyRes.data.data.orderId, value: total });
      clearCart();
      router.replace(`/order-success/${verifyRes.data.data.orderId}`);
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        'Payment Failed', 
        error?.response?.data?.message || 'There was an error processing your payment. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return <View className="flex-1 bg-background items-center justify-center"><ActivityIndicator color="#4f46e5" /></View>;
  }

  if (items.length === 0) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <Ionicons name="cart-outline" size={64} color="#9ca3af" />
        <Text className="text-xl font-bold mt-4 text-text-primary">Your cart is empty</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-indigo-600 px-6 py-3 rounded-full">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background pt-12">
      <View className="px-4 pb-4 flex-row items-center border-b border-border bg-background z-10">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-surface items-center justify-center shadow-sm mr-3"
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" className="text-text-primary" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text-primary">Checkout</Text>
      </View>

      <KeyboardAwareScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        enableOnAndroid={true}
        keyboardOpeningTime={0}
      >
        <View className="bg-surface p-4 mb-4 border-b border-border shadow-sm">
          <TouchableOpacity 
            onPress={() => setIsOrderSummaryExpanded(!isOrderSummaryExpanded)}
            className="flex-row justify-between items-center"
          >
            <View className="flex-row items-center space-x-2">
              <Ionicons name="receipt-outline" size={20} color="#4f46e5" />
              <Text className="text-lg font-bold text-text-primary">Order Summary</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-lg font-bold text-text-primary mr-2">₹{total.toFixed(2)}</Text>
              <Ionicons name={isOrderSummaryExpanded ? "chevron-up" : "chevron-down"} size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>

          {isOrderSummaryExpanded && (
            <View className="mt-4 pt-4 border-t border-border">
              {items.map(item => (
                <View key={item.id} className="flex-row items-center mb-3">
                  <Image source={{ uri: item.product?.images?.[0] }} className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700" />
                  <View className="flex-1 ml-3">
                    <Text className="text-sm font-medium text-text-primary" numberOfLines={1}>{item.product?.name}</Text>
                    <Text className="text-xs text-text-secondary">Qty: {item.quantity}</Text>
                  </View>
                  <Text className="text-sm font-bold text-text-primary">₹{(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              ))}
              
              <View className="mt-3 pt-3 border-t border-border space-y-2">
                <View className="flex-row justify-between"><Text className="text-text-secondary">Subtotal</Text><Text className="text-text-primary">₹{subtotal.toFixed(2)}</Text></View>
                <View className="flex-row justify-between"><Text className="text-text-secondary">Shipping</Text><Text className="text-text-primary">{shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}</Text></View>
                <View className="flex-row justify-between"><Text className="text-text-secondary">Tax</Text><Text className="text-text-primary">₹{tax.toFixed(2)}</Text></View>
              </View>
            </View>
          )}
        </View>

        <View className="bg-surface p-5 mb-4 shadow-sm border-y border-border">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-text-primary">Shipping Address</Text>
            {savedAddress && (
              <TouchableOpacity onPress={handleUseSavedAddress}>
                <Text className="text-indigo-600 dark:text-indigo-400 text-xs font-bold">Use Saved Address</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="space-y-4">
            <View>
              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, value } }) => (
                  <View className={`border ${errors.fullName ? 'border-red-500' : 'border-border'} rounded-xl bg-background px-4 py-2`}>
                    <Text className="text-xs text-text-secondary mb-1">Full Name *</Text>
                    <TextInput value={value} onChangeText={onChange} className="text-base text-text-primary pb-1" placeholder="John Doe" placeholderTextColor="#9ca3af" />
                  </View>
                )}
              />
              {errors.fullName && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.fullName.message}</Text>}
            </View>

            <View>
              <Controller
                control={control}
                name="phone"
                render={({ field: { onChange, value } }) => (
                  <View className={`border ${errors.phone ? 'border-red-500' : 'border-border'} rounded-xl bg-background px-4 py-2`}>
                    <Text className="text-xs text-text-secondary mb-1">Phone Number *</Text>
                    <View className="flex-row items-center">
                      <Text className="text-text-primary mr-2 border-r border-gray-300 dark:border-gray-600 pr-2">+91</Text>
                      <TextInput value={value} onChangeText={onChange} keyboardType="numeric" maxLength={10} className="flex-1 text-base text-text-primary pb-1" placeholder="9876543210" placeholderTextColor="#9ca3af" />
                    </View>
                  </View>
                )}
              />
              {errors.phone && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.phone.message}</Text>}
            </View>

            <View>
              <Controller
                control={control}
                name="addressLine1"
                render={({ field: { onChange, value } }) => (
                  <View className={`border ${errors.addressLine1 ? 'border-red-500' : 'border-border'} rounded-xl bg-background px-4 py-2`}>
                    <Text className="text-xs text-text-secondary mb-1">Address Line 1 *</Text>
                    <TextInput value={value} onChangeText={onChange} className="text-base text-text-primary pb-1" placeholder="House/Flat No., Building Name" placeholderTextColor="#9ca3af" />
                  </View>
                )}
              />
              {errors.addressLine1 && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.addressLine1.message}</Text>}
            </View>

            <View>
              <Controller
                control={control}
                name="addressLine2"
                render={({ field: { onChange, value } }) => (
                  <View className="border border-border rounded-xl bg-background px-4 py-2">
                    <Text className="text-xs text-text-secondary mb-1">Address Line 2 (Optional)</Text>
                    <TextInput value={value} onChangeText={onChange} className="text-base text-text-primary pb-1" placeholder="Street, Area, Landmark" placeholderTextColor="#9ca3af" />
                  </View>
                )}
              />
            </View>

            <View className="flex-row space-x-4">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="city"
                  render={({ field: { onChange, value } }) => (
                    <View className={`border ${errors.city ? 'border-red-500' : 'border-border'} rounded-xl bg-background px-4 py-2`}>
                      <Text className="text-xs text-text-secondary mb-1">City *</Text>
                      <TextInput value={value} onChangeText={onChange} className="text-base text-text-primary pb-1" placeholder="Mumbai" placeholderTextColor="#9ca3af" />
                    </View>
                  )}
                />
                {errors.city && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.city.message}</Text>}
              </View>

              <View className="flex-1">
                <Controller
                  control={control}
                  name="postalCode"
                  render={({ field: { onChange, value } }) => (
                    <View className={`border ${errors.postalCode ? 'border-red-500' : 'border-border'} rounded-xl bg-background px-4 py-2`}>
                      <Text className="text-xs text-text-secondary mb-1">PIN Code *</Text>
                      <TextInput value={value} onChangeText={onChange} keyboardType="numeric" maxLength={6} className="text-base text-text-primary pb-1" placeholder="400001" placeholderTextColor="#9ca3af" />
                    </View>
                  )}
                />
                {errors.postalCode && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.postalCode.message}</Text>}
              </View>
            </View>

            <View>
              <Controller
                control={control}
                name="state"
                render={({ field: { onChange, value } }) => (
                  <View className={`border ${errors.state ? 'border-red-500' : 'border-border'} rounded-xl bg-background px-4 py-2`}>
                    <Text className="text-xs text-text-secondary mb-1">State *</Text>
                    <TextInput value={value} onChangeText={onChange} className="text-base text-text-primary pb-1" placeholder="Maharashtra" placeholderTextColor="#9ca3af" />
                  </View>
                )}
              />
              {errors.state && <Text className="text-red-500 text-xs mt-1 ml-1">{errors.state.message}</Text>}
            </View>

            <TouchableOpacity 
              onPress={() => setShouldSaveAddress(!shouldSaveAddress)}
              className="flex-row items-center mt-2"
            >
              <View className={`w-5 h-5 rounded border ${shouldSaveAddress ? 'bg-indigo-600 border-indigo-600' : 'bg-transparent border-gray-400'} items-center justify-center mr-2`}>
                {shouldSaveAddress && <Ionicons name="checkmark" size={14} color="white" />}
              </View>
              <Text className="text-sm text-text-secondary">Save this address for next time</Text>
            </TouchableOpacity>

          </View>
        </View>

        <View className="bg-surface p-5 mb-4 shadow-sm border-y border-border">
          <Text className="text-lg font-bold text-text-primary mb-4">Payment Method</Text>
          
          <View className="space-y-3">
            {PAYMENT_METHODS.map(method => (
              <TouchableOpacity
                key={method.id}
                onPress={() => setSelectedPaymentMethod(method.id)}
                className={`flex-row items-center p-4 rounded-xl border ${selectedPaymentMethod === method.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/10' : 'border-border bg-background'}`}
              >
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: method.color + '20' }}>
                  <Ionicons name={method.icon} size={20} color={method.color} />
                </View>
                <Text className={`flex-1 text-base ${selectedPaymentMethod === method.id ? 'font-bold text-indigo-700 dark:text-indigo-400' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
                  {method.title}
                </Text>
                <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedPaymentMethod === method.id ? 'border-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
                  {selectedPaymentMethod === method.id && <View className="w-3 h-3 rounded-full bg-indigo-600" />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </KeyboardAwareScrollView>

      <View className="absolute bottom-0 w-full bg-background border-t border-border p-5 pb-8 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
        <TouchableOpacity 
          onPress={handleSubmit(processPayment)}
          disabled={isProcessing}
          className={`w-full py-4 rounded-full shadow-md items-center flex-row justify-center ${isProcessing ? 'bg-indigo-400' : 'bg-indigo-600'}`}
        >
          {isProcessing ? (
            <>
              <ActivityIndicator color="white" className="mr-2" />
              <Text className="text-white font-bold text-lg">
                Opening Razorpay...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color="white" className="mr-2" />
              <Text className="text-white font-bold text-lg">
                Pay ₹{total.toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>
        {!isProcessing && (
          <Text className="text-center text-xs text-text-secondary mt-2">Secured by Razorpay</Text>
        )}
      </View>

    </View>
  );
}
