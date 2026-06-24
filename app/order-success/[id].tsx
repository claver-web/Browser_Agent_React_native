import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, BackHandler, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function OrderSuccessScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Prevent back navigation on Android
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => backHandler.remove();
  }, []);

  return (
    <View className="flex-1 bg-indigo-600 justify-center items-center p-6">
      <View className="w-24 h-24 bg-white/20 rounded-full items-center justify-center mb-8">
        <View className="w-16 h-16 bg-white rounded-full items-center justify-center shadow-lg">
          <Ionicons name="checkmark" size={40} color="#4f46e5" />
        </View>
      </View>

      <Text className="text-4xl font-extrabold text-white text-center mb-2">
        Success!
      </Text>
      
      <Text className="text-indigo-100 text-lg text-center mb-8">
        Your order has been placed successfully.
      </Text>

      <View className="bg-white/10 w-full p-6 rounded-2xl mb-12 items-center">
        <Text className="text-indigo-200 text-sm font-medium mb-1">Order ID</Text>
        <Text className="text-white text-xl font-bold">{id}</Text>
      </View>

      <TouchableOpacity 
        onPress={() => router.replace('/(tabs)/orders')}
        className="w-full bg-white py-4 rounded-full shadow-lg items-center mb-4"
      >
        <Text className="text-indigo-600 font-bold text-lg">View Order Tracking</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => router.replace('/(tabs)/')}
        className="w-full py-4 rounded-full border border-white/30 items-center"
      >
        <Text className="text-white font-bold text-lg">Continue Shopping</Text>
      </TouchableOpacity>
    </View>
  );
}
