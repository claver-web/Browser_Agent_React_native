import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Animated, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiClient } from '../../lib/api-client';
import { Category, ApiResponse } from '../../types';

// Category mapping metadata
const CATEGORY_META: Record<string, { icon: string, colors: [string, string, ...string[]], desc: string }> = {
  'electronics': { icon: '⚡', colors: ['#f59e0b', '#fbbf24'], desc: 'Gadgets & Tech' },
  'clothing': { icon: '👕', colors: ['#3b82f6', '#60a5fa'], desc: 'Apparel & Fashion' },
  'men': { icon: '👔', colors: ['#2563eb', '#3b82f6'], desc: 'Men\'s Fashion' },
  'women': { icon: '👗', colors: ['#db2777', '#f472b6'], desc: 'Women\'s Fashion' },
  'accessories': { icon: '💎', colors: ['#8b5cf6', '#a78bfa'], desc: 'Jewelry & Watches' },
  'shoes': { icon: '👟', colors: ['#ea580c', '#f97316'], desc: 'Footwear' },
  'home': { icon: '🏠', colors: ['#10b981', '#34d399'], desc: 'Home & Kitchen' },
  'beauty': { icon: '💄', colors: ['#ec4899', '#f472b6'], desc: 'Cosmetics & Care' },
  'books': { icon: '📚', colors: ['#f97316', '#fb923c'], desc: 'Read & Learn' },
  'toys': { icon: '🧸', colors: ['#ef4444', '#f87171'], desc: 'Kids & Babies' },
  'kids': { icon: '🧸', colors: ['#ef4444', '#f87171'], desc: 'Kids & Babies' },
  'default': { icon: '📦', colors: ['#6b7280', '#9ca3af'], desc: 'Various items' }
};

const CategoryCard = ({ category, onPress }: { category: Category, onPress: () => void }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const meta = CATEGORY_META[category.slug.toLowerCase()] || CATEGORY_META['default'];

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  return (
    <View className="w-1/2 p-2">
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          className="rounded-3xl overflow-hidden shadow-sm"
          style={{ elevation: 3 }}
        >
          <LinearGradient
            colors={meta.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-5 min-h-[160px] flex-col justify-between"
          >
            <View className="bg-white/20 w-14 h-14 rounded-full items-center justify-center mb-3">
              <Text className="text-3xl">{meta.icon}</Text>
            </View>
            
            <View>
              <Text className="text-white font-extrabold text-lg mb-1">{category.name}</Text>
              <Text className="text-white/80 text-xs font-medium mb-2">{meta.desc}</Text>
              
              <View className="bg-white/20 self-start px-2 py-1 rounded-md">
                <Text className="text-white text-[10px] font-bold tracking-wider">
                  {Math.floor(Math.random() * 150) + 20} PRODUCTS
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const fetchCategories = () => {
    return apiClient.get<ApiResponse<Category[]>>('/categories')
      .then(res => {
        setCategories(res.data.data || []);
      })
      .catch(err => console.error('Failed to load categories', err));
  };

  useEffect(() => {
    fetchCategories().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCategories();
    setRefreshing(false);
  };

  return (
    <View className="flex-1 bg-background pt-12">
      <View className="px-4 pb-4 flex-row items-center justify-between">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-surface items-center justify-center shadow-sm"
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" className="text-text-primary" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-text-primary">Shop by Category</Text>
        <View className="w-10 h-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
        >
          <View className="flex-row flex-wrap">
            {categories.map(category => (
              <CategoryCard 
                key={category.id} 
                category={category} 
                onPress={() => router.push(`/categories/${category.slug}`)} 
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
