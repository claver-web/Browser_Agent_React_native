import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Dimensions, Animated, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../stores/useCartStore';
import { CartItem } from '../../types';
import { FREE_SHIPPING_THRESHOLD } from '../../lib/constants';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

const SwipeableCartItem = ({ 
  item, 
  onUpdate, 
  onRemove,
  isUpdating
}: { 
  item: CartItem; 
  onUpdate: (id: string, qty: number) => void; 
  onRemove: (id: string) => void;
  isUpdating: boolean;
}) => {
  return (
    <View className="relative bg-red-500 rounded-2xl mb-4 overflow-hidden shadow-sm" style={{ width: CARD_WIDTH }}>
      {/* Delete Background */}
      <TouchableOpacity 
        onPress={() => onRemove(item.id)}
        className="absolute right-0 w-24 h-full items-center justify-center bg-red-500"
      >
        <Ionicons name="trash" size={24} color="white" />
        <Text className="text-white text-xs font-bold mt-1">Delete</Text>
      </TouchableOpacity>

      {/* Foreground scrollable area */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        bounces={false}
        contentContainerStyle={{ width: CARD_WIDTH + 96 }} // CARD_WIDTH + delete button width
      >
        {/* Actual Card */}
        <View 
          style={{ width: CARD_WIDTH }} 
          className="bg-surface p-3 flex-row items-center border border-border h-full"
        >
          <Image 
            source={{ uri: item.product?.images?.[0] || 'https://via.placeholder.com/80' }}
            className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700"
            resizeMode="cover"
          />
          
          <View className="flex-1 ml-3 justify-between h-full py-1">
            <View>
              <Text className="text-sm font-bold text-text-primary" numberOfLines={2}>
                {item.product?.name || 'Unknown Product'}
              </Text>
              <Text className="text-indigo-600 dark:text-indigo-400 font-bold mt-1">
                ₹{item.price.toFixed(2)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between mt-2">
              <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-full">
                <TouchableOpacity 
                  onPress={() => onUpdate(item.id, Math.max(1, item.quantity - 1))}
                  disabled={item.quantity <= 1 || isUpdating}
                  className="w-8 h-8 items-center justify-center opacity-70 active:opacity-100 disabled:opacity-30"
                >
                  <Ionicons name="remove" size={16} color="#1f2937" className="text-text-primary" />
                </TouchableOpacity>
                <Text className="font-bold text-xs px-2 text-text-primary min-w-[20px] text-center">
                  {item.quantity}
                </Text>
                <TouchableOpacity 
                  onPress={() => onUpdate(item.id, item.quantity + 1)}
                  disabled={isUpdating}
                  className="w-8 h-8 items-center justify-center opacity-70 active:opacity-100"
                >
                  <Ionicons name="add" size={16} color="#1f2937" className="text-text-primary" />
                </TouchableOpacity>
              </View>
              
              <Text className="text-sm font-extrabold text-text-primary">
                ₹{(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Transparent Spacer to allow scrolling left and reveal delete button underneath */}
        <View style={{ width: 96 }} className="h-full bg-transparent" />
      </ScrollView>
    </View>
  );
};

export default function CartScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { items, loading, fetchCart, updateQuantity, removeItem, getComputed } = useCartStore();
  
  const { subtotal, itemCount, shipping, tax, total } = getComputed();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressPercent = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progressPercent]);

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-6 mt-20">
      <View className="w-40 h-40 bg-indigo-50 dark:bg-indigo-900/20 rounded-full items-center justify-center mb-6">
        <Ionicons name="cart-outline" size={80} color="#4f46e5" />
      </View>
      <Text className="text-2xl font-bold text-text-primary text-center mb-2">
        Your cart is empty
      </Text>
      <Text className="text-text-secondary text-center mb-8">
        Looks like you haven't added anything to your cart yet.
      </Text>
      <TouchableOpacity 
        onPress={() => router.push('/(tabs)/products')}
        className="w-full bg-indigo-600 py-4 rounded-full shadow-md items-center"
      >
        <Text className="text-white font-bold text-lg">Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSkeleton = () => (
    <View className="flex-1 px-4 mt-4">
      {[1, 2, 3].map(i => (
        <View key={i} className="w-full h-28 bg-surface rounded-2xl mb-4 p-3 flex-row items-center opacity-70">
          <View className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          <View className="flex-1 ml-3 justify-between h-full py-1">
            <View>
              <View className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
              <View className="w-1/4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </View>
            <View className="w-1/2 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mt-auto" />
          </View>
        </View>
      ))}
    </View>
  );

  if (!isLoaded || (!isSignedIn && !loading)) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <Ionicons name="lock-closed-outline" size={64} color="#9ca3af" />
        <Text className="text-xl font-bold mt-4 text-text-primary">Sign In Required</Text>
        <Text className="text-text-secondary mt-2 text-center">Please log in to view your cart.</Text>
        <TouchableOpacity 
          onPress={() => router.push('/(auth)/login')}
          className="mt-6 bg-indigo-600 px-8 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background pt-12">
      {/* Header */}
      <View className="px-4 pb-4 flex-row items-center border-b border-border">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-surface items-center justify-center shadow-sm mr-3"
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" className="text-text-primary" />
        </TouchableOpacity>
        <View className="flex-row items-end">
          <Text className="text-2xl font-extrabold text-text-primary">My Cart</Text>
          {itemCount > 0 && (
            <Text className="text-indigo-600 dark:text-indigo-400 font-bold ml-2 mb-1">
              ({itemCount} {itemCount === 1 ? 'item' : 'items'})
            </Text>
          )}
        </View>
      </View>

      {/* Main Content */}
      {loading && items.length === 0 ? (
        renderSkeleton()
      ) : items.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <ScrollView 
            className="flex-1 px-4 pt-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 240 }} // Space for sticky bottom
          >
            {/* Free Shipping Progress */}
            <View className="bg-surface p-4 rounded-2xl shadow-sm border border-border mb-6">
              <View className="flex-row items-center mb-2">
                <View className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center mr-2">
                  <Ionicons name="cube-outline" size={16} color="#4f46e5" />
                </View>
                {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                  <Text className="text-green-600 dark:text-green-400 font-bold flex-1">
                    Congratulations! You get FREE Shipping!
                  </Text>
                ) : (
                  <Text className="text-text-secondary font-medium flex-1">
                    Add <Text className="font-bold text-indigo-600 dark:text-indigo-400">₹{(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2)}</Text> more for FREE shipping!
                  </Text>
                )}
              </View>
              
              <View className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <Animated.View 
                  className="h-full bg-indigo-600 rounded-full"
                  style={{
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%']
                    })
                  }}
                />
              </View>
            </View>

            {/* Cart Items List */}
            {items.map(item => (
              <SwipeableCartItem 
                key={item.id}
                item={item}
                onUpdate={updateQuantity}
                onRemove={removeItem}
                isUpdating={loading}
              />
            ))}
          </ScrollView>

          {/* Sticky Price Summary */}
          <View className="absolute bottom-0 w-full bg-background border-t border-border p-5 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] pb-8">
            <View className="space-y-3 mb-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-text-secondary font-medium">Subtotal</Text>
                <Text className="text-text-primary font-bold">₹{subtotal.toFixed(2)}</Text>
              </View>
              
              <View className="flex-row justify-between items-center">
                <Text className="text-text-secondary font-medium">Shipping</Text>
                {shipping === 0 ? (
                  <View className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded text-xs">
                    <Text className="text-green-700 dark:text-green-400 font-bold">FREE</Text>
                  </View>
                ) : (
                  <Text className="text-text-primary font-bold">₹{shipping.toFixed(2)}</Text>
                )}
              </View>
              
              <View className="flex-row justify-between items-center">
                <Text className="text-text-secondary font-medium">Tax (18% GST)</Text>
                <Text className="text-text-primary font-bold">₹{tax.toFixed(2)}</Text>
              </View>
              
              <View className="h-px bg-gray-200 bg-surface my-1" />
              
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-bold text-text-primary">Total</Text>
                <Text className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  ₹{total.toFixed(2)}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => router.push('/checkout')}
              disabled={loading || items.length === 0}
              className="w-full bg-indigo-600 py-4 rounded-full shadow-md items-center"
            >
              <Text className="text-white font-bold text-lg">Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
