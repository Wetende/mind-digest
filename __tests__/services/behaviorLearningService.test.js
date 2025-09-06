// Mock environment variables first
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock dependencies
jest.mock('../../src/config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn()
    },
    from: jest.fn()
  }
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
}));

jest.mock('../../src/services/aiService', () => ({
  generateContextualAdaptations: jest.fn(),
  generateContentRecommendations: jest.fn(),
  generatePeerRecommendations: jest.fn(),
  generatePersonalizedRecommendations: jest.fn()
}));

import behaviorLearningService from '../../src/services/behaviorLearningService';
import { supabase } from '../../src/config/supabase';

describe('BehaviorLearningService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Supabase auth
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } }
    });
    
    // Mock Supabase database operations
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockResolvedValue({ data: [], error: null })
    });
  });

  describe('User Interaction Tracking', () => {
    test('should track user interactions with context', async () => {
      const interactionData = {
        completed: true,
        userRating: 4,
        effectivenessScore: 0.8
      };

      const result = await behaviorLearningService.trackInteraction(
        'mood_log',
        interactionData
      );

      expect(result).toBeTruthy();
      expect(result.type).toBe('mood_log');
      expect(result.data).toEqual(interactionData);
      expect(result.context).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    test('should persist interactions to database', async () => {
      const interactionData = { completed: true };
      
      await behaviorLearningService.trackInteraction('journal_entry', interactionData);

      expect(supabase.from).toHaveBeenCalledWith('user_behavior_data');
    });

    test('should apply real-time adaptations', async () => {
      const interactionData = {
        completed: true,
        userRating: 5,
        effectivenessScore: 0.9
      };

      await behaviorLearningService.trackInteraction('breathing_exercise', interactionData);

      // Check that adaptations were applied
      expect(behaviorLearningService.realTimeAdaptations.size).toBeGreaterThan(0);
    });
  });

  describe('Content Recommendations', () => {
    test('should generate personalized content recommendations', async () => {
      // Mock some interaction history
      behaviorLearningService.userInteractions.set('test_1', {
        type: 'breathing_exercise',
        data: { completed: true, userRating: 5 },
        timestamp: Date.now(),
        context: { timeOfDay: 'morning', mood: { emotion: 'anxious' } }
      });

      const recommendations = await behaviorLearningService.generateContentRecommendations();

      expect(recommendations).toBeDefined();
      expect(recommendations.personalizedContent).toBeDefined();
      expect(Array.isArray(recommendations.personalizedContent)).toBe(true);
      expect(recommendations.confidence).toBeDefined();
    });

    test('should adapt recommendations based on mood', async () => {
      const baseRecommendations = {
        personalizedContent: [
          { type: 'breathing_exercise', score: 0.5 },
          { type: 'social_activity', score: 0.6 }
        ]
      };

      const context = {
        mood: { emotion: 'anxious', confidence: 0.8 },
        timeOfDay: 'evening'
      };

      const adaptedRecs = await behaviorLearningService.adaptRecommendationsRealTime(
        baseRecommendations,
        context
      );

      expect(adaptedRecs.personalizedContent).toBeDefined();
      
      // Breathing exercise should be boosted for anxiety
      const breathingRec = adaptedRecs.personalizedContent.find(
        rec => rec.type === 'breathing_exercise'
      );
      expect(breathingRec.score).toBeGreaterThan(0.5);
    });
  });

  describe('Peer Recommendations', () => {
    test('should generate peer recommendations based on compatibility', async () => {
      // Mock user profile
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'test-user-id',
            mental_health_interests: ['anxiety', 'mindfulness'],
            shared_experiences: ['social_anxiety'],
            preferred_communication_style: 'supportive'
          }
        })
      });

      // Mock potential peers
      const mockPeers = [
        {
          id: 'peer-1',
          display_name: 'Peer 1',
          mental_health_interests: ['anxiety', 'depression'],
          shared_experiences: ['social_anxiety'],
          preferred_communication_style: 'supportive'
        }
      ];

      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockPeers, error: null })
      });

      const recommendations = await behaviorLearningService.generatePeerRecommendations();

      expect(recommendations).toBeDefined();
      expect(recommendations.supportPartners).toBeDefined();
      expect(Array.isArray(recommendations.supportPartners)).toBe(true);
    });

    test('should calculate peer compatibility correctly', async () => {
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
    });
  });

  describe('Real-time Adaptation', () => {
    test('should generate adaptation key from context', () => {
      const context = {
        timeOfDay: 'morning',
        dayOfWeek: 1,
        mood: { emotion: 'happy' }
      };

      const key = behaviorLearningService.generateAdaptationKey(context);
      expect(key).toBe('morning_1_happy');
    });

    test('should calculate adaptation score correctly', () => {
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

    test('should apply stress-based adaptations', () => {
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
  });

  describe('Content Interaction Tracking', () => {
    test('should track content interactions', async () => {
      await behaviorLearningService.trackContentInteraction(
        'breathing_exercise',
        'exercise_1',
        'complete',
        {
          duration: 300,
          completionPercentage: 100,
          userRating: 5
        }
      );

      expect(supabase.from).toHaveBeenCalledWith('content_interactions');
    });

    test('should track peer interactions', async () => {
      await behaviorLearningService.trackPeerInteraction(
        'peer-id',
        'message',
        {
          quality: 'positive',
          mutualRating: 4
        }
      );

      expect(supabase.from).toHaveBeenCalledWith('peer_interactions');
    });
  });

  describe('Pattern Learning', () => {
    test('should learn user patterns from interactions', async () => {
      // Add some mock interactions
      behaviorLearningService.userInteractions.set('interaction_1', {
        type: 'mood_log',
        data: { mood: 4, completed: true },
        timestamp: Date.now() - 86400000, // 1 day ago
        context: { timeOfDay: 'morning', dayOfWeek: 1 }
      });

      behaviorLearningService.userInteractions.set('interaction_2', {
        type: 'breathing_exercise',
        data: { completed: true, userRating: 5 },
        timestamp: Date.now() - 43200000, // 12 hours ago
        context: { timeOfDay: 'evening', dayOfWeek: 1 }
      });

      const patterns = await behaviorLearningService.learnUserPatterns();

      expect(patterns).toBeDefined();
      expect(patterns.timePreferences).toBeDefined();
      expect(patterns.contentPreferences).toBeDefined();
      expect(patterns.engagementPatterns).toBeDefined();
    });

    test('should analyze time preferences correctly', () => {
      // Add interactions at different times
      behaviorLearningService.userInteractions.set('morning_1', {
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
      expect(timePrefs.morning.mood_log).toBe(1);
      expect(timePrefs.evening.breathing_exercise).toBe(1);
    });
  });

  describe('Fallback Mechanisms', () => {
    test('should provide fallback content recommendations', () => {
      const fallback = behaviorLearningService.getFallbackContentRecommendations();

      expect(fallback).toBeDefined();
      expect(fallback.personalizedContent).toBeDefined();
      expect(Array.isArray(fallback.personalizedContent)).toBe(true);
      expect(fallback.personalizedContent.length).toBeGreaterThan(0);
    });

    test('should provide fallback peer recommendations', () => {
      const fallback = behaviorLearningService.getFallbackPeerRecommendations();

      expect(fallback).toBeDefined();
      expect(fallback.supportPartners).toBeDefined();
      expect(Array.isArray(fallback.supportPartners)).toBe(true);
    });
  });
});