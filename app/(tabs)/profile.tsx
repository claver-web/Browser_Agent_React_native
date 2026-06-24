import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Switch, Alert, ActivityIndicator, Linking } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { apiClient } from '../../lib/api-client';
import { ApiResponse, Order } from '../../types';
import { useThemeStore } from '../../stores/useThemeStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useCartStore } from '../../stores/useCartStore';

interface UserStats {
  totalOrders: number;
  totalSpent: number;
  cartItems: number;
}

const QuickLink = ({ icon, title, onPress, badge }: { icon: keyof typeof Ionicons.glyphMap, title: string, onPress?: () => void, badge?: number }) => (
  <TouchableOpacity 
    onPress={onPress}
    className="flex-row items-center justify-between py-4 border-b border-border"
  >
    <View className="flex-row items-center">
      <View className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center mr-3">
        <Ionicons name={icon} size={20} color="#4f46e5" />
      </View>
      <Text className="text-base font-semibold text-gray-800 dark:text-gray-200">{title}</Text>
    </View>
    <View className="flex-row items-center">
      {badge !== undefined && badge > 0 && (
        <View className="bg-indigo-600 w-6 h-6 rounded-full items-center justify-center mr-2">
          <Text className="text-white text-xs font-bold">{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </View>
  </TouchableOpacity>
);

const SettingToggle = ({ icon, title, value, onValueChange, iconColor = "#4f46e5" }: { icon: keyof typeof Ionicons.glyphMap, title: string, value: boolean, onValueChange: (v: boolean) => void, iconColor?: string }) => (
  <View className="flex-row items-center justify-between py-4 border-b border-border">
    <View className="flex-row items-center">
      <View className="w-10 h-10 rounded-full bg-surface items-center justify-center mr-3">
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text className="text-base font-semibold text-gray-800 dark:text-gray-200">{title}</Text>
    </View>
    <Switch 
      value={value} 
      onValueChange={onValueChange} 
      trackColor={{ false: '#d1d5db', true: '#818cf8' }}
      thumbColor={value ? '#4f46e5' : '#f3f4f6'}
    />
  </View>
);

export default function ProfileScreen() {
  const { signOut, isLoaded: authLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  
  const { colorScheme, setColorScheme } = useColorScheme();
  const { theme, setTheme } = useThemeStore();
  const { useBiometrics, setUseBiometrics, loadBiometricPreference } = useAuthStore();
  
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);

  const { getComputed } = useCartStore();
  const { itemCount } = getComputed();

  useEffect(() => {
    loadBiometricPreference();
    
    apiClient.get<ApiResponse<Order[]>>('/user/orders')
      .then(res => {
        const orders = res.data.data || [];
        setStats({
          totalOrders: orders.length,
          totalSpent: orders.reduce((sum, order) => sum + order.total, 0),
          cartItems: 0 // Will use the store's computed value directly
        });
      })
      .catch(err => console.error('Failed to load orders for stats', err))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleTheme = (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    setTheme(newTheme);
    setColorScheme(newTheme);
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  if (!authLoaded) {
    return <View className="flex-1 bg-background items-center justify-center"><ActivityIndicator color="#4f46e5" /></View>;
  }

  if (!isSignedIn) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-6">
        <Ionicons name="lock-closed-outline" size={64} color="#9ca3af" />
        <Text className="text-xl font-bold mt-4 text-text-primary">Sign In Required</Text>
        <Text className="text-text-secondary mt-2 text-center">Please log in to view your profile and settings.</Text>
        <TouchableOpacity 
          onPress={() => router.push('/(auth)/login')}
          className="mt-6 bg-indigo-600 px-8 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const memberSince = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  return (
    <ScrollView className="flex-1 bg-background pt-12" showsVerticalScrollIndicator={false}>
      
      {/* Profile Header */}
      <View className="items-center px-4 pt-6 pb-8 bg-surface border-b border-border shadow-sm">
        <View className="relative">
          {user?.imageUrl ? (
            <Image source={{ uri: user.imageUrl }} className="w-24 h-24 rounded-full bg-gray-200" />
          ) : (
            <View className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center">
              <Text className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {user?.firstName?.charAt(0) || 'U'}
              </Text>
            </View>
          )}
          <TouchableOpacity className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full items-center justify-center border-2 border-white border-border shadow-sm">
            <Ionicons name="camera" size={14} color="white" />
          </TouchableOpacity>
        </View>
        
        <Text className="text-2xl font-extrabold text-text-primary mt-4">
          {user?.fullName || 'User Profile'}
        </Text>
        <Text className="text-text-secondary mt-1">
          {user?.primaryEmailAddress?.emailAddress || 'user@example.com'}
        </Text>
        <View className="bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full mt-3">
          <Text className="text-indigo-600 dark:text-indigo-400 text-xs font-bold">
            Member since {memberSince}
          </Text>
        </View>

        <TouchableOpacity className="mt-6 w-40 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 py-2.5 rounded-full shadow-sm items-center">
          <Text className="text-text-primary font-bold text-sm">Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 py-6 pb-20 space-y-6">
        
        {/* Statistics */}
        <View className="flex-row justify-between bg-surface rounded-2xl p-4 shadow-sm border border-border">
          {loading ? (
            <>
              <View className="items-center flex-1"><View className="w-10 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" /><View className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></View>
              <View className="w-px bg-gray-200 dark:bg-gray-700 mx-2" />
              <View className="items-center flex-1"><View className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" /><View className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></View>
              <View className="w-px bg-gray-200 dark:bg-gray-700 mx-2" />
              <View className="items-center flex-1"><View className="w-10 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" /><View className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></View>
            </>
          ) : (
            <>
              <View className="items-center flex-1">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="cube" size={14} color="#4f46e5" className="mr-1" />
                  <Text className="text-xl font-extrabold text-text-primary">{stats?.totalOrders || 0}</Text>
                </View>
                <Text className="text-xs text-text-secondary font-medium">Orders</Text>
              </View>
              <View className="w-px bg-gray-100 dark:bg-gray-700 mx-2" />
              <View className="items-center flex-1">
                <Text className="text-xl font-extrabold text-text-primary mb-1">₹{stats?.totalSpent?.toFixed(0) || 0}</Text>
                <Text className="text-xs text-text-secondary font-medium">Spent</Text>
              </View>
              <View className="w-px bg-gray-100 dark:bg-gray-700 mx-2" />
              <View className="items-center flex-1">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="cart" size={14} color="#4f46e5" className="mr-1" />
                  <Text className="text-xl font-extrabold text-text-primary">{itemCount || 0}</Text>
                </View>
                <Text className="text-xs text-text-secondary font-medium">In Cart</Text>
              </View>
            </>
          )}
        </View>

        {/* Quick Links */}
        <View className="bg-surface rounded-2xl p-4 shadow-sm border border-border">
          <Text className="text-sm font-bold text-gray-400 dark:text-text-secondary uppercase tracking-wider mb-2">My Account</Text>
          <QuickLink icon="cube-outline" title="My Orders" onPress={() => router.push('/(tabs)/orders')} badge={stats?.totalOrders} />
          <QuickLink icon="cart-outline" title="My Cart" onPress={() => router.push('/(tabs)/cart')} badge={itemCount} />
          <QuickLink icon="heart-outline" title="Wishlist" />
          <QuickLink icon="location-outline" title="Saved Addresses" />
          <QuickLink icon="card-outline" title="Payment Methods" />
        </View>

        {/* App Settings */}
        <View className="bg-surface rounded-2xl p-4 shadow-sm border border-border">
          <Text className="text-sm font-bold text-gray-400 dark:text-text-secondary uppercase tracking-wider mb-2">App Settings</Text>
          <SettingToggle 
            icon="moon-outline" 
            title="Dark Mode" 
            value={colorScheme === 'dark' || theme === 'dark'} 
            onValueChange={handleToggleTheme} 
            iconColor="#6366f1"
          />
          <SettingToggle 
            icon="finger-print-outline" 
            title="Biometric Login" 
            value={useBiometrics} 
            onValueChange={setUseBiometrics}
            iconColor="#10b981"
          />
          <SettingToggle 
            icon="notifications-outline" 
            title="Push Notifications" 
            value={pushEnabled} 
            onValueChange={setPushEnabled}
            iconColor="#f59e0b"
          />
          <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-border">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-surface items-center justify-center mr-3">
                <Ionicons name="language-outline" size={20} color="#ec4899" />
              </View>
              <Text className="text-base font-semibold text-gray-800 dark:text-gray-200">Language</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-text-secondary mr-2 font-medium">English (US)</Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View className="bg-surface rounded-2xl p-4 shadow-sm border border-border">
          <Text className="text-sm font-bold text-gray-400 dark:text-text-secondary uppercase tracking-wider mb-2">Support & About</Text>
          <QuickLink icon="help-buoy-outline" title="Contact Support" onPress={() => Alert.alert('Support', 'Contacting support...')} />
          <QuickLink icon="document-text-outline" title="Privacy Policy" onPress={() => Linking.openURL('https://example.com/privacy')} />
          <QuickLink icon="shield-checkmark-outline" title="Terms of Service" onPress={() => Linking.openURL('https://example.com/terms')} />
          
          <View className="flex-row items-center justify-between py-4 pt-5">
            <Text className="text-text-secondary font-medium text-sm">App Version</Text>
            <Text className="text-gray-400 font-bold text-sm">v1.0.0 (Build 42)</Text>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity 
          onPress={handleSignOut}
          className="w-full py-4 rounded-xl border-2 border-red-500 items-center justify-center flex-row shadow-sm bg-background mt-2"
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" className="mr-2" />
          <Text className="text-red-500 font-bold text-lg ml-2">Sign Out</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}
