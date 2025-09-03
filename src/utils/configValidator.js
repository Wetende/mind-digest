/**
 * Configuration validator for the mind-digest app
 * Validates that all required environment variables are present on startup
 */

const REQUIRED_CLIENT_CONFIG = {
  EXPO_PUBLIC_SUPABASE_URL: 'Supabase project URL',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'Supabase anonymous key',
};

const REQUIRED_AI_CONFIG = {
  EXPO_PUBLIC_HUGGINGFACE_API_KEY: 'HuggingFace API key for AI analysis',
};

const OPTIONAL_AI_CONFIG = {
  EXPO_PUBLIC_OPENAI_API_KEY: 'OpenAI API key (optional)',
};

const SOCIAL_CONFIG = {
  EXPO_PUBLIC_META_APP_ID: 'Meta App ID for Instagram/TikTok',
  EXPO_PUBLIC_TIKTOK_CLIENT_KEY: 'TikTok API key',
  EXPO_PUBLIC_X_API_KEY: 'X/Twitter API key',
};

class ConfigValidator {
  constructor() {
    this.warnings = [];
    this.errors = [];
  }

  /**
   * Validate all required configuration
   */
  validateConfig() {
    this.errors = [];
    this.warnings = [];

    // Validate required client config
    this.validateRequiredConfigs(REQUIRED_CLIENT_CONFIG);

    // Validate AI configuration
    this.validateRequiredConfigs(REQUIRED_AI_CONFIG, true); // Allow warnings for AI keys

    // Validate optional configurations
    this.validateOptionalConfigs(OPTIONAL_AI_CONFIG);
    this.validateOptionalConfigs(SOCIAL_CONFIG);

    // Validate environment-specific settings
    this.validateEnvironmentConfig();

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Validate required configuration variables
   */
  validateRequiredConfigs(configMap, allowWarnings = false) {
    Object.entries(configMap).forEach(([key, description]) => {
      const value = process.env[key];

      if (!value || value === `your_${key.replace('EXPO_PUBLIC_', '').toLowerCase()}`) {
        const message = `Missing or invalid ${description}: ${key}`;

        if (allowWarnings) {
          this.warnings.push(message);
        } else {
          this.errors.push(message);
        }
      }
    });
  }

  /**
   * Validate optional configuration variables
   */
  validateOptionalConfigs(configMap) {
    Object.entries(configMap).forEach(([key, description]) => {
      const value = process.env[key];

      if (!value || value === `your_${key.replace('EXPO_PUBLIC_', '').toLowerCase()}`) {
        this.warnings.push(`Optional ${description} not configured: ${key}`);
      }
    });
  }

  /**
   * Validate environment-specific configuration
   */
  validateEnvironmentConfig() {
    const env = process.env.EXPO_PUBLIC_ENV;

    if (!env) {
      this.errors.push('EXPO_PUBLIC_ENV is not set. Defaulting to development.');
      return;
    }

    // Validate environment-specific requirements
    switch (env) {
      case 'development':
      case 'staging':
      case 'production':
        // All environments require the same basic config
        break;

      default:
        this.errors.push(`Invalid EXPO_PUBLIC_ENV value: ${env}. Must be development, staging, or production.`);
        break;
    }
  }

  /**
   * Get configuration status for UI display
   */
  getConfigStatus() {
    const validation = this.validateConfig();

    return {
      environment: process.env.EXPO_PUBLIC_ENV || 'development',
      status: validation.isValid ? 'valid' : 'invalid',
      hasWarnings: validation.warnings.length > 0,
      hasErrors: validation.errors.length > 0,
      details: {
        services: {
          supabase: this.hasServiceConfig('supabase'),
          ai: this.hasServiceConfig('ai'),
          social: this.hasServiceConfig('social'),
        },
        validation,
      },
    };
  }

  /**
   * Check if a specific service is configured
   */
  hasServiceConfig(service) {
    switch (service) {
      case 'supabase':
        return !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
               !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
               process.env.EXPO_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url';

      case 'ai':
        return !!process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
               !!process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY;

      case 'social':
        return !!process.env.EXPO_PUBLIC_META_APP_ID ||
               !!process.env.EXPO_PUBLIC_TIKTOK_CLIENT_KEY ||
               !!process.env.EXPO_PUBLIC_X_API_KEY;

      default:
        return false;
    }
  }

  /**
   * Get a safe summary of available features based on config
   */
  getAvailableFeatures() {
    return {
      supabase: {
        urlConfigured: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
        authConfigured: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      },
      ai: {
        openai: !!process.env.EXPO_PUBLIC_OPENAI_API_KEY,
        huggingface: !!process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY,
        anyAI: !!process.env.EXPO_PUBLIC_OPENAI_API_KEY || !!process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY,
      },
      social: {
        meta: !!process.env.EXPO_PUBLIC_META_APP_ID,
        tiktok: !!process.env.EXPO_PUBLIC_TIKTOK_CLIENT_KEY,
        twitter: !!process.env.EXPO_PUBLIC_X_API_KEY,
        anySocial: !!process.env.EXPO_PUBLIC_META_APP_ID ||
                   !!process.env.EXPO_PUBLIC_TIKTOK_CLIENT_KEY ||
                   !!process.env.EXPO_PUBLIC_X_API_KEY,
      },
      environment: {
        type: process.env.EXPO_PUBLIC_ENV || 'development',
        isDevelopment: (process.env.EXPO_PUBLIC_ENV || 'development') === 'development',
        isProduction: (process.env.EXPO_PUBLIC_ENV || 'development') === 'production',
      },
    };
  }

  /**
   * Log configuration status for debugging
   */
  logConfigStatus() {
    const status = this.getConfigStatus();
    const features = this.getAvailableFeatures();

    console.log('=== Mind-digest Configuration Status ===');
    console.log(`Environment: ${status.environment}`);
    console.log(`Status: ${status.status}`);

    if (status.hasErrors) {
      console.error('Configuration Errors:');
      status.details.validation.errors.forEach(error => console.error(`❌ ${error}`));
    }

    if (status.hasWarnings) {
      console.warn('Configuration Warnings:');
      status.details.validation.warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
    }

    console.log('\nAvailable Features:');
    console.log(`Supabase: ${status.details.services.supabase ? '✅' : '❌'}`);
    console.log(`AI Services: ${status.details.services.ai ? '✅' : '❌'}`);
    console.log(`Social Sharing: ${status.details.services.social ? '✅' : '❌'}`);

    return status;
  }
}

// Create singleton instance
const configValidator = new ConfigValidator();

// Export both instance and class for flexibility
export { configValidator, ConfigValidator };

// Export a convenience function for quick validation
export const validateConfiguration = () => configValidator.validateConfig();

// Export config status getter
export const getConfigStatus = () => configValidator.getConfigStatus();

// Export feature availability checker
export const getAvailableFeatures = () => configValidator.getAvailableFeatures();

// Log configuration status on module load
if (__DEV__) {
  configValidator.logConfigStatus();
}
