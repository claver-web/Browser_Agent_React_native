import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView className="flex-1 bg-background justify-center items-center px-6">
          <View className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full items-center justify-center mb-6">
            <Ionicons name="alert-circle" size={48} color="#ef4444" />
          </View>
          <Text className="text-2xl font-extrabold text-text-primary mb-2 text-center">
            Oops! Something went wrong.
          </Text>
          <Text className="text-text-secondary text-center mb-8">
            We encountered an unexpected error. Please try again.
          </Text>
          <TouchableOpacity
            onPress={this.handleReset}
            className="bg-primary px-8 py-3 rounded-full flex-row items-center shadow-md active:opacity-80"
          >
            <Ionicons name="refresh" size={20} color="white" className="mr-2" />
            <Text className="text-white font-bold text-base ml-2">Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
