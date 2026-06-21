import "../global.css";
import { useEffect } from "react";
import { useColorScheme } from "nativewind";
import { useThemeStore } from "../stores/useThemeStore";
import { useAuthStore } from "../stores/useAuthStore";
import { useFonts, Inter_400Regular, Inter_700Bold } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import tokenCache from "../services/tokenCache";
import { CONFIG } from "../constants/config";

// Prevent splash screen from auto-hiding until fonts and auth state are loaded
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const publishableKey = CONFIG.CLERK_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "";

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <RootLayoutNav />
      </SafeAreaProvider>
    </ClerkProvider>
  );
}

function RootLayoutNav() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const theme = useThemeStore((state) => state.theme);
  const syncWithClerk = useAuthStore((state) => state.syncWithClerk);
  const loadBiometricPreference = useAuthStore((state) => state.loadBiometricPreference);

  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const segments = useSegments();
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
  });

  // Sync theme and load biometrics preference
  useEffect(() => {
    setColorScheme(theme);
    loadBiometricPreference();
  }, [theme, setColorScheme, loadBiometricPreference]);

  // Sync Clerk user information with Zustand auth store
  useEffect(() => {
    if (clerkLoaded) {
      syncWithClerk(clerkUser);
    }
  }, [clerkUser, clerkLoaded, syncWithClerk]);

  // Navigation guard / Redirection logic
  useEffect(() => {
    if (!clerkLoaded || !fontsLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      // Redirect unauthenticated user to login screen
      router.replace("/(auth)/login");
    } else if (isSignedIn && inAuthGroup) {
      // Redirect authenticated user away from auth group to tab home
      router.replace("/(tabs)/home");
    }
  }, [isSignedIn, clerkLoaded, fontsLoaded, segments, router]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && clerkLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, clerkLoaded]);

  if ((!fontsLoaded && !fontError) || !clerkLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="checkout/index" />
        <Stack.Screen name="order/index" />
        <Stack.Screen name="order/[id]" />
      </Stack>
    </>
  );
}
