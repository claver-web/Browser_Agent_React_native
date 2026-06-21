import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-background dark:bg-darkBg">
      <Text className="text-2xl font-interBold text-primary">Product Details Screen</Text>
      <Text className="text-lg font-inter text-secondary mt-2">Product ID: {id}</Text>
    </View>
  );
}
