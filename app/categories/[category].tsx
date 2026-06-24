import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { apiClient } from '../../lib/api-client';
import { Product, Category, ApiResponse } from '../../types';
import { useCartStore } from '../../stores/useCartStore';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const CATEGORY_META: Record<string, { icon: string, colors: [string, string, ...string[]] }> = {
  'electronics': { icon: '⚡', colors: ['#f59e0b', '#fbbf24'] },
  'clothing': { icon: '👕', colors: ['#3b82f6', '#60a5fa'] },
  'men': { icon: '👔', colors: ['#2563eb', '#3b82f6'] },
  'women': { icon: '👗', colors: ['#db2777', '#f472b6'] },
  'accessories': { icon: '💎', colors: ['#8b5cf6', '#a78bfa'] },
  'shoes': { icon: '👟', colors: ['#ea580c', '#f97316'] },
  'home': { icon: '🏠', colors: ['#10b981', '#34d399'] },
  'beauty': { icon: '💄', colors: ['#ec4899', '#f472b6'] },
  'books': { icon: '📚', colors: ['#f97316', '#fb923c'] },
  'toys': { icon: '🧸', colors: ['#ef4444', '#f87171'] },
  'kids': { icon: '🧸', colors: ['#ef4444', '#f87171'] },
  'default': { icon: '📦', colors: ['#6b7280', '#9ca3af'] }
};

export default function CategoryDetailScreen() {
  const { category: categorySlug } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const { addToCart } = useCartStore();
  
  const [categoryObj, setCategoryObj] = useState<Category | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const [sortOption, setSortOption] = useState('latest');
  const [isSortModalVisible, setSortModalVisible] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const sortOptions = [
    { label: 'Latest', value: 'latest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Most Popular', value: 'popular' },
  ];

  const meta = CATEGORY_META[categorySlug?.toLowerCase() || 'default'] || CATEGORY_META['default'];

  // Fetch category info first
  useEffect(() => {
    apiClient.get<ApiResponse<Category[]>>('/categories').then(res => {
      const found = res.data.data?.find(c => c.slug === categorySlug);
      if (found) setCategoryObj(found);
    }).catch(err => console.error('Failed to load category', err));
  }, [categorySlug]);

  const fetchProducts = useCallback(async (pageNum: number, isRefresh = false) => {
    if (!categorySlug) return;
    try {
      if (pageNum === 1 && !isRefresh) setLoading(true);
      
      const params = new URLSearchParams({
        category: categorySlug,
        page: pageNum.toString(),
        limit: '20',
        sort: sortOption,
      });
      if (debouncedSearch) params.append('search', debouncedSearch);
      
      const res = await apiClient.get<ApiResponse<Product[]>>(`/products?${params.toString()}`);
      const newProducts = res.data.data || [];
      
      if (isRefresh || pageNum === 1) {
        setProducts(newProducts);
      } else {
        setProducts(prev => [...prev, ...newProducts]);
      }
      
      setHasMore(newProducts.length >= 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load category products', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, sortOption, categorySlug]);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(1, true);
  };

  const loadMore = () => {
    if (!loading && !refreshing && hasMore) {
      fetchProducts(page + 1);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      onPress={() => router.push(`/product/${item.id}`)}
      className="flex-1 m-2 bg-surface rounded-2xl shadow-sm border border-border overflow-hidden"
    >
      <View className="relative h-48 w-full bg-background">
        <Image 
          source={{ uri: item.images?.[0] || 'https://via.placeholder.com/200' }} 
          className="w-full h-full" 
          resizeMode="cover" 
        />
        
        <TouchableOpacity className="absolute top-2 right-2 w-8 h-8 bg-white/80 rounded-full items-center justify-center shadow-sm">
          <Ionicons name="heart-outline" size={18} color="#ef4444" />
        </TouchableOpacity>

        {item.compareAtPrice && item.compareAtPrice > item.price && (
          <View className="absolute top-2 left-2 bg-red-500 px-2 py-1 rounded-md shadow-sm">
            <Text className="text-white text-[10px] font-bold">
              -{Math.round((1 - item.price / item.compareAtPrice) * 100)}%
            </Text>
          </View>
        )}
      </View>

      <View className="p-3 flex-1 justify-between">
        <View>
          <Text className="text-sm font-semibold text-text-primary" numberOfLines={2}>
            {item.name}
          </Text>
        </View>

        <View className="mt-2">
          <View className="flex-row items-center mb-1">
            <Ionicons name="star" size={12} color="#fbbf24" />
            <Text className="text-xs text-text-secondary ml-1">
              {item.rating || '4.5'} ({item.reviewCount || 0})
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-base font-bold text-text-primary">
                ₹{item.price.toFixed(2)}
              </Text>
              {item.compareAtPrice && (
                <Text className="text-xs text-gray-400 line-through">
                  ₹{item.compareAtPrice.toFixed(2)}
                </Text>
              )}
            </View>
            <TouchableOpacity 
              onPress={() => addToCart(item, 1)}
              className="bg-indigo-600 w-8 h-8 rounded-full items-center justify-center shadow-sm"
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View className="mb-4">
      {/* Banner */}
      <LinearGradient
        colors={meta.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-3xl p-6 mx-2 mb-4 items-center flex-row shadow-md"
      >
        <View className="bg-white/20 w-16 h-16 rounded-full items-center justify-center mr-4">
          <Text className="text-4xl">{meta.icon}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-white text-2xl font-extrabold">{categoryObj?.name || categorySlug}</Text>
          <Text className="text-white/80 font-medium">Explore the best of {categoryObj?.name || categorySlug}</Text>
        </View>
      </LinearGradient>

      {/* Controls */}
      <View className="px-2 flex-row items-center space-x-3 mb-2">
        <View className="flex-1 flex-row items-center bg-surface rounded-xl h-12 px-4 shadow-sm border border-border">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-sm text-text-primary"
            placeholder={`Search in ${categoryObj?.name || 'category'}...`}
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#d1d5db" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          onPress={() => setSortModalVisible(true)}
          className="h-12 px-4 bg-surface rounded-xl flex-row items-center justify-center shadow-sm border border-border"
        >
          <Ionicons name="swap-vertical" size={16} color="#4f46e5" />
          <Text className="ml-2 font-medium text-text-secondary text-sm">Sort</Text>
        </TouchableOpacity>
      </View>
      
      <Text className="px-3 text-xs text-text-secondary font-medium mt-2">
        Showing {products.length} {products.length === 1 ? 'product' : 'products'}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background pt-12">
      {/* Breadcrumb Header */}
      <View className="px-4 pb-2 flex-row items-center space-x-2">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-surface items-center justify-center shadow-sm mr-2"
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" className="text-text-primary" />
        </TouchableOpacity>
        <Text className="text-text-secondary font-medium">Home</Text>
        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        <Text className="text-text-secondary font-medium">Categories</Text>
        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
        <Text className="text-text-primary font-bold">{categoryObj?.name || categorySlug}</Text>
      </View>

      <View className="flex-1 px-2">
        <FlashList
          data={products}
          ListHeaderComponent={renderHeader}
          renderItem={renderProduct}
          estimatedItemSize={280}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
          }
          ListEmptyComponent={
            !loading ? (
              <View className="items-center justify-center py-20 px-8">
                <Ionicons name="sad-outline" size={64} color="#d1d5db" />
                <Text className="text-lg font-bold text-text-primary mt-4 text-center">No products found</Text>
                <Text className="text-text-secondary mt-2 text-center">Try adjusting your search criteria within this category.</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            loading ? (
              <View className="py-8 items-center">
                <ActivityIndicator color="#4f46e5" />
              </View>
            ) : <View className="h-20" />
          }
        />
      </View>

      {/* Sort Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View className="bg-background rounded-t-3xl p-6" onStartShouldSetResponder={() => true}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-text-primary">Sort By</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            
            {sortOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  setSortOption(opt.value);
                  setSortModalVisible(false);
                }}
                className={`py-4 flex-row justify-between items-center border-b border-border ${opt.value === sortOption ? 'bg-indigo-50 dark:bg-indigo-900/10 -mx-6 px-6' : ''}`}
              >
                <Text className={`text-base ${opt.value === sortOption ? 'text-indigo-600 font-bold' : 'text-text-secondary'}`}>
                  {opt.label}
                </Text>
                {opt.value === sortOption && <Ionicons name="checkmark" size={20} color="#4f46e5" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
