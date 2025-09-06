import dailyPromptService from '../../src/services/dailyPromptService';

// Mock Supabase
jest.mock('../../src/config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: null,
              error: null
            }))
          })),
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'test-prompt-id',
              user_id: 'test-user',
              date: '2024-01-01',
              category: 'gratitude',
              prompt_text: 'What are you grateful for today?',
              is_completed: false,
              created_at: new Date().toISOString()
            },
            error: null
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                id: 'test-prompt-id',
                user_id: 'test-user',
                date: '2024-01-01',
                category: 'gratitude',
                prompt_text: 'What are you grateful for today?',
                is_completed: true,
                user_response: 'Test response',
                completed_at: new Date().toISOString(),
                created_at: new Date().toISOString()
              },
              error: null
            }))
          }))
        }))
      })),
      upsert: jest.fn(() => Promise.resolve({ error: null }))
    }))
  }
}));

describe('DailyPromptService', () => {
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTodaysPrompt', () => {
    it('should generate a new prompt for today', async () => {
      const result = await dailyPromptService.getTodaysPrompt(mockUserId);

      expect(result).toBeDefined();
      expect(result.category).toBeDefined();
      expect(result.promptText).toBeDefined();
      expect(result.sharingSuggestions).toBeDefined();
      expect(result.isCompleted).toBe(false);
    });

    it('should generate prompt with preferred categories', async () => {
      const preferredCategories = ['gratitude', 'mindfulness'];
      const result = await dailyPromptService.getTodaysPrompt(mockUserId, preferredCategories);

      expect(result).toBeDefined();
      expect(preferredCategories).toContain(result.category);
    });

    it('should return fallback prompt on error', async () => {
      // Mock Supabase to throw error
      const mockSupabase = require('../../src/config/supabase').supabase;
      mockSupabase.from.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const result = await dailyPromptService.getTodaysPrompt(mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe('fallback');
      expect(result.promptText).toBeDefined();
    });
  });

  describe('selectPromptCategory', () => {
    it('should select from preferred categories when provided', () => {
      const preferredCategories = ['gratitude', 'mindfulness'];
      const category = dailyPromptService.selectPromptCategory(preferredCategories);

      expect(preferredCategories).toContain(category);
    });

    it('should select random category when no preferences', () => {
      const category = dailyPromptService.selectPromptCategory([]);

      expect(Object.keys(dailyPromptService.promptCategories)).toContain(category);
    });

    it('should handle invalid preferred categories', () => {
      const preferredCategories = ['invalid_category'];
      const category = dailyPromptService.selectPromptCategory(preferredCategories);

      expect(Object.keys(dailyPromptService.promptCategories)).toContain(category);
    });
  });

  describe('selectPromptFromCategory', () => {
    it('should return a prompt from the specified category', () => {
      const category = 'gratitude';
      const prompt = dailyPromptService.selectPromptFromCategory(category, mockUserId);

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
      expect(dailyPromptService.promptTemplates.gratitude).toContain(prompt);
    });

    it('should fallback to reflection category for invalid category', () => {
      const category = 'invalid_category';
      const prompt = dailyPromptService.selectPromptFromCategory(category, mockUserId);

      expect(typeof prompt).toBe('string');
      expect(dailyPromptService.promptTemplates.reflection).toContain(prompt);
    });
  });

  describe('generateSharingSuggestions', () => {
    it('should generate suggestions for all platforms', () => {
      const category = 'gratitude';
      const suggestions = dailyPromptService.generateSharingSuggestions(category);

      expect(suggestions.instagram).toBeDefined();
      expect(suggestions.tiktok).toBeDefined();
      expect(suggestions.x).toBeDefined();
      expect(suggestions.facebook).toBeDefined();

      expect(suggestions.instagram.hashtags).toBeDefined();
      expect(suggestions.instagram.template).toBeDefined();
      expect(suggestions.x.characterLimit).toBe(280);
    });

    it('should include category-specific hashtags', () => {
      const category = 'gratitude';
      const suggestions = dailyPromptService.generateSharingSuggestions(category);

      expect(suggestions.instagram.hashtags).toContain('#gratitude');
      expect(suggestions.instagram.hashtags).toContain('#thankful');
    });
  });

  describe('completePrompt', () => {
    it('should mark prompt as completed with user response', async () => {
      const promptId = 'test-prompt-id';
      const userResponse = 'I am grateful for my family and friends.';

      const result = await dailyPromptService.completePrompt(promptId, userResponse);

      expect(result).toBeDefined();
      expect(result.isCompleted).toBe(true);
    });
  });

  describe('getPromptHistory', () => {
    it('should return formatted prompt history', async () => {
      const result = await dailyPromptService.getPromptHistory(mockUserId, 10);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getFallbackPrompt', () => {
    it('should return a valid fallback prompt', () => {
      const fallback = dailyPromptService.getFallbackPrompt();

      expect(fallback).toBeDefined();
      expect(fallback.id).toBe('fallback');
      expect(fallback.category).toBe('reflection');
      expect(fallback.promptText).toBeDefined();
      expect(fallback.sharingSuggestions).toBeDefined();
    });
  });

  describe('getHashtagsForCategory', () => {
    it('should return appropriate hashtags for each category', () => {
      const gratitudeHashtags = dailyPromptService.getHashtagsForCategory('gratitude');
      expect(gratitudeHashtags).toContain('#gratitude');
      expect(gratitudeHashtags).toContain('#thankful');

      const mindfulnessHashtags = dailyPromptService.getHashtagsForCategory('mindfulness');
      expect(mindfulnessHashtags).toContain('#mindfulness');
      expect(mindfulnessHashtags).toContain('#present');

      const unknownHashtags = dailyPromptService.getHashtagsForCategory('unknown');
      expect(unknownHashtags).toContain('#mentalhealth');
    });
  });

  describe('getColorForCategory', () => {
    it('should return appropriate colors for each category', () => {
      expect(dailyPromptService.getColorForCategory('gratitude')).toBe('#FFD700');
      expect(dailyPromptService.getColorForCategory('mindfulness')).toBe('#87CEEB');
      expect(dailyPromptService.getColorForCategory('growth')).toBe('#98FB98');
      expect(dailyPromptService.getColorForCategory('unknown')).toBe('#87CEEB');
    });
  });

  describe('getPromptAnalytics', () => {
    it('should return analytics with completion rate and streak', async () => {
      const analytics = await dailyPromptService.getPromptAnalytics(mockUserId);

      expect(analytics).toBeDefined();
      expect(analytics.totalPrompts).toBeDefined();
      expect(analytics.completedPrompts).toBeDefined();
      expect(analytics.completionRate).toBeDefined();
      expect(analytics.categoryBreakdown).toBeDefined();
      expect(analytics.streakDays).toBeDefined();
    });
  });

  describe('updatePromptPreferences', () => {
    it('should update user prompt preferences', async () => {
      const preferredCategories = ['gratitude', 'mindfulness', 'growth'];
      const result = await dailyPromptService.updatePromptPreferences(mockUserId, preferredCategories);

      expect(result).toBe(true);
    });
  });
});