import socialSharingService from '../../src/services/socialSharingService';
import { Linking } from 'expo-linking';

// Mock expo-linking
jest.mock('expo-linking', () => ({
  Linking: {
    openURL: jest.fn(),
    canOpenURL: jest.fn()
  }
}));

describe('Social Platform Workflows Integration Tests', () => {
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

  describe('Instagram Content Workflows', () => {
    it('should generate Instagram Stories content for mood updates', () => {
      const moodData = {
        mood: 8,
        emotion: 'grateful',
        energy: 'high',
        note: 'Completed my first week of therapy!'
      };

      // Generate content
      const content = socialSharingService.generateAnonymizedContent(moodData, 'mood', true);
      
      // Validate Instagram-specific formatting
      expect(content.instagram.backgroundGradient).toEqual(['#FF9800', '#FFCC02']); // Grateful colors
      expect(content.instagram.hashtags).toContain('MentalWellness');
      expect(content.instagram.text).toContain('Someone');
      expect(content.instagram.text).toContain('Feeling grateful');
      expect(result.success).toBe(true);
      expect(result.platform).toBe('instagram');
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringMatching(/instagram-stories:\/\/share\?.*backgroundTopColor=FF9800.*backgroundBottomColor=FFCC02/)
      );
    });

    it('should handle Instagram achievement sharing with proper visual styling', async () => {
      Linking.canOpenURL.mockResolvedValue(true);
      Linking.openURL.mockResolvedValue(true);

      const achievementData = {
        achievement: 'Completed 7-day mindfulness challenge',
        type: 'mindfulness',
        description: 'Consistent daily practice for mental wellness'
      };

      const content = socialSharingService.generateAnonymizedContent(achievementData, 'achievement', false);
      
      // Validate achievement-specific content
      expect(content.instagram.text).toContain('Celebrating a personal victory');
      expect(content.instagram.text).toContain('🎯');
      expect(content.instagram.backgroundGradient).toEqual(['#FFD700', '#FF6F00']); // Proud colors

      const result = await socialSharingService.shareToInstagram(content.instagram);
      expect(result.success).toBe(true);
    });

    it('should fallback to web Instagram when app unavailable', async () => {
      Linking.canOpenURL.mockResolvedValue(false);
      Linking.openURL.mockResolvedValue(true);

      const content = {
        text: 'Test content',
        backgroundGradient: ['#FFD700', '#FFA500']
      };

      const result = await socialSharingService.shareToInstagram(content);

      expect(result.success).toBe(true);
      expect(result.fallback).toBe(true);
      expect(Linking.openURL).toHaveBeenCalledWith('https://www.instagram.com/stories/create/');
    });
  });

  describe('TikTok Sharing Workflows', () => {
    it('should complete full TikTok workflow for wellness content', async () => {
      Linking.canOpenURL.mockResolvedValue(true);
      Linking.openURL.mockResolvedValue(true);

      const wellnessData = {
        meditation: 20,
        exercise: true,
        activity: true,
        social: true
      };

      const content = socialSharingService.generateAnonymizedContent(wellnessData, 'wellness', true);
      
      // Validate TikTok-specific formatting
      expect(content.tiktok.hashtags).toContain('fyp');
      expect(content.tiktok.hashtags).toContain('viral');
      expect(content.tiktok.videoStyle).toBeDefined();
      expect(content.tiktok.music).toBe('Ambient'); // Peaceful emotion
      expect(content.tiktok.text).toContain('What about you? Share below! 👇');

      const result = await socialSharingService.shareToTikTok(content.tiktok);

      expect(result.success).toBe(true);
      expect(result.platform).toBe('tiktok');
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringMatching(/https:\/\/www\.tiktok\.com\/upload\?text=.*hashtags=/)
      );
    });

    it('should handle TikTok content with special characters and emojis', async () => {
      Linking.canOpenURL.mockResolvedValue(true);
      Linking.openURL.mockResolvedValue(true);

      const data = {
        mood: 9,
        emotion: 'happy',
        note: 'Feeling amazing! 🌟 Mental health matters! 💙 #grateful'
      };

      const content = socialSharingService.generateAnonymizedContent(data, 'mood', true);
      const result = await socialSharingService.shareToTikTok(content.tiktok);

      expect(result.success).toBe(true);
      
      // Verify URL encoding handles special characters
      const calledUrl = Linking.openURL.mock.calls[0][0];
      expect(calledUrl).toContain('text=');
      expect(calledUrl).toContain('hashtags=');
    });

    it('should apply appropriate video styling based on emotion', () => {
      const emotions = ['happy', 'sad', 'anxious', 'calm', 'proud'];
      
      emotions.forEach(emotion => {
        const data = { mood: 7, emotion };
        const content = socialSharingService.generateAnonymizedContent(data, 'mood', true);
        
        expect(content.tiktok.videoStyle).toBeDefined();
        expect(content.tiktok.videoStyle.filter).toBeDefined();
        expect(content.tiktok.videoStyle.effect).toBeDefined();
        expect(content.tiktok.music).toBeDefined();
      });
    });
  });

  describe('Twitter/X Sharing Workflows', () => {
    it('should complete full Twitter workflow with character limit handling', async () => {
      Linking.openURL.mockResolvedValue(true);

      const longMoodData = {
        mood: 6,
        emotion: 'contemplative',
        note: 'Today I had a really long therapy session where we discussed many different aspects of my mental health journey including anxiety management techniques, coping strategies for difficult days, mindfulness practices, and building a support network'
      };

      const content = socialSharingService.generateAnonymizedContent(longMoodData, 'mood', true);
      
      // Validate Twitter-specific formatting
      expect(content.twitter.hashtags).toContain('MentalHealth');
      expect(content.twitter.hashtags).toContain('YouAreNotAlone');

      const result = await socialSharingService.shareToTwitter(content.twitter);

      expect(result.success).toBe(true);
      expect(result.platform).toBe('twitter');
      
      // Verify character limit handling
      const calledUrl = Linking.openURL.mock.calls[0][0];
      const textParam = calledUrl.split('text=')[1]?.split('&')[0];
      const decodedText = decodeURIComponent(textParam || '');
      expect(decodedText.length).toBeLessThanOrEqual(240);
    });

    it('should handle Twitter sharing with via parameter', async () => {
      Linking.openURL.mockResolvedValue(true);

      const data = { mood: 8, emotion: 'hopeful' };
      const content = socialSharingService.generateAnonymizedContent(data, 'mood', true);
      
      const options = { via: 'minddigestapp' };
      const result = await socialSharingService.shareToTwitter(content.twitter, options);

      expect(result.success).toBe(true);
      expect(Linking.openURL).toHaveBeenCalledWith(
        expect.stringMatching(/via=minddigestapp/)
      );
    });

    it('should properly encode hashtags and special characters for Twitter', async () => {
      Linking.openURL.mockResolvedValue(true);

      const data = {
        mood: 7,
        emotion: 'grateful',
        note: 'Grateful for progress! #blessed & thankful 💙'
      };

      const content = socialSharingService.generateAnonymizedContent(data, 'mood', true);
      const result = await socialSharingService.shareToTwitter(content.twitter);

      expect(result.success).toBe(true);
      
      const calledUrl = Linking.openURL.mock.calls[0][0];
      expect(calledUrl).toContain('hashtags=');
      expect(calledUrl).toMatch(/text=.*%23/); // URL-encoded hashtag
    });
  });

  describe('Multi-Platform Sharing Workflows', () => {
    it('should successfully share to all platforms simultaneously', async () => {
      Linking.canOpenURL.mockResolvedValue(true);
      Linking.openURL.mockResolvedValue(true);

      const gratitudeData = {
        items: [
          'Supportive therapy sessions',
          'Understanding friends',
          'Progress in managing anxiety',
          'Peaceful moments of mindfulness'
        ]
      };

      const platforms = ['instagram', 'tiktok', 'twitter'];
      const results = await socialSharingService.shareToMultiple(platforms, gratitudeData, {
        template: 'gratitude',
        anonymous: true
      });

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      expect(Linking.openURL).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in multi-platform sharing', async () => {
      // Mock Instagram success, TikTok failure, Twitter success
      const mockShareToPlatform = jest.spyOn(socialSharingService, 'shareToPlatform')
        .mockImplementation((platform) => {
          if (platform === 'tiktok') {
            return Promise.reject(new Error('TikTok API error'));
          }
          return Promise.resolve({ success: true, platform });
        });

      const data = { mood: 8, emotion: 'happy' };
      const platforms = ['instagram', 'tiktok', 'twitter'];

      const results = await socialSharingService.shareToMultiple(platforms, data);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true); // Instagram
      expect(results[1].success).toBe(false); // TikTok
      expect(results[1].error).toBe('TikTok API error');
      expect(results[2].success).toBe(true); // Twitter

      mockShareToPlatform.mockRestore();
    });

    it('should provide appropriate platform recommendations', () => {
      const testScenarios = [
        {
          contentType: 'mood',
          userPreferences: {},
          expectedPlatforms: ['twitter', 'instagram']
        },
        {
          contentType: 'achievement',
          userPreferences: {},
          expectedPlatforms: ['instagram', 'tiktok']
        },
        {
          contentType: 'wellness',
          userPreferences: { anonymousOnly: true },
          expectedPlatforms: ['instagram'] // TikTok filtered out
        },
        {
          contentType: 'gratitude',
          userPreferences: {},
          expectedPlatforms: ['twitter', 'instagram']
        }
      ];

      testScenarios.forEach(({ contentType, userPreferences, expectedPlatforms }) => {
        const recommendations = socialSharingService.getSharingRecommendations(contentType, userPreferences);
        expect(recommendations).toEqual(expectedPlatforms);
      });
    });
  });

  describe('Platform Availability and Fallback Workflows', () => {
    it('should check platform availability before sharing', async () => {
      const platforms = ['instagram', 'tiktok', 'twitter'];
      
      // Mock different availability scenarios
      Linking.canOpenURL.mockImplementation((url) => {
        if (url.includes('instagram')) return Promise.resolve(true);
        if (url.includes('tiktok')) return Promise.resolve(false);
        if (url.includes('twitter')) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      const availabilityResults = await Promise.all(
        platforms.map(platform => socialSharingService.checkPlatformAvailability(platform))
      );

      expect(availabilityResults).toEqual([true, false, true]);
    });

    it('should handle network errors during platform availability checks', async () => {
      Linking.canOpenURL.mockRejectedValue(new Error('Network error'));

      const isAvailable = await socialSharingService.checkPlatformAvailability('instagram');
      expect(isAvailable).toBe(false);
    });

    it('should provide fallback URLs when native apps are unavailable', async () => {
      Linking.canOpenURL.mockResolvedValue(false);
      Linking.openURL.mockResolvedValue(true);

      const content = {
        text: 'Test content',
        backgroundGradient: ['#FFD700', '#FFA500']
      };

      // Test Instagram fallback
      const instagramResult = await socialSharingService.shareToInstagram(content);
      expect(instagramResult.fallback).toBe(true);
      expect(Linking.openURL).toHaveBeenCalledWith('https://www.instagram.com/stories/create/');

      // Test TikTok fallback
      const tiktokContent = { text: 'Test', hashtags: ['test'] };
      const tiktokResult = await socialSharingService.shareToTikTok(tiktokContent);
      expect(tiktokResult.fallback).toBe(true);
    });
  });

  describe('Error Handling and Recovery Workflows', () => {
    it('should handle sharing errors gracefully', async () => {
      Linking.canOpenURL.mockResolvedValue(true);
      Linking.openURL.mockRejectedValue(new Error('Sharing failed'));

      const content = {
        text: 'Test content',
        backgroundGradient: ['#FFD700', '#FFA500']
      };

      const result = await socialSharingService.shareToInstagram(content);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sharing failed');
      expect(result.platform).toBe('instagram');
    });

    it('should handle malformed content gracefully', async () => {
      const malformedData = {
        mood: null,
        emotion: undefined,
        note: ''
      };

      const content = socialSharingService.generateAnonymizedContent(malformedData, 'mood', true);
      
      expect(content).toBeDefined();
      expect(content.instagram).toBeDefined();
      expect(content.tiktok).toBeDefined();
      expect(content.twitter).toBeDefined();
    });

    it('should recover from individual platform failures in batch sharing', async () => {
      const mockResults = [
        { success: true, platform: 'instagram' },
        { success: false, platform: 'tiktok', error: 'API limit exceeded' },
        { success: true, platform: 'twitter' }
      ];

      const mockShareToPlatform = jest.spyOn(socialSharingService, 'shareToPlatform')
        .mockImplementation((platform) => {
          const result = mockResults.find(r => r.platform === platform);
          if (result.success) {
            return Promise.resolve(result);
          } else {
            return Promise.reject(new Error(result.error));
          }
        });

      const data = { mood: 8, emotion: 'happy' };
      const platforms = ['instagram', 'tiktok', 'twitter'];

      const results = await socialSharingService.shareToMultiple(platforms, data);

      expect(results).toHaveLength(3);
      expect(results.filter(r => r.success)).toHaveLength(2);
      expect(results.filter(r => !r.success)).toHaveLength(1);

      mockShareToPlatform.mockRestore();
    });
  });

  describe('Content Quality and Consistency Workflows', () => {
    it('should maintain consistent quality across all platforms', () => {
      const testData = {
        mood: 8,
        emotion: 'hopeful',
        energy: 'high',
        note: 'Making real progress in therapy!'
      };

      const content = socialSharingService.generateAnonymizedContent(testData, 'mood', true);

      // Verify all platforms have quality content
      ['instagram', 'tiktok', 'twitter'].forEach(platform => {
        expect(content[platform].text).toBeTruthy();
        expect(content[platform].text.length).toBeGreaterThan(10);
        expect(content[platform].hashtags).toBeDefined();
        expect(content[platform].hashtags.length).toBeGreaterThan(0);
        expect(content[platform].text).toContain('💙');
      });
    });

    it('should ensure anonymization consistency across platforms', () => {
      const sensitiveData = {
        mood: 7,
        emotion: 'relieved',
        note: 'I had a breakthrough with Dr. Sarah Johnson today at 3:30 PM'
      };

      const content = socialSharingService.generateAnonymizedContent(sensitiveData, 'mood', true);

      // Verify anonymization is consistent across all platforms
      ['instagram', 'tiktok', 'twitter'].forEach(platform => {
        expect(content[platform].text).not.toContain('I had');
        expect(content[platform].text).not.toContain('Dr. Sarah Johnson');
        expect(content[platform].text).not.toContain('3:30 PM');
        expect(content[platform].text).toContain('Someone');
        expect(content[platform].text).toContain('an important person');
        expect(content[platform].text).toContain('a specific time');
      });
    });

    it('should validate content meets platform requirements', () => {
      const data = { mood: 8, emotion: 'grateful' };
      const content = socialSharingService.generateAnonymizedContent(data, 'mood', true);

      // Instagram requirements
      expect(content.instagram.backgroundGradient).toHaveLength(2);
      expect(content.instagram.hashtags).toContain('MentalWellness');

      // TikTok requirements
      expect(content.tiktok.hashtags).toContain('fyp');
      expect(content.tiktok.videoStyle).toBeDefined();
      expect(content.tiktok.music).toBeDefined();

      // Twitter requirements
      expect(content.twitter.text.length).toBeLessThanOrEqual(240);
      expect(content.twitter.hashtags).toContain('MentalHealth');
    });
  });
});