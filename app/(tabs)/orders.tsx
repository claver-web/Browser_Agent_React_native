import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Animated, LayoutAnimation, Platform, UIManager, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { apiClient } from '../../lib/api-client';
import { Order, ApiResponse } from '../../types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STATUS_COLORS: Record<string, { bg: string, text: string }> = {
  PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
  PROCESSING: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  CONFIRMED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
  SHIPPED: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  DELIVERED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
  CANCELLED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
};

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const OrderCard = ({ order }: { order: Order }) => {
  const [expanded, setExpanded] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    Animated.timing(spinValue, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const statusColors = STATUS_COLORS[order.status] || STATUS_COLORS.PENDING;

  return (
    <View className="bg-surface rounded-2xl mb-4 border border-border shadow-sm overflow-hidden">
      <TouchableOpacity 
        onPress={toggleExpand}
        activeOpacity={0.7}
        className="p-4"
      >
        <View className="flex-row justify-between items-start mb-3">
          <View>
            <Text className="text-text-primary font-bold text-base">
              Order #{order.id.substring(0, 10).toUpperCase()}...
            </Text>
            <Text className="text-text-secondary text-xs mt-1">
              Placed on {formatDate(order.createdAt)}
            </Text>
          </View>
          <View className={`${statusColors.bg} px-2.5 py-1 rounded-full`}>
            <Text className={`${statusColors.text} text-[10px] font-bold tracking-wider`}>
              {order.status === 'PROCESSING' ? 'CONFIRMED' : order.status}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center border-t border-border pt-3">
          <View>
            <Text className="text-text-secondary text-xs">Total Amount</Text>
            <Text className="text-text-primary font-extrabold text-lg">₹{order.total.toFixed(2)}</Text>
          </View>
          <View className="items-end">
            <Text className="text-text-secondary text-xs mb-1">{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </Animated.View>
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View className="px-4 pb-4 bg-surface/50">
          <View className="h-px w-full bg-gray-200 dark:bg-gray-700 mb-4" />
          
          {order.items.map(item => (
            <View key={item.id} className="flex-row items-center mb-4">
              <Image 
                source={{ uri: item.product?.images?.[0] || 'https://via.placeholder.com/60' }} 
                className="w-16 h-16 rounded-xl bg-gray-200 dark:bg-gray-700" 
              />
              <View className="flex-1 ml-3">
                <Text className="text-text-primary font-semibold text-sm mb-1" numberOfLines={2}>
                  {item.product?.name || 'Unknown Product'}
                </Text>
                <View className="flex-row justify-between items-center">
                  <Text className="text-text-secondary text-xs">
                    Qty: {item.quantity} × ₹{item.price.toFixed(2)}
                  </Text>
                  <Text className="text-text-primary font-bold text-sm">
                    ₹{(item.quantity * item.price).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity className="flex-row items-center justify-center py-3 border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl mt-2">
            <Ionicons name="download-outline" size={18} color="#4f46e5" />
            <Text className="text-indigo-600 dark:text-indigo-400 font-bold ml-2">Download Invoice</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default function OrdersScreen() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await apiClient.get<ApiResponse<Order[]>>('/user/orders');
      setOrders(res.data.data || []);
    } catch (error) {
      console.error('Failed to load orders', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  if (!isLoaded || (!isSignedIn && !loading)) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <Ionicons name="lock-closed-outline" size={64} color="#9ca3af" />
        <Text className="text-xl font-bold mt-4 text-text-primary">Sign In Required</Text>
        <Text className="text-text-secondary mt-2 text-center">Please log in to view your orders.</Text>
        <TouchableOpacity 
          onPress={() => router.push('/(auth)/login')}
          className="mt-6 bg-indigo-600 px-8 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderSkeleton = () => (
    <View className="px-4 mt-4">
      {[1, 2, 3].map(i => (
        <View key={i} className="bg-surface rounded-2xl mb-4 p-4 border border-border opacity-70">
          <View className="flex-row justify-between mb-3">
            <View className="w-1/2 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <View className="w-20 h-5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          </View>
          <View className="w-1/3 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
          <View className="flex-row justify-between items-center pt-3 border-t border-border">
            <View className="w-1/4 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <View className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
          </View>
        </View>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-6 mt-20">
      <View className="w-40 h-40 bg-indigo-50 dark:bg-indigo-900/20 rounded-full items-center justify-center mb-6">
        <Ionicons name="cube-outline" size={80} color="#4f46e5" />
      </View>
      <Text className="text-2xl font-bold text-text-primary text-center mb-2">
        No orders yet
      </Text>
      <Text className="text-text-secondary text-center mb-8">
        Looks like you haven't made your first purchase.
      </Text>
      <TouchableOpacity 
        onPress={() => router.push('/(tabs)/products')}
        className="w-full bg-indigo-600 py-4 rounded-full shadow-md items-center"
      >
        <Text className="text-white font-bold text-lg">Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-background pt-12">
      {/* Header */}
      <View className="px-4 pb-4 flex-row justify-between items-end border-b border-border">
        <Text className="text-2xl font-extrabold text-text-primary">My Orders</Text>
        {!loading && orders.length > 0 && (
          <Text className="text-indigo-600 dark:text-indigo-400 font-bold mb-1">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </Text>
        )}
      </View>

      {/* Main Content */}
      {loading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
          }
        />
      )}
    </View>
  );
}
