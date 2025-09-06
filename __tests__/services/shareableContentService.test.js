import shareableContentService from '../../src/services/shareableContentService';

// Mock Supabase
jest.mock('../../src/config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              id: 'test-id',
              user_id: 'test-user',
              content_type: 'mood_update',
              base_content: { title: 'Test', content: 'Test content' },
              platform_content: {},
              is_anonymous: true,
              platforms: ['instagram'],
              created_at: new Date().toISOString()
            },
            error: null
          }))
        }))
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({
              data: [],
              error: null
            }))
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ error: null }))
        }))
      }))
    }))
  }
}));

describe('ShareableContentService', () => {
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateShareableContent', () => {
    it('should generate mood update content successfully', async () => {
      const contentData = {
        type: 'mood_update',
        message: 'Feeling great today!',
        mood: 8,
        platforms: ['instagram', 'x']
      };

      const result = await shareableContentService.generateShareableContent(
        contentData,
        mockUserId,
        true
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('mood_update');
      expect(result.isAnonymous).toBe(true);
      expect(result.platforms).toEqual(['instagram', 'x']);
      expect(result.baseContent).toBeDefined();
      expect(result.platformContent).toBeDefined();
    });

    it('should generate achievement content successfully', async () => {
      const contentData = {
        type: 'achievement',
        message: 'Completed my first week of meditation!',
        achievement: 'Meditation streak',
        platforms: ['instagram']
      };

      const result = await shareableContentService.generateShareableContent(
        contentData,
        mockUserId,
        false
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('achievement');
      expect(result.isAnonymous).toBe(false);
      expect(result.baseContent.title).toContain('Achievement');
    });

    it('should generate wellness tip content', async () => {
      const contentData = {
        type: 'tip',
        platforms: ['x', 'facebook']
      };

      const result = await shareableContentService.generateShareableContent(
        contentData,
        mockUserId,
        true
      );

      expect(result).toBeDefined();
      expect(result.type).toBe('tip');
      expect(result.baseContent.title).toContain('Wellness Tip');
      expect(result.baseContent.hashtags).toContain('#WellnessTip');
    });
  });

  describe('anonymizeContent', () => {
    it('should remove personal information from content', () => {
      const content = {
        title: 'My Story',
        content: 'My name is John Doe and my email is john@example.com. I live at 123 Main Street.',
        hashtags: ['#test']
      };

      const anonymized = shareableContentService.anonymizeContent(content, mockUserId);

      expect(anonymized.content).not.toContain('John Doe');
      expect(anonymized.content).not.toContain('john@example.com');
      expect(anonymized.content).not.toContain('123 Main Street');
      expect(anonymized.content).toContain('[name]');
      expect(anonymized.content).toContain('[email]');
      expect(anonymized.content).toContain('[address]');
      expect(anonymized.disclaimer).toBeDefined();
      expect(anonymized.anonymousId).toBeDefined();
    });

    it('should generate consistent anonymous ID for same user', () => {
      const content1 = { content: 'Test content 1' };
      const content2 = { content: 'Test content 2' };

      const anonymized1 = shareableContentService.anonymizeContent(content1, mockUserId);
      const anonymized2 = shareableContentService.anonymizeContent(content2, mockUserId);

      expect(anonymized1.anonymousId).toBe(anonymized2.anonymousId);
    });
  });

  describe('formatForPlatform', () => {
    const baseContent = {
      title: 'Test Title',
      content: 'Test content for sharing',
      hashtags: ['#test', '#mentalhealth'],
      category: 'mood'
    };

    it('should format content for Instagram', () => {
      const formatted = shareableContentService.formatForInstagram(baseContent, 'mood_update');

      expect(formatted.story).toBeDefined();
      expect(formatted.post).toBeDefined();
      expect(formatted.story.text).toContain('Test Title');
      expect(formatted.story.hashtags).toContain('#test');
      expect(formatted.post.caption).toContain('Test content');
    });

    it('should format content for X (Twitter)', () => {
      const formatted = shareableContentService.formatForX(baseContent, 'mood_update');

      expect(formatted.text).toBeDefined();
      expect(formatted.template).toBe('post');
      expect(formatted.text.length).toBeLessThanOrEqual(280);
    });

    it('should format content for TikTok', () => {
      const formatted = shareableContentService.formatForTikTok(baseContent, 'mood_update');

      expect(formatted.description).toBeDefined();
      expect(formatted.videoScript).toBeDefined();
      expect(formatted.duration).toBe(15);
      expect(formatted.template).toBe('video');
    });

    it('should format content for Facebook', () => {
      const formatted = shareableContentService.formatForFacebook(baseContent, 'mood_update');

      expect(formatted.message).toBeDefined();
      expect(formatted.privacy).toBe('friends');
      expect(formatted.template).toBe('post');
    });
  });

  describe('getMoodEmoji', () => {
    it('should return correct emoji for different mood levels', () => {
      expect(shareableContentService.getMoodEmoji(10)).toBe('😊');
      expect(shareableContentService.getMoodEmoji(8)).toBe('😊');
      expect(shareableContentService.getMoodEmoji(6)).toBe('🙂');
      expect(shareableContentService.getMoodEmoji(4)).toBe('😐');
      expect(shareableContentService.getMoodEmoji(2)).toBe('😔');
      expect(shareableContentService.getMoodEmoji(1)).toBe('😢');
    });
  });

  describe('getMoodText', () => {
    it('should return correct text for different mood levels', () => {
      expect(shareableContentService.getMoodText(10)).toBe('great');
      expect(shareableContentService.getMoodText(8)).toBe('great');
      expect(shareableContentService.getMoodText(6)).toBe('good');
      expect(shareableContentService.getMoodText(4)).toBe('okay');
      expect(shareableContentService.getMoodText(2)).toBe('low');
      expect(shareableContentService.getMoodText(1)).toBe('struggling');
    });
  });

  describe('getHashtagsForCategory', () => {
    it('should return appropriate hashtags for each category', () => {
      const gratitudeHashtags = shareableContentService.getHashtagsForCategory('gratitude');
      expect(gratitudeHashtags).toContain('#gratitude');
      expect(gratitudeHashtags).toContain('#thankful');

      const mindfulnessHashtags = shareableContentService.getHashtagsForCategory('mindfulness');
      expect(mindfulnessHashtags).toContain('#mindfulness');
      expect(mindfulnessHashtags).toContain('#present');

      const unknownHashtags = shareableContentService.getHashtagsForCategory('unknown');
      expect(unknownHashtags).toContain('#mentalhealth');
      expect(unknownHashtags).toContain('#wellness');
    });
  });

  describe('getColorForCategory', () => {
    it('should return appropriate colors for each category', () => {
      expect(shareableContentService.getColorForCategory('mood')).toBe('#87CEEB');
      expect(shareableContentService.getColorForCategory('achievement')).toBe('#98FB98');
      expect(shareableContentService.getColorForCategory('tip')).toBe('#FFD700');
      expect(shareableContentService.getColorForCategory('unknown')).toBe('#87CEEB');
    });
  });
});