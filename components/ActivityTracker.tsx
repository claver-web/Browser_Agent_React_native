import React, { useEffect } from 'react';
import { usePathname } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import uuid from 'react-native-uuid';
import { apiClient } from '../lib/api-client';

const VISITOR_ID_KEY = 'shopai_visitor_id';

export const trackEvent = async (action: string, metadata: Record<string, any> = {}) => {
  try {
    let visitorId = await SecureStore.getItemAsync(VISITOR_ID_KEY);
    if (!visitorId) {
      visitorId = uuid.v4().toString();
      await SecureStore.setItemAsync(VISITOR_ID_KEY, visitorId);
    }

    await apiClient.post('/track/activity', {
      action,
      visitorId,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  } catch (error) {
    console.warn('[ActivityTracker] Failed to track event:', action, error);
  }
};

export const ActivityTracker = () => {
  const pathname = usePathname();
  const { userId } = useAuth();

  useEffect(() => {
    if (pathname) {
      trackEvent('visit', { page: pathname, userId });
    }
  }, [pathname, userId]);

  return null; // Invisible global component
};
