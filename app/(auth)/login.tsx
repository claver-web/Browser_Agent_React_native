import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuthStore } from "../../stores/useAuthStore";
import { COLORS } from "../../constants/theme";
import CONFIG from "../../constants/config";

const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+971", label: "🇦🇪 +971" },
];

export default function LoginScreen() {
  const { signIn, setActive, isLoaded: clerkSignInLoaded } = useSignIn();
  const router = useRouter();

  // State Management
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerificationPending, setIsVerificationPending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(30);

  const useBiometrics = useAuthStore((state) => state.useBiometrics);
  const setUseBiometrics = useAuthStore((state) => state.setUseBiometrics);

  // Refs for OTP Input Auto-Advance
  const otpRefs = useRef<Array<TextInput | null>>([]);

  // Timer Countdown Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isVerificationPending && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => t - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isVerificationPending, timer]);

  // Try Biometric Login on Mount if enabled
  useEffect(() => {
    if (useBiometrics) {
      triggerBiometrics();
    }
  }, [useBiometrics]);

  // Biometrics Authentication
  const triggerBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) return;

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) return;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate with Face ID / Fingerprint",
        fallbackLabel: "Use OTP instead",
      });

      if (result.success) {
        // Biometrics verified. If there is an active session, root layout redirects them.
        Alert.alert("Success", "Biometrics verified successfully!");
        router.replace("/(tabs)/home");
      }
    } catch (error) {
      console.error("Biometrics failed:", error);
    }
  };

  // Toggle Biometrics preference
  const toggleBiometricsPreference = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      Alert.alert("Error", "Biometrics is not configured or supported on this device.");
      return;
    }

    const nextVal = !useBiometrics;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: nextVal ? "Enable Biometrics" : "Disable Biometrics",
    });

    if (result.success) {
      await setUseBiometrics(nextVal);
      Alert.alert("Success", `Biometrics ${nextVal ? "enabled" : "disabled"} successfully!`);
    }
  };

  // Send OTP (Phone Auth Factor)
  const handleSendOTP = async () => {
    if (!clerkSignInLoaded) return;

    if (!phoneNumber) {
      Alert.alert("Error", "Please enter a valid phone number.");
      return;
    }

    setIsLoading(true);
    const fullPhone = `${countryCode}${phoneNumber}`;

    try {
      // 1. Initialize sign-in
      const signInAttempt = await signIn.create({
        identifier: fullPhone,
      });

      // 2. Locate phone code factor
      const factor = signInAttempt.supportedFirstFactors?.find(
        (f) => f.strategy === "phone_code"
      ) as any;

      if (!factor) {
        throw new Error("Phone code authentication not supported on this account.");
      }

      // 3. Prepare the code
      await signIn.prepareFirstFactor({
        strategy: "phone_code",
        phoneNumberId: factor.phoneNumberId,
      });

      setIsVerificationPending(true);
      setTimer(30);
      Alert.alert("OTP Sent", `Verification code sent to ${fullPhone}`);
    } catch (error: any) {
      console.error(error);
      const msg = error.errors?.[0]?.longMessage || error.message || "Something went wrong.";
      Alert.alert("Verification Failed", msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP Code
  const handleVerifyOTP = async () => {
    if (!clerkSignInLoaded) return;

    const fullCode = otpCode.join("");
    if (fullCode.length !== 6) {
      Alert.alert("Error", "Please enter the full 6-digit OTP code.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "phone_code",
        code: fullCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)/home");
      } else {
        console.warn("Sign-in incomplete status:", result.status);
        Alert.alert("Incomplete", "Additional verification factors required.");
      }
    } catch (error: any) {
      console.error(error);
      const msg = error.errors?.[0]?.longMessage || error.message || "Invalid OTP code.";
      Alert.alert("Verification Failed", msg);
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Input Auto-Advance & Backspace handling
  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otpCode];
    newOtp[index] = text.slice(-1); // Only keep the last typed char
    setOtpCode(newOtp);

    if (text && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Mock Email Login Link (as requested)
  const handleEmailLoginMock = () => {
    Alert.alert("Info", "Email login will be integrated in a later stage. Please use Phone Number Login.");
  };

  return (
    <LinearGradient
      colors={[COLORS.secondary, COLORS.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="flex-1"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center items-center px-6"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} className="w-full">
          <View className="bg-white dark:bg-darkCard rounded-3xl p-8 w-full shadow-2xl">
            {/* Header */}
            <Text className="text-3xl font-interBold text-center text-secondary mb-2">
              {CONFIG.APP_NAME}
            </Text>
            <Text className="text-sm font-inter text-center text-gray-500 mb-8">
              Premium E-Store Application
            </Text>

            {!isVerificationPending ? (
              /* Phone Input Screen */
              <View>
                <Text className="text-lg font-interBold text-gray-800 dark:text-gray-200 mb-2">
                  Login with Phone
                </Text>
                <View className="flex-row items-center border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 mb-6">
                  {/* Country Code Picker Dropdown */}
                  <View className="mr-3 pr-2 border-r border-gray-300">
                    <Text className="text-base font-inter text-gray-800">{countryCode}</Text>
                  </View>
                  <TextInput
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    className="flex-1 text-base font-inter text-gray-800"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Send OTP Button */}
                <TouchableOpacity
                  onPress={handleSendOTP}
                  disabled={isLoading}
                  className="bg-primary py-4 rounded-xl items-center shadow-lg"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-base font-interBold">Send OTP</Text>
                  )}
                </TouchableOpacity>

                {/* Custom Biometrics Option Button */}
                <TouchableOpacity
                  onPress={triggerBiometrics}
                  className="flex-row justify-center items-center mt-6 py-2 border border-secondary rounded-xl"
                >
                  <Text className="text-secondary font-interBold ml-2">Unlock with Biometrics</Text>
                </TouchableOpacity>

                {/* Biometrics Settings Toggle */}
                <TouchableOpacity
                  onPress={toggleBiometricsPreference}
                  className="mt-3 items-center"
                >
                  <Text className="text-xs text-gray-500 underline">
                    {useBiometrics ? "Disable biometric login on startup" : "Enable biometric login on startup"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* OTP Verification Screen */
              <View>
                <Text className="text-lg font-interBold text-gray-800 dark:text-gray-200 mb-2">
                  Verify OTP
                </Text>
                <Text className="text-xs text-gray-500 mb-6">
                  Enter the 6-digit code sent to {countryCode} {phoneNumber}
                </Text>

                {/* 6 discrete digit boxes */}
                <View className="flex-row justify-between mb-8">
                  {otpCode.map((digit, idx) => (
                    <TextInput
                      key={idx}
                      ref={(ref) => {
                        otpRefs.current[idx] = ref;
                      }}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={digit}
                      onChangeText={(val) => handleOtpChange(val, idx)}
                      onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                      className="w-12 h-14 border border-gray-300 dark:border-gray-700 text-center text-xl font-interBold text-gray-800 rounded-xl bg-gray-50 dark:bg-darkBg"
                    />
                  ))}
                </View>

                {/* Verify OTP Button */}
                <TouchableOpacity
                  onPress={handleVerifyOTP}
                  disabled={isLoading}
                  className="bg-primary py-4 rounded-xl items-center shadow-lg"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-base font-interBold">Verify Code</Text>
                  )}
                </TouchableOpacity>

                {/* Resend OTP Section */}
                <View className="flex-row justify-between items-center mt-6">
                  <TouchableOpacity
                    onPress={handleSendOTP}
                    disabled={timer > 0 || isLoading}
                  >
                    <Text
                      className={`font-interBold ${
                        timer > 0 ? "text-gray-400" : "text-secondary"
                      }`}
                    >
                      Resend OTP
                    </Text>
                  </TouchableOpacity>
                  {timer > 0 && (
                    <Text className="text-xs text-gray-500 font-inter">Resend in {timer}s</Text>
                  )}
                </View>

                {/* Back to Phone Number */}
                <TouchableOpacity
                  onPress={() => setIsVerificationPending(false)}
                  className="mt-6 align-center"
                >
                  <Text className="text-sm text-center text-gray-500 underline font-inter">
                    Change Phone Number
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Separator */}
            <View className="h-[1px] bg-gray-200 dark:bg-gray-800 my-6" />

            {/* Email Login Alternate */}
            <TouchableOpacity onPress={handleEmailLoginMock} className="items-center py-2 mb-4">
              <Text className="text-secondary font-interBold text-sm">Login with Email</Text>
            </TouchableOpacity>

            {/* Register redirection */}
            <View className="flex-row justify-center items-center mt-2">
              <Text className="text-xs text-gray-500 font-inter">New User? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                <Text className="text-xs text-primary font-interBold">Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
