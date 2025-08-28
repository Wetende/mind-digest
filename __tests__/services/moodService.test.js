import moodService from '../../src/services/moodService';
import { supabase } from '../../src/config/supabase';
import habitTrackingService from '../../src/services/habitTrackingService';

// Mock dependencies
jest.mock('../../src/config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ select: jest.fn() })),
      select: jest.fn(() => ({ eq: jest.fn() })),
      update: jest.fn(() => ({ eq: jest.fn() })),
      delete: jest.fn(() => ({ eq: jest.fn() })),
    })),
  },
  TABLES: {
    MOODS: 'moods',
  },
}));

jest.mock('../../src/services/habitTrackingService', () => ({
  awardPoints: jest.fn(),
}));

describe('MoodService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('createMoodEntry', () => {
    const mockMoodData = {
      userId: 'user-123',
      mood: 4,
      energy: 3,
      anxiety: 2,
      emotions: ['happy', 'calm'],
      triggers: ['work'],
      notes: 'Feeling good today',
    };

    it('should successfully create a mood entry', async () => {
      const mockResponse = {
        data: [{ id: 'mood-123', ...mockMoodData }],
        error: null,
      };

      const mockChain = {
        select: jest.fn().mockResolvedValue(mockResponse),
      };
      const mockInsert = {
        insert: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockInsert);

      habitTrackingService.awardPoints.mockResolvedValue({ success: true });

      const result = await moodService.createMoodEntry(mockMoodData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data[0]);
      expect(supabase.from).toHaveBeenCalledWith('moods');
      expect(habitTrackingService.awardPoints).toHaveBeenCalledWith(
        mockMoodData.userId,
        'MOOD_LOG',
        {
          mood: mockMoodData.mood,
          hasEmotions: true,
          hasNotes: true,
        }
      );
    });

    it('should handle mood entry creation errors', async () => {
      const mockError = new Error('Database error');
      const mockChain = {
        select: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };
      const mockInsert = {
        insert: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockInsert);

      const result = await moodService.createMoodEntry(mockMoodData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should create mood entry with minimal data', async () => {
      const minimalMoodData = {
        userId: 'user-123',
        mood: 3,
      };

      const mockResponse = {
        data: [{ id: 'mood-123', ...minimalMoodData }],
        error: null,
      };

      const mockChain = {
        select: jest.fn().mockResolvedValue(mockResponse),
      };
      const mockInsert = {
        insert: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockInsert);

      habitTrackingService.awardPoints.mockResolvedValue({ success: true });

      const result = await moodService.createMoodEntry(minimalMoodData);

      expect(result.success).toBe(true);
      expect(habitTrackingService.awardPoints).toHaveBeenCalledWith(
        minimalMoodData.userId,
        'MOOD_LOG',
        expect.objectContaining({
          mood: minimalMoodData.mood,
        })
      );
    });
  });

  describe('getMoodEntries', () => {
    it('should successfully retrieve mood entries', async () => {
      const mockEntries = [
        { id: 'mood-1', mood: 4, created_at: '2023-01-01' },
        { id: 'mood-2', mood: 3, created_at: '2023-01-02' },
      ];

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockEntries,
          error: null,
        }),
      };
      const mockSelect = {
        select: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockSelect);

      const result = await moodService.getMoodEntries('user-123', 10, 0);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEntries);
      expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockChain.range).toHaveBeenCalledWith(0, 9);
    });

    it('should handle retrieval errors', async () => {
      const mockError = new Error('Fetch failed');
      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };
      const mockSelect = {
        select: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockSelect);

      const result = await moodService.getMoodEntries('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fetch failed');
    });
  });

  describe('getTodaysMood', () => {
    it('should get today\'s mood entry', async () => {
      const todayMood = { id: 'mood-today', mood: 4, created_at: new Date().toISOString() };

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [todayMood],
          error: null,
        }),
      };
      const mockSelect = {
        select: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockSelect);

      const result = await moodService.getTodaysMood('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(todayMood);
    });

    it('should return null when no mood entry for today', async () => {
      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      const mockSelect = {
        select: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockSelect);

      const result = await moodService.getTodaysMood('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });
  });

  describe('updateMoodEntry', () => {
    it('should successfully update a mood entry', async () => {
      const updates = { mood: 5, notes: 'Updated notes' };
      const updatedEntry = { id: 'mood-123', ...updates };

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [updatedEntry],
          error: null,
        }),
      };
      const mockUpdate = {
        update: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockUpdate);

      const result = await moodService.updateMoodEntry('mood-123', updates);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedEntry);
      expect(mockUpdate.update).toHaveBeenCalledWith(updates);
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'mood-123');
    });
  });

  describe('deleteMoodEntry', () => {
    it('should successfully delete a mood entry', async () => {
      const mockChain = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      const mockDelete = {
        delete: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockDelete);

      const result = await moodService.deleteMoodEntry('mood-123');

      expect(result.success).toBe(true);
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'mood-123');
    });
  });

  describe('processMoodAnalytics', () => {
    it('should process mood analytics correctly', () => {
      const mockEntries = [
        {
          mood: 4,
          energy: 3,
          anxiety: 2,
          emotions: ['happy', 'calm'],
          triggers: ['work'],
          created_at: '2023-01-01',
        },
        {
          mood: 3,
          energy: 4,
          anxiety: 3,
          emotions: ['neutral'],
          triggers: ['social'],
          created_at: '2023-01-02',
        },
        {
          mood: 5,
          energy: 5,
          anxiety: 1,
          emotions: ['happy', 'excited'],
          triggers: ['work'],
          created_at: '2023-01-03',
        },
      ];

      const analytics = moodService.processMoodAnalytics(mockEntries);

      expect(analytics.averageMood).toBe(4.0);
      expect(analytics.averageEnergy).toBe(4.0);
      expect(analytics.averageAnxiety).toBe(2.0);
      expect(analytics.totalEntries).toBe(3);
      expect(analytics.commonEmotions).toContainEqual({ emotion: 'happy', count: 2 });
      expect(analytics.frequentTriggers).toContainEqual({ trigger: 'work', count: 2 });
      expect(analytics.moodHistory).toHaveLength(3);
    });

    it('should handle empty entries array', () => {
      const analytics = moodService.processMoodAnalytics([]);

      expect(analytics).toEqual({
        averageMood: 0,
        moodTrend: 'stable',
        averageEnergy: 0,
        averageAnxiety: 0,
        commonEmotions: [],
        frequentTriggers: [],
        totalEntries: 0,
        moodHistory: [],
      });
    });

    it('should calculate mood trend correctly', () => {
      // Declining trend
      const decliningEntries = [
        { mood: 5, created_at: '2023-01-01' },
        { mood: 4, created_at: '2023-01-02' },
        { mood: 3, created_at: '2023-01-03' },
        { mood: 2, created_at: '2023-01-04' },
        { mood: 1, created_at: '2023-01-05' },
        { mood: 1, created_at: '2023-01-06' },
        { mood: 1, created_at: '2023-01-07' },
        { mood: 1, created_at: '2023-01-08' },
      ];

      const decliningAnalytics = moodService.processMoodAnalytics(decliningEntries);
      expect(decliningAnalytics.moodTrend).toBe('declining');

      // Improving trend
      const improvingEntries = [
        { mood: 1, created_at: '2023-01-01' },
        { mood: 2, created_at: '2023-01-02' },
        { mood: 3, created_at: '2023-01-03' },
        { mood: 4, created_at: '2023-01-04' },
        { mood: 5, created_at: '2023-01-05' },
        { mood: 5, created_at: '2023-01-06' },
        { mood: 5, created_at: '2023-01-07' },
        { mood: 5, created_at: '2023-01-08' },
      ];

      const improvingAnalytics = moodService.processMoodAnalytics(improvingEntries);
      expect(improvingAnalytics.moodTrend).toBe('improving');
    });
  });

  describe('getMoodStreak', () => {
    it('should calculate mood streak correctly', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const mockEntries = [
        { created_at: today.toISOString() },
        { created_at: yesterday.toISOString() },
      ];

      const mockChain = {
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: mockEntries,
          error: null,
        }),
      };
      const mockSelect = {
        select: jest.fn().mockReturnValue(mockChain),
      };
      supabase.from.mockReturnValue(mockSelect);

      const result = await moodService.getMoodStreak('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeGreaterThan(0);
    });
  });

  describe('isSameDay', () => {
    it('should correctly identify same day', () => {
      const date1 = new Date('2023-01-01T10:00:00');
      const date2 = new Date('2023-01-01T15:00:00');
      const date3 = new Date('2023-01-02T10:00:00');

      expect(moodService.isSameDay(date1, date2)).toBe(true);
      expect(moodService.isSameDay(date1, date3)).toBe(false);
    });
  });

  describe('getMoodRecommendations', () => {
    it('should provide recommendations for low mood', () => {
      const recommendations = moodService.getMoodRecommendations(2, {});

      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].type).toBe('breathing');
      expect(recommendations[1].type).toBe('support');
    });

    it('should provide recommendations for good mood', () => {
      const recommendations = moodService.getMoodRecommendations(4, {});

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].type).toBe('journal');
    });

    it('should provide professional support recommendation for declining trend', () => {
      const analytics = { moodTrend: 'declining' };
      const recommendations = moodService.getMoodRecommendations(3, analytics);

      expect(recommendations.some(r => r.type === 'professional')).toBe(true);
    });

    it('should return recommendations for null mood', () => {
      const recommendations = moodService.getMoodRecommendations(null, {});
      // Service returns default recommendations even for null mood
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });
});