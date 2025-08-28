import moodService from '../../src/services/moodService';
import { supabase } from '../../src/config/supabase';

// Mock Supabase
jest.mock('../../src/config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    })),
  },
  TABLES: {
    MOODS: 'moods',
  },
}));

describe('MoodService', () => {
  let mockSupabaseChain;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock chain that can be reused
    mockSupabaseChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };
    
    supabase.from.mockReturnValue(mockSupabaseChain);
  });

  describe('createMoodEntry', () => {
    it('should create a mood entry successfully', async () => {
      const mockMoodData = {
        userId: 'user123',
        mood: 4,
        energy: 3,
        anxiety: 2,
        emotions: ['happy', 'calm'],
        triggers: ['work'],
        notes: 'Good day overall',
      };

      const mockResponse = {
        id: 'mood123',
        user_id: 'user123',
        mood: 4,
        energy: 3,
        anxiety: 2,
        emotions: ['happy', 'calm'],
        triggers: ['work'],
        notes: 'Good day overall',
        created_at: '2024-01-15T12:00:00Z',
      };

      mockSupabaseChain.select.mockResolvedValue({
        data: [mockResponse],
        error: null,
      });

      const result = await moodService.createMoodEntry(mockMoodData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(supabase.from).toHaveBeenCalledWith('moods');
      expect(mockSupabaseChain.insert).toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      const mockMoodData = {
        userId: 'user123',
        mood: 4,
      };

      mockSupabaseChain.select.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await moodService.createMoodEntry(mockMoodData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getMoodEntries', () => {
    it('should retrieve mood entries for a user', async () => {
      const mockEntries = [
        { id: 'mood1', mood: 4, created_at: '2024-01-15T12:00:00Z' },
        { id: 'mood2', mood: 3, created_at: '2024-01-14T12:00:00Z' },
      ];

      mockSupabaseChain.range.mockResolvedValue({
        data: mockEntries,
        error: null,
      });

      const result = await moodService.getMoodEntries('user123', 10, 0);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEntries);
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('user_id', 'user123');
      expect(mockSupabaseChain.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockSupabaseChain.range).toHaveBeenCalledWith(0, 9);
    });

    it('should handle retrieval errors', async () => {
      mockSupabaseChain.range.mockResolvedValue({
        data: null,
        error: { message: 'Fetch error' },
      });

      const result = await moodService.getMoodEntries('user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fetch error');
    });
  });

  describe('getTodaysMood', () => {
    it('should retrieve today\'s mood entry', async () => {
      const mockTodaysMood = {
        id: 'mood123',
        mood: 4,
        created_at: '2024-01-15T12:00:00Z',
      };

      mockSupabaseChain.limit.mockResolvedValue({
        data: [mockTodaysMood],
        error: null,
      });

      const result = await moodService.getTodaysMood('user123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTodaysMood);
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('user_id', 'user123');
      expect(mockSupabaseChain.limit).toHaveBeenCalledWith(1);
    });

    it('should return null when no mood entry exists for today', async () => {
      mockSupabaseChain.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await moodService.getTodaysMood('user123');

      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
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
          created_at: '2024-01-15T12:00:00Z',
        },
        {
          mood: 3,
          energy: 2,
          anxiety: 3,
          emotions: ['tired', 'calm'],
          triggers: ['sleep'],
          created_at: '2024-01-14T12:00:00Z',
        },
        {
          mood: 5,
          energy: 4,
          anxiety: 1,
          emotions: ['happy', 'excited'],
          triggers: ['exercise'],
          created_at: '2024-01-13T12:00:00Z',
        },
      ];

      const analytics = moodService.processMoodAnalytics(mockEntries);

      expect(analytics.averageMood).toBe(4);
      expect(analytics.averageEnergy).toBe(3);
      expect(analytics.averageAnxiety).toBe(2);
      expect(analytics.totalEntries).toBe(3);
      expect(analytics.commonEmotions).toEqual([
        { emotion: 'happy', count: 2 },
        { emotion: 'calm', count: 2 },
        { emotion: 'tired', count: 1 },
        { emotion: 'excited', count: 1 },
      ]);
      expect(analytics.frequentTriggers).toEqual([
        { trigger: 'work', count: 1 },
        { trigger: 'sleep', count: 1 },
        { trigger: 'exercise', count: 1 },
      ]);
      expect(analytics.moodHistory).toHaveLength(3);
    });

    it('should handle empty entries', () => {
      const analytics = moodService.processMoodAnalytics([]);

      expect(analytics.averageMood).toBe(0);
      expect(analytics.averageEnergy).toBe(0);
      expect(analytics.averageAnxiety).toBe(0);
      expect(analytics.totalEntries).toBe(0);
      expect(analytics.commonEmotions).toEqual([]);
      expect(analytics.frequentTriggers).toEqual([]);
      expect(analytics.moodTrend).toBe('stable');
    });

    it('should calculate mood trends correctly', () => {
      // Improving trend
      const improvingEntries = [
        { mood: 2, created_at: '2024-01-10T12:00:00Z' },
        { mood: 3, created_at: '2024-01-11T12:00:00Z' },
        { mood: 4, created_at: '2024-01-12T12:00:00Z' },
        { mood: 4, created_at: '2024-01-13T12:00:00Z' },
        { mood: 5, created_at: '2024-01-14T12:00:00Z' },
        { mood: 5, created_at: '2024-01-15T12:00:00Z' },
        { mood: 5, created_at: '2024-01-16T12:00:00Z' },
        { mood: 5, created_at: '2024-01-17T12:00:00Z' },
      ];

      const improvingAnalytics = moodService.processMoodAnalytics(improvingEntries);
      expect(improvingAnalytics.moodTrend).toBe('improving');

      // Declining trend
      const decliningEntries = [
        { mood: 5, created_at: '2024-01-10T12:00:00Z' },
        { mood: 4, created_at: '2024-01-11T12:00:00Z' },
        { mood: 4, created_at: '2024-01-12T12:00:00Z' },
        { mood: 3, created_at: '2024-01-13T12:00:00Z' },
        { mood: 2, created_at: '2024-01-14T12:00:00Z' },
        { mood: 2, created_at: '2024-01-15T12:00:00Z' },
        { mood: 1, created_at: '2024-01-16T12:00:00Z' },
        { mood: 1, created_at: '2024-01-17T12:00:00Z' },
      ];

      const decliningAnalytics = moodService.processMoodAnalytics(decliningEntries);
      expect(decliningAnalytics.moodTrend).toBe('declining');
    });
  });

  describe('isSameDay', () => {
    it('should correctly identify same days', () => {
      const date1 = new Date('2024-01-15T10:00:00Z');
      const date2 = new Date('2024-01-15T20:00:00Z');
      const date3 = new Date('2024-01-16T10:00:00Z');

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

    it('should provide recommendations for high mood', () => {
      const recommendations = moodService.getMoodRecommendations(4, {});

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].type).toBe('journal');
    });

    it('should provide professional support recommendation for declining trend', () => {
      const analytics = { moodTrend: 'declining' };
      const recommendations = moodService.getMoodRecommendations(3, analytics);

      expect(recommendations.some(r => r.type === 'professional')).toBe(true);
    });

    it('should handle empty analytics', () => {
      const recommendations = moodService.getMoodRecommendations(3, null);
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('updateMoodEntry', () => {
    it('should update mood entry successfully', async () => {
      const mockUpdatedEntry = {
        id: 'mood123',
        mood: 5,
        notes: 'Updated notes',
      };

      mockSupabaseChain.select.mockResolvedValue({
        data: [mockUpdatedEntry],
        error: null,
      });

      const result = await moodService.updateMoodEntry('mood123', { mood: 5, notes: 'Updated notes' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedEntry);
      expect(mockSupabaseChain.update).toHaveBeenCalledWith({ mood: 5, notes: 'Updated notes' });
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'mood123');
    });
  });

  describe('deleteMoodEntry', () => {
    it('should delete mood entry successfully', async () => {
      mockSupabaseChain.delete.mockResolvedValue({
        error: null,
      });

      const result = await moodService.deleteMoodEntry('mood123');

      expect(result.success).toBe(true);
      expect(mockSupabaseChain.delete).toHaveBeenCalled();
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'mood123');
    });

    it('should handle deletion errors', async () => {
      mockSupabaseChain.delete.mockResolvedValue({
        error: { message: 'Delete failed' },
      });

      const result = await moodService.deleteMoodEntry('mood123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Delete failed');
    });
  });
});