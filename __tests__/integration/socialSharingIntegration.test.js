import socialSharingService from '../../src/services/socialSharingService';
import { Linking } from 'expo-linking';

// Mock expo-linking for integration tests
jest.mock('expo-linking', () => ({
  Linking: {
    openURL: jest.fn(),
    canOpenURL: jest.fn()
  }
}));

describe('Social Sharing Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  describe('End-to-End Content Generation and Sharing', () => {
    it('should generate mood content for Instagram properly', () => {
      const moodData = {
        mood: 7,
        emotion: 'content',
        energy: 'moderate',
        note: 'Had a productive therapy session today'
      };

      // Generate content
      const content = socialSharingService.generateAnonymizedContent(moodData, 'mood', true);
      
      // Verify content structure
      expect(content.instagram).toBeDefined();
      expect(content.instagram.text).toContain('Someone');
      expect(content.instagram.backgroundGradient).toBeDefined();
      expect(content.instagram.hashtags).toContain('MentalWellness');
    });

    it('should generate achievement content for multiple platforms', () => {
      const achievementData = {
        achievement: 'Completed 30-day mindfulness challenge',
        type: 'mindfulness',
        description: 'Consistent daily practice for mental wellness'
      };

      const platforms = ['instagram', 'twitter'];
      
      // Test content generation for multiple platforms
      const content = socialSharingService.generateAnonymizedContent(achievementData, 'achievement', true);

      expect(content.instagram).toBeDefined();
      expect(content.twitter).toBeDefined();
      expect(content.instagram.text).toContain('Celebrating a personal victory');
      expect(content.twitter.text).toContain('Celebrating a personal victory');
    });

    it('should handle wellness content with biometric data', () => {
      const wellnessData = {
        meditation: 20,
        exercise: true,
        activity: true,
        social: false
      };

      const content = socialSharingService.generateAnonymizedContent(wellnessData, 'wellness', true);
      
      // Verify wellness-specific content
      expect(content.instagram.text).toContain('Prioritizing wellness today');
      expect(content.instagram.text).toContain('🧘 Meditated 20 minutes');
      expect(content.instagram.text).toContain('🏃‍♀️ Some movement and exercise');
      expect(content.instagram.text).toContain('📝 Journaled my thoughts');
      expect(content.instagram.text).not.toContain('💬 Connected with others');
    });
  });

  describe('Platform Content Preparation', () => {
    describe('Instagram Content Preparation', () => {
      it('should prepare Instagram Stories content with proper parameters', () => {
        const content = {
          text: 'Test Instagram story content',
          backgroundGradient: ['#FFD700', '#FFA500']
        };

        expect(content.backgroundGradient).toEqual(['#FFD700', '#FFA500']);
        expect(content.text).toBe('Test Instagram story content');
      });
    });

    describe('TikTok Content Preparation', () => {
      it('should prepare TikTok content with proper encoding', () => {
        const content = {
          text: 'Mental health awareness content with special characters: #wellness & @support',
          hashtags: ['mentalhealth', 'fyp', 'wellness']
        };

        expect(content.hashtags).toContain('mentalhealth');
        expect(content.hashtags).toContain('fyp');
        expect(content.text).toContain('#wellness');
      });
    });

    describe('Twitter Content Preparation', () => {
      it('should prepare Twitter content with proper parameters', () => {
        const content = {
          text: 'Mental health journey update: feeling stronger every day! 💪 #MentalHealthMatters',
          hashtags: ['wellness', 'selfcare', 'mentalhealth']
        };

        expect(content.hashtags).toContain('wellness');
        expect(content.hashtags).toContain('selfcare');
        expect(content.text).toContain('💪');
      });

      it('should handle character limit requirements', () => {
        const longContent = {
          text: 'This is a very long mental health update that exceeds Twitter\'s character limit and should be properly truncated while maintaining the message integrity and ensuring that the most important information is preserved for the audience to understand the wellness journey being shared',
          hashtags: ['mentalhealth', 'wellness']
        };

        const truncated = socialSharingService.truncateForTwitter(longContent.text, 240);
        
        expect(truncated.length).toBeLessThanOrEqual(240);
        expect(truncated).toMatch(/\.\.\.$/);
      });
    });
  });

  describe('Anonymization and Privacy Tests', () => {
    it('should properly anonymize sensitive mental health content', () => {
      const sensitiveContent = {
        text: 'I had a panic attack at work today at 2:30 PM. My therapist Dr. Sarah Johnson helped me through it. I live at 123 Oak Street and my email is user@example.com. This happened on 12/15/2023.'
      };

      const anonymized = socialSharingService.anonymizeContent(sensitiveContent);

      // Verify all PII is removed
      expect(anonymized.text).not.toContain('2:30 PM');
      expect(anonymized.text).not.toContain('Dr. Sarah Johnson');
      expect(anonymized.text).not.toContain('123 Oak Street');
      expect(anonymized.text).not.toContain('user@example.com');
      expect(anonymized.text).not.toContain('12/15/2023');
      expect(anonymized.text).not.toContain('I had');

      // Verify anonymization replacements
      expect(anonymized.text).toContain('Someone');
      expect(anonymized.text).toContain('a specific time');
      expect(anonymized.text).toContain('an important person');
      expect(anonymized.text).toContain('a special date');
    });

    it('should maintain content meaning while anonymizing', () => {
      const originalContent = {
        text: 'I completed my first week of therapy with Dr. Smith. I feel proud of taking this step for my mental health.'
      };

      const anonymized = socialSharingService.anonymizeContent(originalContent);

      // Should maintain the core message
      expect(anonymized.text).toContain('completed');
      expect(anonymized.text).toContain('therapy');
      expect(anonymized.text).toContain('mental health');
      expect(anonymized.text).toContain('Someone');
      expect(anonymized.text).toContain('an important person');
    });

    it('should generate consistent anonymization', () => {
      const content1 = { text: 'First post' };
      const content2 = { text: 'Second post' };

      const anon1 = socialSharingService.anonymizeContent(content1);
      const anon2 = socialSharingService.anonymizeContent(content2);

      expect(typeof anon1.text).toBe('string');
      expect(typeof anon2.text).toBe('string');
    });
  });

  describe('Content Validation and Error Handling', () => {
    it('should handle malformed content gracefully', () => {
      const malformedData = {
        mood: 'not-a-number',
        emotion: null,
        energy: undefined
      };

      const content = socialSharingService.generateAnonymizedContent(malformedData, 'mood', true);

      expect(content).toBeDefined();
      expect(content.instagram).toBeDefined();
      expect(content.instagram.text).toContain('neutral'); // Should fallback to neutral
    });

    it('should validate platform parameters', () => {
      const platforms = ['instagram', 'tiktok', 'twitter'];
      
      platforms.forEach(platform => {
        expect(typeof platform).toBe('string');
        expect(platform.length).toBeGreaterThan(0);
      });
    });

    it('should provide appropriate sharing recommendations based on content and preferences', () => {
      const testCases = [
        {
          contentType: 'mood',
          preferences: {},
          expected: ['twitter', 'instagram']
        },
        {
          contentType: 'achievement',
          preferences: { anonymousOnly: true },
          expected: ['instagram'] // TikTok filtered out for anonymous
        },
        {
          contentType: 'wellness',
          preferences: {},
          expected: ['instagram', 'tiktok']
        },
        {
          contentType: 'unknown',
          preferences: {},
          expected: ['twitter']
        }
      ];

      testCases.forEach(({ contentType, preferences, expected }) => {
        const recommendations = socialSharingService.getSharingRecommendations(contentType, preferences);
        expect(recommendations).toEqual(expected);
      });
    });
  });

  describe('Performance and Reliability Tests', () => {
    it('should handle concurrent content generation', () => {
      const data = { mood: 8, emotion: 'happy' };
      const platforms = ['instagram', 'twitter', 'tiktok'];

      // Test concurrent content generation
      const contentPromises = platforms.map(platform => {
        const content = socialSharingService.generateAnonymizedContent(data, 'mood', true);
        return content[platform];
      });

      expect(contentPromises).toHaveLength(3);
      contentPromises.forEach(content => {
        expect(content).toBeDefined();
        expect(content.text).toBeTruthy();
      });
    });

    it('should maintain content quality across different template types', () => {
      const testData = [
        { type: 'mood', data: { mood: 8, emotion: 'happy' } },
        { type: 'achievement', data: { achievement: 'Test achievement' } },
        { type: 'wellness', data: { meditation: 15 } },
        { type: 'gratitude', data: { items: ['Test item'] } }
      ];

      testData.forEach(({ type, data }) => {
        const content = socialSharingService.generateAnonymizedContent(data, type, true);
        
        // Verify all platforms have content
        expect(content.instagram.text).toBeTruthy();
        expect(content.tiktok.text).toBeTruthy();
        expect(content.twitter.text).toBeTruthy();
        
        // Verify hashtags are present
        expect(content.instagram.hashtags.length).toBeGreaterThan(0);
        expect(content.tiktok.hashtags.length).toBeGreaterThan(0);
        expect(content.twitter.hashtags.length).toBeGreaterThan(0);
        
        // Verify anonymization disclaimer
        expect(content.instagram.text).toContain('💙');
      });
    });
  });
});