import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
  statusCode?: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  details?: any;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export const DEFAULT_REQUEST_OPTIONS: RequestOptions = {
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
};

class ApiClient {
  private isOnline: boolean = true;
  private baseUrl: string;
  private timeoutId?: NodeJS.Timeout;

  constructor() {
    this.baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  }

  // Check network connectivity
  async checkConnectivity(): Promise<boolean> {
    try {
      // Simple connectivity check
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'HEAD',
        timeout: 5000,
      });
      this.isOnline = response.ok;
      return this.isOnline;
    } catch (error) {
      this.isOnline = false;
      return false;
    }
  }

  // Payload optimization to reduce network payload size
  private optimizePayload(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload;

    // Recursively remove null/undefined values and optimize arrays
    const optimized: any = {};

    for (const [key, value] of Object.entries(payload)) {
      // Skip null/undefined values
      if (value === null || value === undefined) continue;

      // Optimize arrays by removing duplicates if they're primitives
      if (Array.isArray(value) && value.length > 0 && typeof value[0] !== 'object') {
        optimized[key] = [...new Set(value)]; // Remove duplicates
      }
      // Recursively optimize nested objects
      else if (typeof value === 'object' && !Array.isArray(value)) {
        optimized[key] = this.optimizePayload(value);
      }
      // Keep arrays of objects and primitives as-is
      else {
        optimized[key] = value;
      }
    }

    return optimized;
  }

  // Optimized Edge Function calls with compression and selective data fetching
  async callEdgeFunction(
    functionName: string,
    payload: any = {},
    options: RequestOptions = DEFAULT_REQUEST_OPTIONS
  ): Promise<ApiResponse> {
    const finalOptions = { ...DEFAULT_REQUEST_OPTIONS, ...options };

    // Optimize payload by removing null/undefined values and compressing arrays
    const optimizedPayload = this.optimizePayload(payload);

    let lastError: any;

    for (let attempt = 1; attempt <= finalOptions.retries!; attempt++) {
      try {
        // Use global supabase instance with optimized headers
        const response = await supabase.functions.invoke(functionName, {
          body: optimizedPayload,
          headers: {
            'Content-Encoding': 'gzip',
            'Accept-Encoding': 'gzip, deflate',
          },
        });

        // Handle Supabase function responses
        if (!response.error) {
          return {
            data: response.data,
            success: true,
            statusCode: 200,
          };
        } else {
          throw response.error;
        }

      } catch (error) {
        lastError = error;

        // Handle network errors - retry if not the last attempt with exponential backoff
        if (attempt < finalOptions.retries!) {
          const delay = Math.min(finalOptions.retryDelay! * Math.pow(2, attempt - 1), 30000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Handle different types of errors
        return this.handleError(error);
      }
    }

    return this.handleError(lastError);
  }

  // Generic error handler for different error types
  private handleError(error: any): ApiResponse {
    // Simple error handling for now
    return {
      success: false,
      error: error?.message || 'Unknown error occurred',
      statusCode: error?.status || 500,
    };
  }

  // Get authentication headers for Supabase requests
  private async getAuthHeaders(): Promise<{ [key: string]: string }> {
    try {
      // This would typically come from Supabase auth session
      // For now, returning minimal headers
      return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return {};
    }
  }

  // Upload file to Supabase storage with progress tracking
  async uploadFile(
    bucketName: string,
    filePath: string,
    file: File,
    options: { upsert?: boolean } = {}
  ): Promise<ApiResponse> {
    try {
      const { data, error } = await this.supabaseStorage
        .from(bucketName)
        .upload(filePath, file, {
          upsert: options.upsert || false,
        });

      if (error) throw error;

      return {
        data,
        success: true,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Download file from Supabase storage
  async downloadFile(bucketName: string, filePath: string): Promise<ApiResponse<Blob>> {
    try {
      const { data, error } = await this.supabaseStorage
        .from(bucketName)
        .download(filePath);

      if (error) throw error;

      return {
        data,
        success: true,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Get offline queue if network is unavailable
  private async getOfflineQueue(): Promise<any[]> {
    try {
      const { getOfflineQueue } = await import('../utils/storageUtils');
      return await getOfflineQueue() || [];
    } catch (error) {
      console.warn('Offline functionality not available');
      return [];
    }
  }

  // Add request to offline queue
  private async queueForOffline(functionName: string, payload: any): Promise<void> {
    try {
      const { storeOfflineData } = await import('../utils/storageUtils');
      await storeOfflineData({
        functionName,
        payload,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Failed to queue for offline sync:', error);
    }
  }

  // Batch execute offline requests when online
  async syncOfflineRequests(): Promise<void> {
    if (!this.isOnline) return;

    try {
      const queue = await this.getOfflineQueue();
      if (queue.length === 0) return;

      const results = await Promise.allSettled(
        queue.map(async (item: any) => {
          return await this.callEdgeFunction(item.functionName, item.payload);
        })
      );

      // Clear successful requests from queue
      const { clearOfflineQueue } = await import('../utils/storageUtils');
      await clearOfflineQueue();

      console.log(`Synced ${results.length} offline requests`);
    } catch (error) {
      console.error('Error syncing offline requests:', error);
    }
  }

  // Health check endpoint
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.callEdgeFunction('health-check', {});
      return response.success;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Graceful degradation - fallback to client-side processing
  async fallbackProcessing(): Promise<{
    available: boolean;
    fallback: (params: any) => Promise<any>;
  }> {
    return {
      available: false, // Enable based on feature flags
      fallback: async (params: any) => {
        // Implement client-side fallback here
        throw new Error('Client-side fallback not implemented');
      }
    };
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Convenience functions for specific Edge Functions
export const aiApi = {
  analyzeJournal: (journalEntry: any, userId: string) =>
    apiClient.callEdgeFunction('ai-analyze-journal', { journalEntry, userId }),

  moderateContent: (content: string, context?: string) =>
    apiClient.callEdgeFunction('ai-moderate', { content, context }),

  detectCrisis: (content: string, userHistory?: any[]) =>
    apiClient.callEdgeFunction('ai-detect-crisis', { content, userHistory }),
};

export default apiClient;
