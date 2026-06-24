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
import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { COLORS } from "../../constants/theme";
import CONFIG from "../../constants/config";

const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+971", label: "🇦🇪 +971" },
];

export default function RegisterScreen() {
  const { signUp, setActive, isLoaded: clerkSignUpLoaded } = useSignUp();
  const router = useRouter();

  // State Management
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // OTP Verification States
  const [otpCode, setOtpCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerificationPending, setIsVerificationPending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(30);

  // Refs for OTP Auto-Advance
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

  // Create Account / Sign-Up
  const handleSignUp = async () => {
    if (!clerkSignUpLoaded) return;

    if (!name.trim()) {
      Alert.alert("Error", "Please enter your full name.");
      return;
    }

    if (!phoneNumber) {
      Alert.alert("Error", "Please enter a valid phone number.");
      return;
    }

    if (!agreeToTerms) {
      Alert.alert("Error", "You must agree to the Terms & Conditions.");
      return;
    }

    setIsLoading(true);
    const fullPhone = `${countryCode}${phoneNumber}`;

    try {
      // 1. Create Clerk sign-up record
      await signUp.create({
        phoneNumber: fullPhone,
        firstName: name,
        emailAddress: email.trim() ? email.trim() : undefined,
      });

      // 2. Trigger verification code SMS
      await signUp.preparePhoneNumberVerification();

      setIsVerificationPending(true);
      setTimer(30);
      Alert.alert("OTP Sent", `Verification code sent to ${fullPhone}`);
    } catch (error: any) {
      console.error(error);
      const msg = error.errors?.[0]?.longMessage || error.message || "Sign-up initiation failed.";
      Alert.alert("Sign Up Failed", msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify Sign-Up OTP Code
  const handleVerifyOTP = async () => {
    if (!clerkSignUpLoaded) return;

    const fullCode = otpCode.join("");
    if (fullCode.length !== 6) {
      Alert.alert("Error", "Please enter the full 6-digit OTP code.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp.attemptPhoneNumberVerification({
        code: fullCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        console.warn("Sign-up incomplete status:", result.status);
        Alert.alert("Incomplete", "Additional registration parameters required.");
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
    newOtp[index] = text.slice(-1);
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
          <View className="bg-white dark:bg-darkCard rounded-3xl p-8 w-full shadow-2xl my-8">
            {/* Header */}
            <Text className="text-3xl font-interBold text-center text-secondary mb-2">
              {CONFIG.APP_NAME}
            </Text>
            <Text className="text-sm font-inter text-center text-text-secondary mb-8">
              Create a Premium E-Store Account
            </Text>

            {!isVerificationPending ? (
              /* Registration Form */
              <View>
                {/* Name */}
                <Text className="text-sm font-interBold text-text-secondary mb-2">
                  Full Name
                </Text>
                <TextInput
                  placeholder="Enter full name"
                  value={name}
                  onChangeText={setName}
                  className="border border-gray-300 border-border rounded-xl px-4 py-3 mb-4 text-base font-inter text-gray-800"
                  placeholderTextColor="#9CA3AF"
                />

                {/* Phone number */}
                <Text className="text-sm font-interBold text-text-secondary mb-2">
                  Phone Number
                </Text>
                <View className="flex-row items-center border border-gray-300 border-border rounded-xl px-4 py-2 mb-4">
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

                {/* Email Address (optional) */}
                <Text className="text-sm font-interBold text-text-secondary mb-2">
                  Email Address (Optional)
                </Text>
                <TextInput
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  className="border border-gray-300 border-border rounded-xl px-4 py-3 mb-6 text-base font-inter text-gray-800"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />

                {/* Terms and Conditions */}
                <TouchableOpacity
                  onPress={() => setAgreeToTerms(!agreeToTerms)}
                  className="flex-row items-center mb-6"
                >
                  <View
                    className={`w-5 h-5 rounded border mr-3 justify-center items-center ${
                      agreeToTerms ? "bg-primary border-primary" : "border-gray-400 bg-white"
                    }`}
                  >
                    {agreeToTerms && (
                      <Text className="text-[10px] text-white font-interBold">✓</Text>
                    )}
                  </View>
                  <Text className="text-xs text-text-secondary font-inter flex-1 leading-4">
                    I agree to the Terms & Conditions and Privacy Policy.
                  </Text>
                </TouchableOpacity>

                {/* Create Account Button */}
                <TouchableOpacity
                  onPress={handleSignUp}
                  disabled={isLoading}
                  className="bg-primary py-4 rounded-xl items-center shadow-lg"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-base font-interBold">Create Account</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* OTP Verification Form */
              <View>
                <Text className="text-lg font-interBold text-gray-800 dark:text-gray-200 mb-2">
                  Verify Your Phone
                </Text>
                <Text className="text-xs text-text-secondary mb-6">
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
                      className="w-12 h-14 border border-gray-300 border-border text-center text-xl font-interBold text-gray-800 rounded-xl bg-gray-50 dark:bg-darkBg"
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
                    onPress={handleSignUp}
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
                    <Text className="text-xs text-text-secondary font-inter">Resend in {timer}s</Text>
                  )}
                </View>
              </View>
            )}

            {/* Separator */}
            <View className="h-[1px] bg-gray-200 bg-surface my-6" />

            {/* Login redirection */}
            <View className="flex-row justify-center items-center">
              <Text className="text-xs text-text-secondary font-inter">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text className="text-xs text-primary font-interBold">Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
