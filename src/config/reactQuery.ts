import { QueryClient, DefaultOptions } from '@tanstack/react-query';
import { supabase } from './supabase';
import { removeData } from '../utils/storageUtils';

// Default options for React Query
const defaultOptions: DefaultOptions = {
  queries: {
    // Global retry logic
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      // Retry up to 3 times for 5xx errors or network issues
      return failureCount < 3;
    },
    // Optimized staleTime for mental health app
    // Frequent data (mood, notifications): 2 minutes
    // User profile data: 10 minutes
    // Static/reference data: 30 minutes
    staleTime: 2 * 60 * 1000, // Default 2 minutes
    // Add selective column fetching hint
    select: undefined, // Will be set per query for optimization
    // Keep data in cache for longer to reduce API calls
    gcTime: 30 * 60 * 1000, // 30 minutes
    // Refetch data when window regains focus (useful for mobile)
    refetchOnWindowFocus: true,
    // Optimize reconnect refetching
    refetchOnReconnect: 'always',
    // Prevent background refetches while offline
    networkMode: 'offlineFirst',
    // Disable placeholder data to prevent UI flicker
    placeholderData: undefined,
  },
  mutations: {
    // Retry mutations once on failure
    retry: 1,
    // Retry with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  },
};

// Performance-specific query configurations
export const performanceOptions = {
  // Frequent data (mood entries, notifications) - refresh every 2 minutes
  frequent: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes keep cache
  },
  // User profile and preferences - refresh every 10 minutes
  profile: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour keep cache
  },
  // Static/reference data (badges, categories) - refresh every 30 minutes
  static: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 4 * 60 * 60 * 1000, // 4 hours keep cache
  },
  // Sensitive real-time data (chat, recommendations) - refresh every 1 minute
  realtime: {
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes keep cache
  },
};

// Create and configure React Query client
export const queryClient = new QueryClient({
  defaultOptions,
});

// Auth state synchronization with React Query
let authInitialized = false;

export function initAuthSync() {
  if (authInitialized) return;
  authInitialized = true;

  // Clear all query cache on auth changes
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      // Clear all cached data on sign out
      queryClient.clear();
      // Clear any offline data
      removeData('offlineQueue');
      removeData('lastSyncTime');
    } else if (event === 'SIGNED_IN') {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries();
    }
  });
}

// Query keys for consistent naming
export const queryKeys = {
  // Auth queries
  auth: {
    currentUser: () => ['auth', 'currentUser'] as const,
    profile: () => ['auth', 'profile'] as const,
  },

  // Mood queries
  mood: {
    all: () => ['mood'] as const,
    list: (filters?: any) => ['mood', 'list', filters] as const,
    detail: (id: string) => ['mood', 'detail', id] as const,
    analytics: (range?: string) => ['mood', 'analytics', range] as const,
  },

  // Journal queries
  journal: {
    all: () => ['journal'] as const,
    list: (filters?: any) => ['journal', 'list', filters] as const,
    detail: (id: string) => ['journal', 'detail', id] as const,
    aiAnalysis: (id: string) => ['journal', 'aiAnalysis', id] as const,
  },

  // Habit queries
  habit: {
    all: () => ['habit'] as const,
    userStats: () => ['habit', 'userStats'] as const,
    badges: () => ['habit', 'badges'] as const,
    challenges: () => ['habit', 'challenges'] as const,
    progress: () => ['habit', 'progress'] as const,
  },

  // Social queries
  social: {
    partners: () => ['social', 'partners'] as const,
    connectionRequests: () => ['social', 'connectionRequests'] as const,
    progressFeed: (limit?: number) => ['social', 'progressFeed', limit] as const,
  },

  // Recommendation queries
  recommendation: {
    all: () => ['recommendation'] as const,
    personalized: (userId: string) => ['recommendation', 'personalized', userId] as const,
    analytics: () => ['recommendation', 'analytics'] as const,
  },

  // Notification queries
  notification: {
    all: () => ['notification'] as const,
    preferences: () => ['notification', 'preferences'] as const,
  },
};

// Mutation keys for optimistic updates
export const mutationKeys = {
  // Mood mutations
  moodCreate: () => ['mood', 'create'] as const,
  moodUpdate: (id: string) => ['mood', 'update', id] as const,
  moodDelete: (id: string) => ['mood', 'delete', id] as const,

  // Journal mutations
  journalCreate: () => ['journal', 'create'] as const,
  journalUpdate: (id: string) => ['journal', 'update', id] as const,
  journalDelete: (id: string) => ['journal', 'delete', id] as const,

  // Habit mutations
  habitAward: () => ['habit', 'award'] as const,
  habitBadgeEarn: () => ['habit', 'badge'] as const,

  // Social mutations
  socialRequest: () => ['social', 'request'] as const,
  socialProgress: () => ['social', 'progress'] as const,

  // Notification mutations
  notificationPreferences: () => ['notification', 'preferences'] as const,
};

// Error handling hooks
export function useQueryError(error: any) {
  // Centralized error handling for queries
  if (error?.status === 401) {
    // Handle authentication errors
    console.warn('Authentication required');
    // Could trigger logout or refresh token flow
  } else if (error?.status >= 500) {
    // Handle server errors
    console.error('Server error:', error);
    // Could show offline mode or retry option
  }

  return error;
}

export function useMutationError(error: any) {
  // Centralized error handling for mutations
  if (error?.status === 429) {
    console.warn('Rate limit exceeded');
    return { message: 'Please wait a moment and try again.' };
  } else if (error?.status >= 500) {
    console.error('Server error:', error);
    return { message: 'Something went wrong. Please try again.' };
  }

  return error?.message || 'An error occurred';
}
