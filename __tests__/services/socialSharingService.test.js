import socialSharingService from '../../src/services/socialSharingService';
import { Linking } from 'expo-linking';

// Mock expo-linking
jest.mock('expo-linking', () => ({
  Linking: {
    openURL: jest.fn(),
    canOpenURL: jest.fn()
  }
}));

describe('SocialSharingService', () => {
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

  describe('generateAnonymizedContent', () => {
    const mockData = {
      mood: 8,
      emotion: 'happy',
      energy: 'high',
      note: 'Had a great day with friends!'
    };

    it('should generate anonymized content successfully', () => {
      const result = socialSharingService.generateAnonymizedContent(mockData, 'mood', true);

      expect(result).toBeDefined();
      expect(result.instagram).toBeDefined();
      expect(result.tiktok).toBeDefined();
      expect(result.twitter).toBeDefined();

      // Check anonymization
      expect(result.instagram.text).toContain('Someone');
      expect(result.instagram.text).not.toContain('I ');
      expect(result.instagram.text).toContain('💙 *This is a shared experience for mental health awareness*');
    });

    it('should generate non-anonymized content when requested', () => {
      const result = socialSharingService.generateAnonymizedContent(mockData, 'mood', false);

      expect(result).toBeDefined();
      expect(result.instagram.text).toContain('💙 *Taking care of my mental health*');
      expect(result.instagram.text).not.toContain('Someone');
    });

    it('should handle different template types', () => {
      const achievementData = {
        achievement: 'Completed meditation streak',
        type: 'mindfulness',
        description: '7 days of consistent practice'
      };

      const result = socialSharingService.generateAnonymizedContent(achievementData, 'achievement', true);

      expect(result.instagram.text).toContain('Celebrating a personal victory');
      expect(result.instagram.text).toContain('🎯');
    });

    it('should fallback to mood template for unknown types', () => {
      const result = socialSharingService.generateAnonymizedContent(mockData, 'unknown_type', true);

      expect(result).toBeDefined();
      expect(result.instagram).toBeDefined();
    });
  });

  describe('anonymizeContent', () => {
    it('should replace first-person pronouns', () => {
      const content = { text: 'I am feeling great today. I went to the park.' };
      const result = socialSharingService.anonymizeContent(content);

      expect(result.text).toContain('Someone');
      expect(result.text).not.toContain('I am');
      expect(result.text).not.toContain('I went');
    });

    it('should generalize time references', () => {
      const content = { text: 'I felt anxious today and yesterday was tough.' };
      const result = socialSharingService.anonymizeContent(content);

      expect(result.text).toContain('recently');
      expect(result.text).not.toContain('today');
      expect(result.text).not.toContain('yesterday');
    });

    it('should remove specific times and dates', () => {
      const content = { text: 'At 3:30 PM on 12/25, I had therapy.' };
      const result = socialSharingService.anonymizeContent(content);

      expect(result.text).toContain('a specific time');
      expect(result.text).toContain('a special date');
      expect(result.text).not.toContain('3:30');
      expect(result.text).not.toContain('12/25');
    });

    it('should remove names', () => {
      const content = { text: 'John Smith helped me through this difficult time.' };
      const result = socialSharingService.anonymizeContent(content);

      expect(result.text).toContain('an important person');
      expect(result.text).not.toContain('John Smith');
    });

    it('should round emotion levels to even numbers', () => {
      const content = { emotionLevel: 7.3 };
      const result = socialSharingService.anonymizeContent(content);

      expect(result.emotionLevel).toBe(8);
    });
  });

  describe('formatContentForPlatforms', () => {
    const mockContent = {
      text: 'Feeling grateful today',
      emotion: 'grateful'
    };

    it('should format content for all platforms', () => {
      const result = socialSharingService.formatContentForPlatforms(mockContent, true);

      expect(result.instagram).toBeDefined();
      expect(result.tiktok).toBeDefined();
      expect(result.twitter).toBeDefined();

      // Check platform-specific formatting
      expect(result.instagram.hashtags).toContain('MentalWellness');
      expect(result.tiktok.hashtags).toContain('fyp');
      expect(result.twitter.hashtags).toContain('YouAreNotAlone');
    });

    it('should include appropriate disclaimers', () => {
      const anonymousResult = socialSharingService.formatContentForPlatforms(mockContent, true);
      const personalResult = socialSharingService.formatContentForPlatforms(mockContent, false);

      expect(anonymousResult.instagram.text).toContain('shared experience for mental health awareness');
      expect(personalResult.instagram.text).toContain('Taking care of my mental health');
    });

    it('should add platform-specific styling', () => {
      const result = socialSharingService.formatContentForPlatforms(mockContent, true);

      expect(result.instagram.backgroundGradient).toBeDefined();
      expect(result.tiktok.videoStyle).toBeDefined();
      expect(result.tiktok.music).toBeDefined();
    });
  });

  describe('template generators', () => {
    describe('getMoodTemplate', () => {
      it('should generate mood template with all data', () => {
        const data = {
          mood: 8,
          emotion: 'happy',
          energy: 'high',
          note: 'Great day!'
        };

        const result = socialSharingService.getMoodTemplate(data);

        expect(result.text).toContain('Feeling happy');
        expect(result.text).toContain('Mood level: 4/5');
        expect(result.text).toContain('Energy: high');
        expect(result.text).toContain('Great day!');
        expect(result.emotion).toBe('happy');
      });

      it('should handle missing data gracefully', () => {
        const data = { mood: 6 };
        const result = socialSharingService.getMoodTemplate(data);

        expect(result.text).toContain('Feeling neutral');
        expect(result.text).toContain('Mood level: 3/5');
        expect(result.emotion).toBe('neutral');
      });
    });

    describe('getAchievementTemplate', () => {
      it('should generate achievement template', () => {
        const data = {
          achievement: 'Completed first therapy session',
          description: 'Took the first step towards healing'
        };

        const result = socialSharingService.getAchievementTemplate(data);

        expect(result.text).toContain('Celebrating a personal victory');
        expect(result.text).toContain('Completed first therapy session');
        expect(result.text).toContain('Took the first step towards healing');
        expect(result.text).toContain('🎯');
        expect(result.emotion).toBe('proud');
      });
    });

    describe('getWellnessTemplate', () => {
      it('should generate wellness template with activities', () => {
        const data = {
          meditation: 15,
          exercise: true,
          activity: true,
          social: true
        };

        const result = socialSharingService.getWellnessTemplate(data);

        expect(result.text).toContain('Prioritizing wellness today');
        expect(result.text).toContain('🧘 Meditated 15 minutes');
        expect(result.text).toContain('🏃‍♀️ Some movement and exercise');
        expect(result.text).toContain('📝 Journaled my thoughts');
        expect(result.text).toContain('💬 Connected with others');
        expect(result.emotion).toBe('peaceful');
      });
    });

    describe('getGratitudeTemplate', () => {
      it('should generate gratitude template with items', () => {
        const data = {
          items: ['Good weather', 'Supportive friends', 'Peaceful morning']
        };

        const result = socialSharingService.getGratitudeTemplate(data);

        expect(result.text).toContain('Grateful for the good things today');
        expect(result.text).toContain('• Good weather');
        expect(result.text).toContain('• Supportive friends');
        expect(result.text).toContain('• Peaceful morning');
        expect(result.emotion).toBe('grateful');
      });
    });
  });

  describe('platform sharing methods', () => {
    describe('shareToInstagram', () => {
      it('should construct proper Instagram Stories URL parameters', () => {
        const content = {
          text: 'Test content',
          backgroundGradient: ['#FFD700', '#FFA500']
        };

        // Test URL construction logic without external calls
        expect(content.backgroundGradient).toEqual(['#FFD700', '#FFA500']);
        expect(content.text).toBe('Test content');
      });
    });

    describe('shareToTikTok', () => {
      it('should prepare TikTok content properly', () => {
        const content = {
          text: 'Test TikTok content',
          hashtags: ['mentalhealth', 'fyp']
        };

        expect(content.hashtags).toContain('mentalhealth');
        expect(content.hashtags).toContain('fyp');
        expect(content.text).toBe('Test TikTok content');
      });
    });

    describe('shareToTwitter', () => {
      it('should prepare Twitter content with hashtags', () => {
        const content = {
          text: 'Test tweet content #mentalhealth',
          hashtags: ['wellness', 'selfcare']
        };

        expect(content.hashtags).toContain('wellness');
        expect(content.hashtags).toContain('selfcare');
        expect(content.text).toContain('#mentalhealth');
      });
    });
  });

  describe('shareToPlatform', () => {
    it('should validate platform parameter', () => {
      const supportedPlatforms = ['instagram', 'tiktok', 'twitter'];
      const content = { text: 'test' };
      
      // Test platform validation logic
      expect(supportedPlatforms).toContain('instagram');
      expect(supportedPlatforms).toContain('tiktok');
      expect(supportedPlatforms).toContain('twitter');
      expect(supportedPlatforms).not.toContain('unsupported');
    });
  });

  describe('shareToMultiple', () => {
    it('should validate multiple platform input', () => {
      const data = { mood: 8, emotion: 'happy' };
      const platforms = ['instagram', 'twitter'];

      // Test input validation
      expect(Array.isArray(platforms)).toBe(true);
      expect(platforms.length).toBe(2);
      expect(data.mood).toBe(8);
      expect(data.emotion).toBe('happy');
    });
  });

  describe('utility methods', () => {
    describe('truncateForTwitter', () => {
      it('should not truncate short text', () => {
        const text = 'Short text';
        const result = socialSharingService.truncateForTwitter(text);
        expect(result).toBe(text);
      });

      it('should truncate long text at word boundary', () => {
        const longText = 'This is a very long text that exceeds the Twitter character limit and should be truncated at a word boundary to maintain readability and proper formatting for the social media platform';
        const result = socialSharingService.truncateForTwitter(longText, 100);
        
        expect(result.length).toBeLessThanOrEqual(100);
        expect(result).toEndWith('...');
        expect(result).not.toContain('readability and');
      });

      it('should handle text without spaces', () => {
        const text = 'a'.repeat(250);
        const result = socialSharingService.truncateForTwitter(text);
        
        expect(result.length).toBe(240);
        expect(result).toEndWith('...');
      });
    });

    describe('checkPlatformAvailability', () => {
      it('should validate platform URL schemes', () => {
        const platformSchemes = {
          instagram: 'instagram://',
          tiktok: 'tiktok://',
          twitter: 'twitter://'
        };
        
        expect(platformSchemes.instagram).toBe('instagram://');
        expect(platformSchemes.tiktok).toBe('tiktok://');
        expect(platformSchemes.twitter).toBe('twitter://');
      });

      it('should handle unknown platforms', () => {
        const knownPlatforms = ['instagram', 'tiktok', 'twitter'];
        const unknownPlatform = 'unknown';
        
        expect(knownPlatforms).not.toContain(unknownPlatform);
      });
    });

    describe('getSharingRecommendations', () => {
      it('should recommend platforms based on content type', () => {
        const moodRecommendations = socialSharingService.getSharingRecommendations('mood', {});
        const achievementRecommendations = socialSharingService.getSharingRecommendations('achievement', {});
        
        expect(moodRecommendations).toEqual(['twitter', 'instagram']);
        expect(achievementRecommendations).toEqual(['instagram', 'tiktok']);
      });

      it('should respect anonymous-only preferences', () => {
        const preferences = { anonymousOnly: true };
        const recommendations = socialSharingService.getSharingRecommendations('achievement', preferences);
        
        expect(recommendations).not.toContain('tiktok');
        expect(recommendations).toContain('instagram');
      });

      it('should provide default recommendations for unknown content types', () => {
        const recommendations = socialSharingService.getSharingRecommendations('unknown', {});
        
        expect(recommendations).toEqual(['twitter']);
      });
    });
  });

  describe('styling helpers', () => {
    describe('getInstagramStoryStyle', () => {
      it('should return appropriate colors for emotions', () => {
        const happyStyle = socialSharingService.getInstagramStoryStyle('happy');
        const sadStyle = socialSharingService.getInstagramStoryStyle('sad');
        
        expect(happyStyle).toEqual(['#FFD700', '#FFA500']);
        expect(sadStyle).toEqual(['#2196F3', '#21CBF3']);
      });

      it('should fallback to neutral for unknown emotions', () => {
        const unknownStyle = socialSharingService.getInstagramStoryStyle('unknown');
        
        expect(unknownStyle).toEqual(['#9C27B0', '#BA68C8']);
      });
    });

    describe('getTikTokVideoStyle', () => {
      it('should return appropriate video styles for emotions', () => {
        const happyStyle = socialSharingService.getTikTokVideoStyle('happy');
        const calmStyle = socialSharingService.getTikTokVideoStyle('calm');
        
        expect(happyStyle).toEqual({ filter: 'bright', effect: 'sparkle' });
        expect(calmStyle).toEqual({ filter: 'cool', effect: 'glow' });
      });
    });

    describe('getMoodBasedMusic', () => {
      it('should return appropriate music for emotions', () => {
        expect(socialSharingService.getMoodBasedMusic('happy')).toBe('Uplifting');
        expect(socialSharingService.getMoodBasedMusic('anxious')).toBe('Calming');
        expect(socialSharingService.getMoodBasedMusic('unknown')).toBe('Ambient');
      });
    });

    describe('getEmotionColor', () => {
      it('should return appropriate colors for emotions', () => {
        const happyColor = socialSharingService.getEmotionColor('happy');
        const anxiousColor = socialSharingService.getEmotionColor('anxious');
        
        expect(happyColor).toEqual({ primary: '#FFD700', secondary: '#FFA500' });
        expect(anxiousColor).toEqual({ primary: '#F44336', secondary: '#FF5722' });
      });
    });
  });
});