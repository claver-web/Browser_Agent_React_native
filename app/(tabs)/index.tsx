import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Easing, Dimensions, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import { useQuery } from '../../hooks/useApi';
import { Category, Product } from '../../types';
import { useCartStore } from '../../stores/useCartStore';
import { trackEvent } from '../../components/ActivityTracker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const AnimatedNumber = ({ endValue, label, suffix = '', duration = 2000 }: { endValue: number, label: string, suffix?: string, duration?: number }) => {
  const [value, setValue] = useState(0);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: endValue,
      duration,
      useNativeDriver: false,
    }).start();

    const listener = animation.addListener((v) => {
      setValue(Math.floor(v.value));
    });

    return () => animation.removeListener(listener);
  }, [endValue, animation]);

  return (
    <View className="items-center flex-1">
      <Text className="text-2xl font-bold text-text-primary">
        {value}{suffix}
      </Text>
      <Text className="text-xs text-text-secondary mt-1 text-center font-medium">{label}</Text>
    </View>
  );
};

const getCategoryEmoji = (name: string) => {
  const map: Record<string, string> = {
    'Men': '👨', 'Women': '👩', 'Kids': '👶', 'Accessories': '🎒', 
    'Shoes': '👟', 'Electronics': '📱', 'Home': '🏠', 'Beauty': '💄',
    'Sports': '⚽', 'Books': '📚', 'Toys': '🧸'
  };
  return map[name] || '🛍️';
};

const TrustBadges = () => {
  const badges = [
    { icon: 'car-outline', text: 'Free Shipping' },
    { icon: 'lock-closed-outline', text: 'Secure Payment' },
    { icon: 'headset-outline', text: '24/7 Support' },
    { icon: 'refresh-outline', text: 'Easy Returns' },
  ];

  return (
    <View className="flex-row justify-between px-4 py-8 bg-surface/50 mt-6 rounded-2xl mx-4 mb-6 shadow-sm border border-border">
      {badges.map((badge, idx) => (
        <View key={idx} className="items-center flex-1">
          <View className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center mb-2">
            <Ionicons name={badge.icon as any} size={20} color="#4f46e5" />
          </View>
          <Text className="text-[10px] text-center text-text-secondary font-medium">
            {badge.text}
          </Text>
        </View>
      ))}
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const { addToCart } = useCartStore();
  const [email, setEmail] = useState('');

  // Fetch data using hooks from Step 1
  const { data: categories, loading: categoriesLoading, refetch: refetchCategories } = useQuery<Category[]>('/categories');
  const { data: featuredProducts, loading: productsLoading, refetch: refetchProducts } = useQuery<Product[]>('/products?featured=true&limit=8');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchCategories(), refetchProducts()]);
    setRefreshing(false);
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSubscribe = () => {
    if (!email) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    Alert.alert('Success', 'You have successfully subscribed to our newsletter!');
    setEmail('');
  };

  const carouselImages = [
    'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&q=80',
  ];

  return (
    <ScrollView 
      className="flex-1 bg-background" 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        
        {/* Hero Section */}
        <View className="relative h-80 w-full mb-6">
          <ScrollView 
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            className="w-full h-full"
          >
            {carouselImages.map((img, index) => (
              <View key={index} style={{ width, height: 320 }}>
                <Image source={img} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
                <LinearGradient
                  colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
                  className="absolute inset-0"
                />
              </View>
            ))}
          </ScrollView>
          <View className="absolute inset-0 items-center justify-center px-6">
            <Text className="text-4xl font-extrabold text-white text-center tracking-tight shadow-md">
              ShopAI
            </Text>
            <Text className="text-xl text-indigo-200 mt-2 text-center font-medium shadow-sm">
              Premium Fashion & Lifestyle
            </Text>
            <TouchableOpacity 
              onPress={() => router.push('/products')}
              className="mt-8 bg-white dark:bg-indigo-600 px-8 py-3 rounded-full shadow-lg flex-row items-center active:opacity-80"
            >
              <Text className="text-indigo-900 text-text-primary font-bold text-base mr-2">Shop Now</Text>
              <Ionicons name="arrow-forward" size={18} color="#312e81" className="text-text-primary" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics Bar */}
        <View className="flex-row justify-around py-6 px-4 bg-background border-b border-border mx-4 rounded-2xl shadow-sm mb-8">
          <AnimatedNumber endValue={2500} label="Products" suffix="+" duration={2000} />
          <View className="w-px h-10 bg-gray-200 dark:bg-gray-700 mx-2" />
          <AnimatedNumber endValue={10} label="Happy Customers" suffix="K+" duration={2500} />
          <View className="w-px h-10 bg-gray-200 dark:bg-gray-700 mx-2" />
          <AnimatedNumber endValue={24} label="Support" suffix="/7" duration={1500} />
        </View>

        {/* Category Grid */}
        <View className="px-5 mb-10">
          <View className="flex-row justify-between items-end mb-4">
            <Text className="text-2xl font-bold text-text-primary">Shop by Category</Text>
            <TouchableOpacity onPress={() => router.push('/categories')}>
              <Text className="text-indigo-600 dark:text-indigo-400 font-medium">View All</Text>
            </TouchableOpacity>
          </View>
          
          {categoriesLoading ? (
            <ActivityIndicator size="large" color="#4f46e5" className="my-10" />
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {categories?.slice(0, 8).map((cat, index) => (
                <TouchableOpacity 
                  key={cat.id || index}
                  onPress={() => router.push(`/categories/${cat.slug || cat.name}`)}
                  className="w-[48%] mb-4 rounded-2xl overflow-hidden shadow-sm active:opacity-90"
                >
                  <LinearGradient
                    colors={['#f8fafc', '#e2e8f0']}
                    className="p-5 items-center justify-center border border-gray-100 dark:border-none bg-surface"
                  >
                    <Text className="text-4xl mb-3 shadow-sm">{getCategoryEmoji(cat.name)}</Text>
                    <Text className="text-gray-800 font-bold text-center">{cat.name}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Featured Products */}
        <View className="px-5 mb-6">
          <View className="flex-row justify-between items-end mb-4">
            <Text className="text-2xl font-bold text-text-primary">Featured</Text>
            <TouchableOpacity onPress={() => router.push('/products')}>
              <Text className="text-indigo-600 dark:text-indigo-400 font-medium">View All</Text>
            </TouchableOpacity>
          </View>
          
          {productsLoading ? (
            <ActivityIndicator size="large" color="#4f46e5" className="my-10" />
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {featuredProducts?.slice(0, 8).map((product, index) => (
                <TouchableOpacity 
                  key={product.id || index}
                  onPress={() => router.push(`/product/${product.id}`)}
                  className="w-[48%] mb-5 bg-surface rounded-2xl shadow-md border border-border overflow-hidden"
                >
                  <View className="relative h-48 w-full">
                    <Image 
                      source={product.images?.[0] || 'https://via.placeholder.com/200'} 
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover" 
                      transition={200}
                    />
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <View className="absolute top-2 left-2 bg-red-500 px-2 py-1 rounded-md shadow-sm">
                        <Text className="text-white text-[10px] font-bold">
                          -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity 
                      className="absolute bottom-2 right-2 bg-white/90 bg-background/90 w-8 h-8 rounded-full items-center justify-center shadow-sm"
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        addToCart(product, 1);
                        trackEvent('add_to_cart', { productId: product.id, quantity: 1, price: product.price });
                        Toast.show({ type: 'success', text1: 'Added to Cart', text2: `1x ${product.name}` });
                      }}
                    >
                      <Ionicons name="cart" size={16} color="#4f46e5" />
                    </TouchableOpacity>
                  </View>
                  <View className="p-3">
                    <Text className="text-sm text-gray-800 dark:text-gray-100 font-medium" numberOfLines={1}>
                      {product.name}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="star" size={12} color="#fbbf24" />
                      <Text className="text-xs text-text-secondary ml-1">
                        {product.rating || '4.5'}
                      </Text>
                    </View>
                    <View className="flex-row items-end mt-2 space-x-2">
                      <Text className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                        ${product.price.toFixed(2)}
                      </Text>
                      {product.compareAtPrice && (
                        <Text className="text-xs text-gray-400 line-through mb-[2px]">
                          ${product.compareAtPrice.toFixed(2)}
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Trust Badges */}
        <TrustBadges />

        {/* Newsletter Section */}
        <View className="px-5 my-8">
          <View className="bg-indigo-600 rounded-3xl p-6 shadow-lg overflow-hidden relative">
            <View className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
            <View className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full" />
            
            <Text className="text-white text-xl font-bold mb-2">Join the Club</Text>
            <Text className="text-indigo-100 text-sm mb-4">Subscribe to our newsletter for exclusive offers, styling tips, and new arrivals.</Text>
            
            <View className="flex-row h-12 bg-white rounded-xl overflow-hidden shadow-sm">
              <TextInput 
                className="flex-1 px-4 text-gray-800"
                placeholder="Enter your email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={handleSubscribe}
                className="bg-indigo-900 px-5 justify-center items-center active:opacity-90"
              >
                <Text className="text-white font-bold">Subscribe</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View className="px-6 py-10 border-t border-border items-center">
          <Text className="text-2xl font-extrabold text-text-primary tracking-tighter">ShopAI</Text>
          <Text className="text-text-secondary mt-1 mb-6 text-sm text-center">Your premium destination for fashion, lifestyle, and more.</Text>
          
          <View className="flex-row justify-center space-x-6 w-full">
            <TouchableOpacity><Text className="text-gray-400 font-medium">About</Text></TouchableOpacity>
            <TouchableOpacity><Text className="text-gray-400 font-medium">Contact</Text></TouchableOpacity>
            <TouchableOpacity><Text className="text-gray-400 font-medium">Terms</Text></TouchableOpacity>
            <TouchableOpacity><Text className="text-gray-400 font-medium">Privacy</Text></TouchableOpacity>
          </View>
          
          <Text className="text-gray-400 text-xs mt-8">© 2026 ShopAI. All rights reserved.</Text>
        </View>
        
      </Animated.View>
    </ScrollView>
  );
}
