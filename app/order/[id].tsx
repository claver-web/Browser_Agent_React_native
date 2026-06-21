import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-background dark:bg-darkBg">
      <Text className="text-2xl font-interBold text-secondary">Order Details Screen</Text>
      <Text className="text-lg font-inter text-primary mt-2">Order ID: {id}</Text>
    </View>
  );
}
