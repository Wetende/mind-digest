import * as Sentry from '@sentry/react-native';
import { ENV } from '../config/env';

// Sentry configuration for crash reporting and observability
export const initSentry = () => {
  if (!ENV.SENTRY_DSN || ENV.IS_DEV) {
    console.log('Sentry disabled in development or missing DSN');
    return;
  }

  Sentry.init({
    dsn: ENV.SENTRY_DSN,
    environment: ENV.IS_DEV ? 'development' : 'production',
    debug: ENV.IS_DEV,

    // Performance monitoring
    tracesSampleRate: ENV.IS_DEV ? 1.0 : 0.1,

    // Release tracking
    release: `mind-digest@${ENV.APP_VERSION}`,
    dist: '1',

    // Error tracking configuration
    beforeSend(event, hint) {
      // Filter out non-error events in production
      if (event.level !== 'error' && !ENV.IS_DEV) {
        return null;
      }

      // Add user context if available (without sensitive data)
      const user = Sentry.getCurrentScope().getUser();
      if (user?.id) {
        event.contexts = {
          ...event.contexts,
          user_type: user.anonymous ? 'anonymous' : 'authenticated',
        };
      }

      // Add wellness app specific context
      event.tags = {
        ...event.tags,
        app_version: ENV.APP_VERSION,
        platform: 'expo-react-native',
      };

      return event;
    },

    // Custom error logging
    integrations: [
      // Custom integration to track AI service errors
      new Sentry.Integration({
        name: 'AIServiceIntegration',
        setupOnce: () => {
          // Listen for AI service errors
          console.error = (original => (...args) => {
            if (args.some(arg => typeof arg === 'string' && arg.includes('AI_SERVICE_ERROR'))) {
              Sentry.captureException(new Error(args.join(' ')), {
                tags: { service: 'ai_service' }
              });
            }
            return original.apply(console, args);
          })(console.error);
        }
      }),

      // Track journal entry errors
      new Sentry.Integration({
        name: 'JournalIntegration',
        setupOnce: () => {
          console.error = (original => (...args) => {
            if (args.some(arg => typeof arg === 'string' && arg.includes('JOURNAL_ERROR'))) {
              Sentry.captureException(new Error(args.join(' ')), {
                tags: { service: 'journal' }
              });
            }
            return original.apply(console, args);
          })(console.error);
        }
      }),

      // Track chat/moderation errors
      new Sentry.Integration({
        name: 'ChatIntegration',
        setupOnce: () => {
          console.error = (original => (...args) => {
            if (args.some(arg =>
              typeof arg === 'string' &&
              (arg.includes('CHAT_ERROR') || arg.includes('MODERATION_ERROR'))
            )) {
              Sentry.captureException(new Error(args.join(' ')), {
                tags: { service: 'chat' }
              });
            }
            return original.apply(console, args);
          })(console.error);
        }
      }),
    ],
  });

  console.log('Sentry initialized for crash reporting');
};

// Helper function to set user context safely
export const setSentryUser = (user) => {
  if (!user || ENV.IS_DEV) return;

  Sentry.setUser({
    id: user.id,
    // Never include PII in Sentry
    anonymous: !user.email,
  });

  Sentry.setContext('wellness_context', {
    has_profile: !!user.profile_completed,
    total_mood_entries: user.total_mood_entries || 0,
    total_journal_entries: user.total_journal_entries || 0,
  });
};

// Helper function to track user consent for data sharing
export const trackUserConsent = (consentGranted, consentType = 'analytics') => {
  Sentry.setContext('privacy_config', {
    analytics_consent: consentGranted,
    consent_type: consentType,
    consent_date: new Date().toISOString(),
  });
};

// Custom error tracking for crisis-related content
export const trackCrisisDetection = (severity, content_type) => {
  Sentry.captureMessage('Crisis detection triggered', {
    level: 'info',
    tags: {
      severity,
      content_type,
      service: 'crisis_detection'
    },
    extra: {
      detection_timestamp: new Date().toISOString(),
    }
  });
};

// Performance monitoring for AI analysis
export const startAIServiceTrace = (service_name) => {
  return Sentry.startTransaction(`${service_name}_analysis`, 'ai_processing');
};

// Track engagement analytics
export const trackUserEngagement = (action, feature, metadata = {}) => {
  Sentry.captureMessage('User engagement event', {
    level: 'info',
    tags: {
      action,
      feature,
      user_type: 'engagement'
    },
    extra: metadata
  });
};

export default { initSentry, setSentryUser, trackUserConsent };
