import * as Sentry from '@sentry/react-native';
import {
  initSentry,
  setSentryUser,
  trackUserEngagement,
  trackCrisisDetection
} from '../../src/utils/sentryConfig';
import { ENV } from '../../src/config/env';

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  startTransaction: jest.fn(),
  getCurrentScope: jest.fn(() => ({
    getUser: jest.fn(() => ({ id: 'test-user', anonymous: false })),
  })),
  setExtra: jest.fn(),
  setTag: jest.fn(),
}));

// Mock ENV
jest.mock('../../src/config/env', () => ({
  ENV: {
    SENTRY_DSN: 'test-dsn',
    IS_DEV: false,
    APP_NAME: 'Mind-digest',
    APP_VERSION: '1.0.0'
  }
}));

describe('Sentry Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset ENV to default values
    ENV.IS_DEV = false;
    ENV.SENTRY_DSN = 'test-dsn';
  });

  describe('initSentry', () => {
    it('should initialize Sentry with production settings', () => {
      ENV.IS_DEV = false;
      initSentry();

      expect(Sentry.init).toHaveBeenCalledWith({
        dsn: 'test-dsn',
        environment: 'production',
        debug: false,
        tracesSampleRate: 0.1,
        release: 'mind-digest@1.0.0',
        dist: '1',
        beforeSend: expect.any(Function),
        integrations: expect.any(Array),
      });
    });

    it('should initialize Sentry with development settings', () => {
      ENV.IS_DEV = true;
      initSentry();

      expect(Sentry.init).toHaveBeenCalledWith({
        dsn: 'test-dsn',
        environment: 'development',
        debug: true,
        tracesSampleRate: 1.0,
        release: 'mind-digest@1.0.0',
        dist: '1',
        beforeSend: expect.any(Function),
        integrations: expect.any(Array),
      });
    });

    it('should not initialize Sentry without DSN', () => {
      ENV.SENTRY_DSN = null;
      initSentry();

      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('should filter out non-error events in production', () => {
      ENV.IS_DEV = false;
      initSentry();

      const beforeSend = Sentry.init.mock.calls[0][0].beforeSend;

      // Error event should pass through
      const errorEvent = { level: 'error', message: 'Test error' };
      expect(beforeSend(errorEvent)).toBe(errorEvent);

      // Info event should be filtered out in production
      const infoEvent = { level: 'info', message: 'Test info' };
      expect(beforeSend(infoEvent)).toBeNull();
    });

    it('should add wellness context tags', () => {
      ENV.IS_DEV = false;
      initSentry();

      const beforeSend = Sentry.init.mock.calls[0][0].beforeSend;

      const event = { level: 'error' };
      beforeSend(event);

      expect(event.tags).toEqual({
        app_version: '1.0.0',
        platform: 'expo-react-native'
      });
    });
  });

  describe('setSentryUser', () => {
    it('should set user context for authenticated users', () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        profile_completed: true,
        total_mood_entries: 10,
        total_journal_entries: 5
      };

      setSentryUser(user);

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'user123',
        anonymous: false,
      });

      expect(Sentry.setContext).toHaveBeenCalledWith('wellness_context', {
        has_profile: true,
        total_mood_entries: 10,
        total_journal_entries: 5,
      });
    });

    it('should set user context for anonymous users', () => {
      const user = {
        id: 'anon123',
        email: null,
        profile_completed: false
      };

      setSentryUser(user);

      expect(Sentry.setUser).toHaveBeenCalledWith({
        id: 'anon123',
        anonymous: true,
      });
    });

    it('should not set user context in development', () => {
      ENV.IS_DEV = true;
      const user = { id: 'user123', email: 'test@example.com' };

      setSentryUser(user);

      expect(Sentry.setUser).not.toHaveBeenCalled();
      expect(Sentry.setContext).not.toHaveBeenCalled();
    });

    it('should handle null user gracefully', () => {
      setSentryUser(null);

      expect(Sentry.setUser).not.toHaveBeenCalled();
      expect(Sentry.setContext).not.toHaveBeenCalled();
    });
  });

  describe('trackUserEngagement', () => {
    it('should track user actions with correct tags', () => {
      trackUserEngagement('mood_logged', 'mood_tracking', {
        rating: 8,
        timestamp: Date.now()
      });

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'User engagement event',
        {
          level: 'info',
          tags: {
            action: 'mood_logged',
            feature: 'mood_tracking',
            user_type: 'engagement'
          },
          extra: {
            rating: 8,
            timestamp: expect.any(Number),
          }
        }
      );
    });
  });

  describe('trackCrisisDetection', () => {
    it('should track crisis detection events', () => {
      trackCrisisDetection('high', 'journal');

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'Crisis detection triggered',
        {
          level: 'info',
          tags: {
            severity: 'high',
            content_type: 'journal',
            service: 'crisis_detection'
          },
          extra: {
            detection_timestamp: expect.any(String),
          }
        }
      );
    });
  });

  describe('Mental Health Safety', () => {
    it('should track AI service errors specifically', () => {
      ENV.IS_DEV = false;
      initSentry();

      const integrations = Sentry.init.mock.calls[0][0].integrations;

      // Find the AI service integration
      const aiIntegration = integrations.find(
        (integration) => integration.name === 'AIServiceIntegration'
      );

      expect(aiIntegration).toBeDefined();

      // Mock console.error to trigger Sentry capture
      const originalConsoleError = console.error;
      console.error = jest.fn();

      aiIntegration.setupOnce();
      console.error('AI_SERVICE_ERROR: Test error');

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        { tags: { service: 'ai_service' } }
      );

      // Restore console.error
      console.error = originalConsoleError;
    });

    it('should track journal errors separately', () => {
      ENV.IS_DEV = false;
      initSentry();

      const integrations = Sentry.init.mock.calls[0][0].integrations;

      // Find the journal integration
      const journalIntegration = integrations.find(
        (integration) => integration.name === 'JournalIntegration'
      );

      expect(journalIntegration).toBeDefined();

      // Mock console.error to trigger Sentry capture
      const originalConsoleError = console.error;
      console.error = jest.fn();

      journalIntegration.setupOnce();
      console.error('JOURNAL_ERROR: Test journal error');

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        { tags: { service: 'journal' } }
      );

      // Restore console.error
      console.error = originalConsoleError;
    });

    it('should track chat/moderation errors', () => {
      ENV.IS_DEV = false;
      initSentry();

      const integrations = Sentry.init.mock.calls[0][0].integrations;

      // Find the chat integration
      const chatIntegration = integrations.find(
        (integration) => integration.name === 'ChatIntegration'
      );

      expect(chatIntegration).toBeDefined();

      // Mock console.error to trigger Sentry capture
      const originalConsoleError = console.error;
      console.error = jest.fn();

      chatIntegration.setupOnce();
      console.error('CHAT_ERROR: Test chat error');

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        { tags: { service: 'chat' } }
      );

      // Restore console.error
      console.error = originalConsoleError;
    });
  });
});
