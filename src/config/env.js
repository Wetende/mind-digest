// Environment configuration
// In a real app, these would come from environment variables or a secure config

export const ENV = {
  // Supabase Configuration
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || "YOUR_SUPABASE_URL",
  SUPABASE_ANON_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY",

  // AI Configuration
  OPENAI_API_KEY:
    process.env.EXPO_PUBLIC_OPENAI_API_KEY || "your_openai_api_key",
  HUGGINGFACE_API_KEY:
    process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY || "your_huggingface_token",
  GOOGLE_AI_API_KEY:
    process.env.EXPO_PUBLIC_GOOGLE_AI_API_KEY || "your_google_ai_key",

  // Social Platform APIs
  META_APP_ID: process.env.EXPO_PUBLIC_META_APP_ID || "YOUR_META_APP_ID",
  TIKTOK_CLIENT_KEY:
    process.env.EXPO_PUBLIC_TIKTOK_CLIENT_KEY || "YOUR_TIKTOK_CLIENT_KEY",
  X_API_KEY: process.env.EXPO_PUBLIC_X_API_KEY || "YOUR_X_API_KEY",

  // App Configuration
  APP_NAME: "Mind-digest",
  APP_VERSION: "1.0.0",

  // Feature Flags
  FEATURES: {
    AI_INSIGHTS: true,
    SOCIAL_SHARING: true,
    PEER_SUPPORT: true,
    CRISIS_SUPPORT: true,
    BIOMETRIC_INTEGRATION: false, // Will be enabled later
  },

  // Crisis Support
  CRISIS_HOTLINE: "988", // Suicide & Crisis Lifeline
  EMERGENCY_NUMBER: "911",

  // Development
  IS_DEV: __DEV__,
  API_TIMEOUT: 10000, // 10 seconds
};
