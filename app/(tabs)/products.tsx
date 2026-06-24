import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Dimensions, Modal, RefreshControl, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../lib/api-client';
import { Product, ApiResponse, Category } from '../../types';
import { useCartStore } from '../../stores/useCartStore';
import { trackEvent } from '../../components/ActivityTracker';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function ProductsScreen() {
  const router = useRouter();
  const { addToCart } = useCartStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
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

  useEffect(() => {
    apiClient.get<ApiResponse<Category[]>>('/categories').then(res => {
      setCategories(res.data.data || []);
    }).catch(err => console.error('Failed to load categories', err));
  }, []);

  const fetchProducts = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      if (pageNum === 1 && !isRefresh) setLoading(true);
      
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        sort: sortOption,
      });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (selectedCategory) params.append('category', selectedCategory);
      
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
      console.error('Failed to load products', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, selectedCategory, sortOption]);

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
          source={item.images?.[0] || 'https://via.placeholder.com/200'} 
          style={{ width: '100%', height: '100%' }}
          contentFit="cover" 
          transition={200}
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
          <Text className="text-[10px] uppercase font-bold text-indigo-500 mb-1">
            {categories.find(c => c.id === item.categoryId)?.name || 'Category'}
          </Text>
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
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                addToCart(item, 1);
                trackEvent('add_to_cart', { productId: item.id, quantity: 1, price: item.price });
                Toast.show({ type: 'success', text1: 'Added to Cart', text2: `1x ${item.name}` });
              }}
              className="bg-indigo-600 w-8 h-8 rounded-full items-center justify-center shadow-sm"
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSkeleton = () => (
    <View className="flex-row flex-wrap px-2">
      {[1, 2, 3, 4].map(i => (
        <View key={i} className="w-[50%] p-2">
          <View className="bg-surface rounded-2xl h-72 shadow-sm border border-gray-100 overflow-hidden opacity-70">
            <View className="h-48 bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <View className="p-3">
              <View className="h-3 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
              <View className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
              <View className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View className="flex-1 bg-background pt-12">
      <View className="px-4 pb-3 flex-row items-center space-x-3">
        <View className="flex-1 flex-row items-center bg-surface rounded-full h-12 px-4 shadow-sm border border-border">
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-2 text-base text-text-primary"
            placeholder="Search products..."
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
          className="w-12 h-12 bg-surface rounded-full items-center justify-center shadow-sm border border-border"
        >
          <Ionicons name="filter" size={20} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      <View className="h-14">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          className="px-4"
          contentContainerStyle={{ alignItems: 'center' }}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategory(null)}
            className={`px-5 py-2 rounded-full mr-2 border ${!selectedCategory ? 'bg-indigo-600 border-indigo-600' : 'bg-surface border-border'}`}
          >
            <Text className={`font-medium ${!selectedCategory ? 'text-white' : 'text-text-secondary'}`}>All</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setSelectedCategory(cat.slug)}
              className={`px-5 py-2 rounded-full mr-2 border ${selectedCategory === cat.slug ? 'bg-indigo-600 border-indigo-600' : 'bg-surface border-border'}`}
            >
              <Text className={`font-medium ${selectedCategory === cat.slug ? 'text-white' : 'text-text-secondary'}`}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && page === 1 ? (
        renderSkeleton()
      ) : products.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="search-outline" size={80} color="#d1d5db" />
          <Text className="text-xl font-bold text-text-primary mt-4 text-center">No products found</Text>
          <Text className="text-text-secondary mt-2 text-center">We couldn't find anything matching your criteria.</Text>
          <TouchableOpacity 
            onPress={() => {
              setSearchQuery('');
              setSelectedCategory(null);
            }}
            className="mt-6 bg-indigo-100 dark:bg-indigo-900/30 px-6 py-3 rounded-full"
          >
            <Text className="text-indigo-600 dark:text-indigo-400 font-bold">Clear Filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-1 px-2" style={{ minHeight: 200 }}>
          <FlashList
            data={products}
            renderItem={renderProduct}
            estimatedItemSize={280}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
            }
            ListFooterComponent={
              loading && page > 1 ? (
                <View className="py-4 items-center">
                  <ActivityIndicator color="#4f46e5" />
                </View>
              ) : null
            }
          />
        </View>
      )}

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
