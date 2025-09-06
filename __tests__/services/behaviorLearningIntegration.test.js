// Integration test for behavior learning system
// Mock environment variables first
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock dependencies with proper structure
jest.mock('../../src/config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      })
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockResolvedValue({ data: [], error: null })
    })
  }
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null)
}));

jest.mock('../../src/services/aiService', () => ({
  default: {
    generateContextualAdaptations: jest.fn().mockResolvedValue([]),
    generateContentRecommendations: jest.fn().mockResolvedValue(null),
    generatePeerRecommendations: jest.fn().mockResolvedValue(null),
    generatePersonalizedRecommendations: jest.fn().mockResolvedValue(null),
    analyzeMoodPatterns: jest.fn().mockResolvedValue(null)
  }
}));

import behaviorLearningService from '../../src/services/behaviorLearningService';

describe('BehaviorLearningService Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear any existing data
    behaviorLearningService.userInteractions.clear();
    behaviorLearningService.preferences.clear();
    behaviorLearningService.realTimeAdaptations.clear();
  });

  describe('Core Functionality', () => {
    test('should initialize without errors', () => {
      expect(behaviorLearningService).toBeDefined();
      expect(behaviorLearningService.userInteractions).toBeDefined();
      expect(behaviorLearningService.preferences).toBeDefined();
      expect(behaviorLearningService.realTimeAdaptations).toBeDefined();
    });

    test('should generate adaptation key correctly', () => {
      const context = {
        timeOfDay: 'morning',
        dayOfWeek: 1,
        mood: { emotion: 'happy' }
      };

      const key = behaviorLearningService.generateAdaptationKey(context);
      expect(key).toBe('morning_1_happy');
    });

    test('should calculate adaptation score', () => {
      const data = {
        userRating: 4,
        completed: true,
        effectivenessScore: 0.8
      };

      const context = {
        mood: { confidence: 0.9 }
      };

      const score = behaviorLearningService.calculateAdaptationScore(data, context);
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThanOrEqual(1);
    });

    test('should normalize mood correctly', () => {
      expect(behaviorLearningService.normalizeMood('joy')).toBe('happy');
      expect(behaviorLearningService.normalizeMood('sadness')).toBe('sad');
      expect(behaviorLearningService.normalizeMood('anxiety')).toBe('anxious');
      expect(behaviorLearningService.normalizeMood('unknown')).toBe('neutral');
    });
  });

  describe('Content Filtering and Adaptation', () => {
    test('should filter content by mood', () => {
      const recommendations = {
        personalizedContent: [
          { type: 'breathing_exercise', score: 0.5 },
          { type: 'social_activity', score: 0.6 },
          { type: 'learning', score: 0.4 }
        ]
      };

      const mood = { emotion: 'anxious', confidence: 0.8 };

      const filtered = behaviorLearningService.filterContentByMood(recommendations, mood);
      
      // Breathing exercise should be boosted for anxiety
      const breathingRec = filtered.personalizedContent.find(
        rec => rec.type === 'breathing_exercise'
      );
      expect(breathingRec.score).toBeGreaterThan(0.5);
      expect(breathingRec.moodBoost).toBe(true);
    });

    test('should apply stress-based adaptations for high stress', () => {
      const recommendations = {
        personalizedContent: [
          { type: 'breathing_exercise', score: 0.5 },
          { type: 'social_activity', score: 0.7 },
          { type: 'learning', score: 0.6 }
        ]
      };

      const context = {
        anxietyLevel: 8,
        stressLevel: 7
      };

      const adapted = behaviorLearningService.applyStressBasedAdaptations(
        recommendations,
        context
      );

      expect(adapted.stressLevel).toBe('critical');
      expect(adapted.immediateAction).toBe(true);
      
      // Should only show crisis-appropriate content
      const hasOnlyCrisisContent = adapted.personalizedContent.every(
        content => ['breathing_exercise', 'crisis_support', 'emergency_contact'].includes(content.type)
      );
      expect(hasOnlyCrisisContent).toBe(true);
    });

    test('should prioritize content by time of day', () => {
      const recommendations = {
        personalizedContent: [
          { type: 'physical_exercise', score: 0.5 },
          { type: 'meditation', score: 0.5 }
        ]
      };

      const context = { timeOfDay: 'morning' };

      const prioritized = behaviorLearningService.prioritizeContentByTime(
        recommendations,
        context
      );

      const exerciseRec = prioritized.personalizedContent.find(
        rec => rec.type === 'physical_exercise'
      );
      expect(exerciseRec.score).toBeGreaterThan(0.5);
      expect(exerciseRec.timeOptimized).toBe(true);
    });
  });

  describe('Peer Compatibility', () => {
    test('should calculate peer compatibility score', () => {
      const userProfile = {
        id: 'user-1',
        mental_health_interests: ['anxiety', 'mindfulness'],
        shared_experiences: ['social_anxiety'],
        preferred_communication_style: 'supportive',
        age_range: '25-35'
      };

      const peer = {
        id: 'peer-1',
        mental_health_interests: ['anxiety', 'depression'],
        shared_experiences: ['social_anxiety'],
        preferred_communication_style: 'supportive',
        age_range: '25-35'
      };

      const compatibility = behaviorLearningService.calculatePeerCompatibility(
        userProfile,
        peer,
        {}
      );

      expect(compatibility).toBeGreaterThan(0);
      expect(compatibility).toBeLessThanOrEqual(1);
      
      // Should have high compatibility due to shared interests and experiences
      expect(compatibility).toBeGreaterThan(0.5);
    });

    test('should categorize activity levels', () => {
      const highEngagement = {
        averageSessionLength: 35,
        sessionFrequency: { 1: 2, 2: 3, 3: 2 } // Total: 7
      };

      const mediumEngagement = {
        averageSessionLength: 20,
        sessionFrequency: { 1: 1, 2: 2 } // Total: 3
      };

      const lowEngagement = {
        averageSessionLength: 10,
        sessionFrequency: { 1: 1 } // Total: 1
      };

      expect(behaviorLearningService.categorizeActivityLevel(highEngagement)).toBe('high');
      expect(behaviorLearningService.categorizeActivityLevel(mediumEngagement)).toBe('medium');
      expect(behaviorLearningService.categorizeActivityLevel(lowEngagement)).toBe('low');
    });

    test('should check activity level compatibility', () => {
      expect(behaviorLearningService.areActivityLevelsCompatible('high', 'high')).toBe(true);
      expect(behaviorLearningService.areActivityLevelsCompatible('high', 'medium')).toBe(true);
      expect(behaviorLearningService.areActivityLevelsCompatible('high', 'low')).toBe(false);
      expect(behaviorLearningService.areActivityLevelsCompatible('medium', 'low')).toBe(true);
    });
  });

  describe('Pattern Analysis', () => {
    test('should analyze time preferences from interactions', () => {
      // Clear existing interactions
      behaviorLearningService.userInteractions.clear();

      // Add test interactions
      behaviorLearningService.userInteractions.set('morning_1', {
        type: 'mood_log',
        context: { timeOfDay: 'morning' }
      });

      behaviorLearningService.userInteractions.set('morning_2', {
        type: 'mood_log',
        context: { timeOfDay: 'morning' }
      });

      behaviorLearningService.userInteractions.set('evening_1', {
        type: 'breathing_exercise',
        context: { timeOfDay: 'evening' }
      });

      const timePrefs = behaviorLearningService.analyzeTimePreferences();

      expect(timePrefs.morning).toBeDefined();
      expect(timePrefs.evening).toBeDefined();
      expect(timePrefs.morning.mood_log).toBe(2);
      expect(timePrefs.evening.breathing_exercise).toBe(1);
    });

    test('should analyze content preferences', () => {
      // Set up preferences
      behaviorLearningService.preferences.set('breathing_exercise', {
        frequency: 10,
        effectiveness: 0.8,
        userRating: 4
      });

      behaviorLearningService.preferences.set('journaling', {
        frequency: 5,
        effectiveness: 0.6,
        userRating: 3
      });

      const contentPrefs = behaviorLearningService.analyzeContentPreferences();

      expect(contentPrefs.activityTypes).toBeDefined();
      expect(contentPrefs.effectivenessScores).toBeDefined();
      expect(contentPrefs.userRatings).toBeDefined();
      
      expect(contentPrefs.activityTypes.breathing_exercise).toBe(10);
      expect(contentPrefs.effectivenessScores.breathing_exercise).toBe(0.8);
      expect(contentPrefs.userRatings.breathing_exercise).toBe(4);
    });
  });

  describe('Fallback Mechanisms', () => {
    test('should provide fallback content recommendations', () => {
      const fallback = behaviorLearningService.getFallbackContentRecommendations();

      expect(fallback).toBeDefined();
      expect(fallback.personalizedContent).toBeDefined();
      expect(Array.isArray(fallback.personalizedContent)).toBe(true);
      expect(fallback.personalizedContent.length).toBeGreaterThan(0);
      expect(fallback.confidence).toBeDefined();
      
      // Should include basic wellness activities
      const hasBreathing = fallback.personalizedContent.some(
        content => content.type === 'breathing_exercise'
      );
      expect(hasBreathing).toBe(true);
    });

    test('should provide fallback peer recommendations', () => {
      const fallback = behaviorLearningService.getFallbackPeerRecommendations();

      expect(fallback).toBeDefined();
      expect(fallback.supportPartners).toBeDefined();
      expect(Array.isArray(fallback.supportPartners)).toBe(true);
      expect(fallback.activityPartners).toBeDefined();
      expect(fallback.mentorConnections).toBeDefined();
      expect(fallback.confidence).toBeDefined();
    });
  });

  describe('Recommendation Merging', () => {
    test('should merge content recommendations correctly', () => {
      const list1 = [
        { type: 'breathing_exercise', score: 0.6, reason: 'Effective for you' }
      ];

      const list2 = [
        { type: 'breathing_exercise', score: 0.8, reason: 'AI recommended' },
        { type: 'meditation', score: 0.7, reason: 'New suggestion' }
      ];

      const merged = behaviorLearningService.mergeContentRecommendations(list1, list2);

      expect(merged.length).toBe(2);
      
      const breathingRec = merged.find(rec => rec.type === 'breathing_exercise');
      expect(breathingRec.score).toBeGreaterThanOrEqual(0.6); // Should combine scores
    });

    test('should merge peer recommendations correctly', () => {
      const list1 = [
        { id: 'peer-1', compatibilityScore: 0.6 }
      ];

      const list2 = [
        { id: 'peer-1', compatibilityScore: 0.8 },
        { id: 'peer-2', compatibilityScore: 0.7 }
      ];

      const merged = behaviorLearningService.mergePeerRecommendations(list1, list2);

      expect(merged.length).toBe(2);
      
      const peer1 = merged.find(peer => peer.id === 'peer-1');
      expect(peer1.compatibilityScore).toBeGreaterThanOrEqual(0.6);
    });
  });
});