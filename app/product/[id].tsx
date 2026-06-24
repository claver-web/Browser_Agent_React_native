import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, FlatList, Modal, Alert, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { apiClient } from '../../lib/api-client';
import { Product, Review, Comment as CommentType, ApiResponse } from '../../types';
import { useCartStore } from '../../stores/useCartStore';
import { trackEvent } from '../../components/ActivityTracker';

const { width } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Image Gallery Component
// ---------------------------------------------------------------------------
const ImageGallery = ({ images }: { images: string[] }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setActiveIndex(index);
  };

  if (!images || images.length === 0) {
    return (
      <View className="h-[350px] w-full bg-gray-200 bg-surface items-center justify-center">
        <Ionicons name="image-outline" size={48} color="#9ca3af" />
      </View>
    );
  }

  return (
    <View className="relative h-[350px] w-full bg-background">
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <Image
            source={item}
            style={{ width, height: 350 }}
            contentFit="cover"
            transition={300}
          />
        )}
      />
      {images.length > 1 && (
        <View className="absolute bottom-4 w-full flex-row justify-center space-x-2">
          {images.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${activeIndex === index ? 'w-6 bg-indigo-600' : 'w-2 bg-gray-300 dark:bg-gray-600'}`}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main Product Screen Component
// ---------------------------------------------------------------------------
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { addToCart } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<CommentType[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  
  // Review Modal State
  const [isReviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Comment State
  const [newCommentContent, setNewCommentContent] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isBuyLoading, setIsBuyLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchProductDetails = async () => {
      try {
        const [prodRes, revRes, comRes, relRes] = await Promise.all([
          apiClient.get<ApiResponse<Product>>(`/products/${id}`),
          apiClient.get<ApiResponse<Review[]>>(`/products/${id}/reviews`),
          apiClient.get<ApiResponse<CommentType[]>>(`/products/${id}/comments`),
          apiClient.get<ApiResponse<Product[]>>(`/products?limit=5`)
        ]);

        setProduct(prodRes.data.data);
        setReviews(revRes.data.data || []);
        setComments(comRes.data.data || []);
        
        // Track product view
        if (prodRes.data.data) {
          trackEvent('product_view', { productId: id, productName: prodRes.data.data.name });
        }
        
        // Filter related products to exclude current one and match category if possible
        let related = relRes.data.data || [];
        if (prodRes.data.data) {
           related = related.filter(p => p.id !== id && p.categoryId === prodRes.data.data.categoryId);
        }
        setRelatedProducts(related);

      } catch (error) {
        console.error('Error fetching product details:', error);
        Alert.alert('Error', 'Failed to load product details.');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCartLoading(true);
    try {
      await addToCart(product!, quantity);
      trackEvent('add_to_cart', { productId: product.id, quantity, price: product.price });
      Toast.show({
        type: 'success',
        text1: 'Added to Cart',
        text2: `${quantity}x ${product.name}`,
      });
    } finally {
      setIsCartLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsBuyLoading(true);
    try {
      await addToCart(product!, quantity);
      trackEvent('add_to_cart', { productId: product.id, quantity, price: product.price, isBuyNow: true });
      router.push('/checkout');
    } finally {
      setIsBuyLoading(false);
    }
  };

  const submitReview = async () => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please log in to submit a review.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log In', onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }

    if (!reviewContent.trim()) {
      Alert.alert('Error', 'Please enter a review comment.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await apiClient.post<ApiResponse<Review>>(`/products/${id}/reviews`, {
        rating: reviewRating,
        content: reviewContent
      });
      setReviews([res.data.data, ...reviews]);
      trackEvent('review', { productId: id, rating: reviewRating });
      setReviewModalVisible(false);
      setReviewContent('');
      setReviewRating(5);
      Toast.show({ type: 'success', text1: 'Review Submitted', text2: 'Thank you for your feedback!' });
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const submitComment = async () => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please log in to comment.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log In', onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }

    if (!newCommentContent.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await apiClient.post<ApiResponse<CommentType>>(`/products/${id}/comments`, {
        content: newCommentContent,
        parentId: replyingToId
      });
      setComments([...comments, res.data.data]);
      trackEvent('comment', { productId: id, isReply: !!replyingToId });
      setNewCommentContent('');
      setReplyingToId(null);
      Toast.show({ type: 'success', text1: 'Comment Posted' });
    } catch (error) {
      Alert.alert('Error', 'Failed to post comment.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-xl font-bold text-text-primary">Product not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 p-3 bg-indigo-100 rounded-lg">
          <Text className="text-indigo-600 font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Build comment tree
  const rootComments = comments.filter(c => !c.parentId);
  const repliesMap = comments.reduce((acc, c) => {
    if (c.parentId) {
      if (!acc[c.parentId]) acc[c.parentId] = [];
      acc[c.parentId].push(c);
    }
    return acc;
  }, {} as Record<string, CommentType[]>);

  const CommentNode = ({ comment, isReply = false }: { comment: CommentType, isReply?: boolean }) => {
    const replies = repliesMap[comment.id] || [];
    const [showReplies, setShowReplies] = useState(false);

    return (
      <View className={`mb-4 ${isReply ? 'ml-8 border-l-2 border-border pl-4 mt-2' : ''}`}>
        <View className="flex-row justify-between items-start mb-1">
          <View className="flex-row items-center">
            <View className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center mr-2">
              <Text className="text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                {comment.user?.firstName?.charAt(0) || 'U'}
              </Text>
            </View>
            <View>
              <Text className="font-bold text-text-primary text-sm">
                {comment.user?.firstName} {comment.user?.lastName || ''}
              </Text>
              <Text className="text-xs text-text-secondary">
                {new Date(comment.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
        
        <Text className="text-text-secondary text-sm mt-1 mb-2">{comment.content}</Text>
        
        <View className="flex-row items-center space-x-4">
          <TouchableOpacity onPress={() => setReplyingToId(comment.id)}>
            <Text className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Reply</Text>
          </TouchableOpacity>
          {replies.length > 0 && !showReplies && (
            <TouchableOpacity onPress={() => setShowReplies(true)}>
              <Text className="text-xs text-text-secondary flex-row items-center">
                View {replies.length} replies
              </Text>
            </TouchableOpacity>
          )}
          {showReplies && (
            <TouchableOpacity onPress={() => setShowReplies(false)}>
              <Text className="text-xs text-text-secondary">Hide replies</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Reply Input Box */}
        {replyingToId === comment.id && (
          <View className="mt-3 flex-row items-center border border-border rounded-xl p-1 bg-surface">
            <TextInput
              className="flex-1 px-3 py-2 text-sm text-text-primary"
              placeholder={`Replying to ${comment.user?.firstName}...`}
              placeholderTextColor="#9ca3af"
              value={newCommentContent}
              onChangeText={setNewCommentContent}
              autoFocus
            />
            <TouchableOpacity 
              onPress={submitComment}
              disabled={isSubmittingComment}
              className="bg-indigo-600 px-4 py-2 rounded-lg"
            >
              {isSubmittingComment ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-bold text-xs">Post</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReplyingToId(null)} className="p-2">
              <Ionicons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        )}

        {showReplies && (
          <View className="mt-2">
            {replies.map(reply => (
              <CommentNode key={reply.id} comment={reply} isReply />
            ))}
          </View>
        )}
      </View>
    );
  };

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : product.rating || '0.0';

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      className="flex-1 bg-background"
    >
      {/* Header Bar */}
      <View className="absolute top-0 w-full z-10 flex-row justify-between items-center px-4 pt-14 pb-2">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/80 dark:bg-black/50 items-center justify-center shadow-sm"
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" className="text-text-primary" />
        </TouchableOpacity>
        <TouchableOpacity className="w-10 h-10 rounded-full bg-white/80 dark:bg-black/50 items-center justify-center shadow-sm">
          <Ionicons name="heart-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Image Gallery */}
        <ImageGallery images={product.images || []} />

        <View className="p-5">
          {/* Header Section */}
          <View className="mb-4">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                {product.category && (
                  <Text className="text-xs uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                    {product.category.name}
                  </Text>
                )}
                <Text className="text-2xl font-extrabold text-text-primary leading-tight">
                  {product.name}
                </Text>
              </View>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <View className="bg-red-500 px-2 py-1 rounded-md shadow-sm ml-2">
                  <Text className="text-white text-xs font-bold">
                    -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
                  </Text>
                </View>
              )}
            </View>
            
            <View className="flex-row justify-between items-center mt-2">
              <View className="flex-row items-center space-x-2">
                <Text className="text-3xl font-extrabold text-text-primary">
                  ₹{product.price.toFixed(2)}
                </Text>
                {product.compareAtPrice && (
                  <Text className="text-lg text-gray-400 line-through">
                    ₹{product.compareAtPrice.toFixed(2)}
                  </Text>
                )}
              </View>
              
              <View className="flex-row items-center bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-full">
                <Ionicons name="star" size={16} color="#fbbf24" />
                <Text className="ml-1 text-sm font-bold text-gray-800 dark:text-gray-200">{avgRating}</Text>
                <Text className="text-xs text-text-secondary ml-1">({reviews.length})</Text>
              </View>
            </View>
          </View>

          <View className="h-px bg-surface my-4" />

          {/* Description */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-text-primary mb-2">Description</Text>
            <Text 
              className="text-text-secondary text-base leading-relaxed"
              numberOfLines={isDescriptionExpanded ? undefined : 3}
            >
              {product.description}
            </Text>
            <TouchableOpacity onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="mt-2">
              <Text className="text-indigo-600 dark:text-indigo-400 font-semibold">
                {isDescriptionExpanded ? 'Read Less' : 'Read More'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-bold text-text-primary mb-3">Specifications</Text>
              <View className="border border-border rounded-xl overflow-hidden">
                {Object.entries(product.specifications).map(([key, value], index) => (
                  <View 
                    key={key} 
                    className={`flex-row p-3 ${index % 2 === 0 ? 'bg-surface' : 'bg-background'} ${index !== Object.entries(product.specifications!).length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <Text className="w-1/3 text-text-secondary font-medium">{key}</Text>
                    <Text className="w-2/3 text-text-primary font-medium">{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View className="h-px bg-surface my-4" />

          {/* Reviews Section */}
          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-text-primary">Customer Reviews</Text>
              <TouchableOpacity onPress={() => setReviewModalVisible(true)}>
                <Text className="text-indigo-600 dark:text-indigo-400 font-bold">Write a Review</Text>
              </TouchableOpacity>
            </View>

            {reviews.length === 0 ? (
              <Text className="text-text-secondary text-center py-4">No reviews yet. Be the first to review!</Text>
            ) : (
              reviews.map(review => (
                <View key={review.id} className="bg-surface rounded-2xl p-4 mb-3 border border-border">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-row items-center">
                      <View className="flex-row mr-2">
                        {[1,2,3,4,5].map(star => (
                          <Ionicons key={star} name={star <= review.rating ? "star" : "star-outline"} size={14} color="#fbbf24" />
                        ))}
                      </View>
                      <Text className="font-bold text-text-primary text-sm">{review.user?.firstName}</Text>
                      {review.isVerifiedPurchase && (
                        <View className="flex-row items-center ml-2 bg-green-100 px-1.5 py-0.5 rounded">
                          <Ionicons name="checkmark-circle" size={10} color="#16a34a" />
                          <Text className="text-[10px] text-green-700 font-bold ml-1">Verified</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  {review.title && <Text className="font-bold text-text-primary mb-1">{review.title}</Text>}
                  <Text className="text-text-secondary text-sm leading-relaxed">{review.content}</Text>
                </View>
              ))
            )}
          </View>

          <View className="h-px bg-surface my-4" />

          {/* Comments Section */}
          <View className="mb-8">
            <Text className="text-xl font-bold text-text-primary mb-4">Questions & Answers</Text>
            
            {/* Top Level Add Comment */}
            {!replyingToId && (
              <View className="mb-6 flex-row items-center border border-border rounded-xl p-1 bg-surface">
                <TextInput
                  className="flex-1 px-4 py-3 text-sm text-text-primary"
                  placeholder="Ask a question..."
                  placeholderTextColor="#9ca3af"
                  value={newCommentContent}
                  onChangeText={setNewCommentContent}
                />
                <TouchableOpacity 
                  onPress={submitComment}
                  disabled={isSubmittingComment}
                  className="bg-indigo-600 px-5 py-3 rounded-lg"
                >
                  {isSubmittingComment ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-bold text-sm">Ask</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {rootComments.length === 0 ? (
              <Text className="text-text-secondary text-center py-4">No questions yet. Ask the community!</Text>
            ) : (
              rootComments.map(comment => (
                <CommentNode key={comment.id} comment={comment} />
              ))
            )}
          </View>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <View className="mb-10">
              <Text className="text-xl font-bold text-text-primary mb-4">You Might Also Like</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
                {relatedProducts.map((item) => (
                  <TouchableOpacity 
                    key={item.id}
                    onPress={() => router.push(`/product/${item.id}`)}
                    className="w-40 mr-4 bg-surface rounded-2xl shadow-sm border border-border overflow-hidden"
                  >
                    <Image source={item.images?.[0]} style={{ width: '100%', height: 144 }} contentFit="cover" transition={200} />
                    <View className="p-3">
                      <Text className="text-xs font-semibold text-text-primary" numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                        ₹{item.price.toFixed(2)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <View className="absolute bottom-0 w-full bg-background border-t border-border p-4 pb-8 flex-row items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        
        {/* Quantity Selector */}
        <View className="flex-row items-center bg-surface rounded-full mr-4 border border-border">
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setQuantity(q => Math.max(1, q - 1));
            }}
            disabled={quantity <= 1}
            className="w-10 h-10 items-center justify-center opacity-70 active:opacity-100 disabled:opacity-30"
          >
            <Ionicons name="remove" size={20} color="#1f2937" className="text-text-primary" />
          </TouchableOpacity>
          <Text className="font-bold text-base px-2 text-text-primary min-w-[24px] text-center">{quantity}</Text>
          <TouchableOpacity 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setQuantity(q => Math.min(product.inventoryQuantity, q + 1));
            }}
            disabled={quantity >= product.inventoryQuantity}
            className="w-10 h-10 items-center justify-center opacity-70 active:opacity-100 disabled:opacity-30"
          >
            <Ionicons name="add" size={20} color="#1f2937" className="text-text-primary" />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View className="flex-1 flex-row space-x-2">
          <TouchableOpacity 
            onPress={handleAddToCart}
            disabled={isCartLoading || isBuyLoading}
            className="flex-1 border-2 border-indigo-600 rounded-full items-center justify-center py-3"
          >
            {isCartLoading ? <ActivityIndicator size="small" color="#4f46e5" /> : <Text className="font-bold text-indigo-600">Add to Cart</Text>}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleBuyNow}
            disabled={isCartLoading || isBuyLoading}
            className="flex-1 bg-indigo-600 rounded-full items-center justify-center py-3 shadow-md"
          >
             {isBuyLoading ? <ActivityIndicator size="small" color="white" /> : <Text className="font-bold text-white">Buy Now</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Low Stock Warning */}
      {product.inventoryQuantity < 10 && (
        <View className="absolute bottom-[90px] w-full items-center pointer-events-none">
          <View className="bg-red-100 border border-red-200 px-4 py-1.5 rounded-full shadow-sm flex-row items-center">
            <Ionicons name="flame" size={14} color="#dc2626" />
            <Text className="text-red-700 text-xs font-bold ml-1">Only {product.inventoryQuantity} left in stock!</Text>
          </View>
        </View>
      )}

      {/* Write Review Modal */}
      <Modal
        visible={isReviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-background rounded-t-3xl p-6 h-3/4">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-text-primary">Write Review</Text>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <View className="items-center mb-6">
              <Text className="text-text-secondary mb-2">Tap to Rate</Text>
              <View className="flex-row space-x-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => {
                    Haptics.selectionAsync();
                    setReviewRating(star);
                  }} className="p-1">
                    <Ionicons name={star <= reviewRating ? "star" : "star-outline"} size={36} color="#fbbf24" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              className="bg-surface border border-border rounded-2xl p-4 text-text-primary h-40 text-base"
              placeholder="What did you think of this product?"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              value={reviewContent}
              onChangeText={setReviewContent}
            />

            <TouchableOpacity 
              onPress={submitReview}
              disabled={isSubmittingReview}
              className="bg-indigo-600 rounded-full py-4 items-center mt-6 shadow-md"
            >
              {isSubmittingReview ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Submit Review</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}
