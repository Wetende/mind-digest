import { Linking } from 'expo-linking';
// Note: For Instagram Stories, we'll use URL schemes and deep linking
// Twitter-lite for X/Twitter API calls
// Content anonymization utilities

/**
 * Social Sharing Service for Mental Health Content
 * Handles sharing to Instagram Stories, TikTok, and Twitter/X with anonymization
 */

class SocialSharingService {
  constructor() {
    this.platforms = {
      instagram: 'instagram',
      tiktok: 'tiktok',
      twitter: 'twitter'
    };

    // Platform-specific content templates
    this.templates = {
      mood: this.getMoodTemplate.bind(this),
      achievement: this.getAchievementTemplate.bind(this),
      wellness: this.getWellnessTemplate.bind(this),
      gratitude: this.getGratitudeTemplate.bind(this)
    };
  }

  /**
   * Generate anonymized content with various template types
   * @param {Object} data - User data and content
   * @param {string} templateType - Type of template (mood, achievement, etc.)
   * @param {boolean} anonymous - Whether to anonymize content
   * @returns {Object} - Formatted content for each platform
   */
  generateAnonymizedContent(data, templateType = 'mood', anonymous = true) {
    const templateFn = this.templates[templateType] || this.templates.mood;
    const baseContent = templateFn(data);

    if (!anonymous) {
      return this.formatContentForPlatforms(baseContent, false);
    }

    // Anonymize content
    const anonymizedContent = this.anonymizeContent(baseContent);

    return this.formatContentForPlatforms(anonymizedContent, true);
  }

  /**
   * Apply anonymization rules to content
   * @param {Object} content - Original content
   * @returns {Object} - Anonymized content
   */
  anonymizeContent(content) {
    const anonymized = { ...content };

    // Remove or generalize specific identifiers
    if (anonymized.text) {
      anonymized.text = anonymized.text
        .replace(/\bI\b/g, 'Someone') // Replace first-person pronouns
        .replace(/today|tommorrow|yesterday/g, 'recently')
        .replace(/this week|this month/g, 'recently')
        .replace(/\d{1,2}:\d{2}/g, 'a specific time') // Remove specific times
        .replace(/\d{1,2}\/\d{1,2}/g, 'a special date') // Remove specific dates
        .replace(/[A-Z][a-z]+ [A-Z][a-z]+/g, 'an important person'); // Remove names
    }

    // Simplify emotional intensity descriptions
    if (anonymized.emotionLevel !== undefined) {
      anonymized.emotionLevel = Math.round(anonymized.emotionLevel / 2) * 2; // Round to even numbers
    }

    return anonymized;
  }

  /**
   * Format content for each social platform
   * @param {Object} content - Content to format
   * @param {boolean} anonymous - Whether content is anonymized
   * @returns {Object} - Platform-specific formatted content
   */
  formatContentForPlatforms(content, anonymous = false) {
    const disclaimer = anonymous ?
      "\n\n💙 *This is a shared experience for mental health awareness*\n#MentalHealthMatters #YouAreNotAlone" :
      "\n\n💙 *Taking care of my mental health*\n#MentalWellness #SelfCare";

    return {
      instagram: {
        ...content,
        text: content.text + disclaimer,
        hashtags: ['MentalWellness', 'SelfCare', 'WellBeing'],
        backgroundGradient: this.getInstagramStoryStyle(content.emotion || 'neutral')
      },
      tiktok: {
        ...content,
        text: content.text + disclaimer + '\n\nWhat about you? Share below! 👇',
        hashtags: ['MentalHealth', 'Wellbeing', 'TalkAboutIt', 'fyp', 'viral'],
        videoStyle: this.getTikTokVideoStyle(content.emotion || 'neutral'),
        music: this.getMoodBasedMusic(content.emotion || 'neutral')
      },
      twitter: {
        ...content,
        text: this.truncateForTwitter(content.text + disclaimer, 240),
        hashtags: ['MentalHealth', 'Wellbeing', 'SelfCare', 'YouAreNotAlone']
      }
    };
  }

  /**
   * Content template generators
   */
  getMoodTemplate(data) {
    const { mood, emotion, energy, note } = data;
    const moodLevel = Math.round(mood / 2);

    return {
      emotion: emotion?.toLowerCase() || 'neutral',
      text: `Feeling ${emotion || 'neutral'} today. Mood level: ${moodLevel}/5 ⭐\nEnergy: ${energy || 'steady'} ${
        note ? `\n"${note}"` : ''
      }`,
      visualStyle: this.getEmotionColor(emotion)
    };
  }

  getAchievementTemplate(data) {
    const { achievement, type, description } = data;

    return {
      emotion: 'proud',
      text: `Celebrating a personal victory! ${
        achievement ? `"${achievement}"` : 'Completed an important step'
      }\n${description || 'One step closer to better mental health'}\nEach achievement matters! 🎯`,
      visualStyle: { primary: '#FFD700', secondary: '#FFA500' }
    };
  }

  getWellnessTemplate(data) {
    const { activity, meditation, exercise, social } = data;

    return {
      emotion: 'peaceful',
      text: `Prioritizing wellness today 💚\n${
        meditation ? '🧘 Meditated ' + meditation + ' minutes\n' : ''
      }${exercise ? '🏃‍♀️ Some movement and exercise\n' : ''}${
        activity ? '📝 Journaled my thoughts\n' : ''
      }${social ? '💬 Connected with others\n' : ''}Small steps, big impact!`,
      visualStyle: { primary: '#4CAF50', secondary: '#81C784' }
    };
  }

  getGratitudeTemplate(data) {
    const { items = [] } = data;

    return {
      emotion: 'grateful',
      text: `Grateful for the good things today 🧡\n${items.map(item => `• ${item}`).join('\n')}\nGratitude changes everything!`,
      visualStyle: { primary: '#FF9800', secondary: '#FFCC02' }
    };
  }

  // Platform-specific styling helpers
  getInstagramStoryStyle(emotion) {
    const styles = {
      happy: ['#FFD700', '#FFA500'],
      sad: ['#2196F3', '#21CBF3'],
      anxious: ['#F44336', '#FF5722'],
      calm: ['#4CAF50', '#81C784'],
      neutral: ['#9C27B0', '#BA68C8'],
      proud: ['#FFD700', '#FF6F00']
    };
    return styles[emotion] || styles.neutral;
  }

  getTikTokVideoStyle(emotion) {
    const styles = {
      happy: { filter: 'bright', effect: 'sparkle' },
      sad: { filter: 'cool', effect: 'reflection' },
      anxious: { filter: 'warm', effect: 'blur' },
      calm: { filter: 'cool', effect: 'glow' },
      neutral: { filter: 'normal', effect: 'none' },
      proud: { filter: 'bright', effect: 'shine' }
    };
    return styles[emotion] || styles.neutral;
  }

  getMoodBasedMusic(emotion) {
    const music = {
      happy: 'Uplifting',
      sad: 'Comforting',
      anxious: 'Calming',
      calm: 'Ambient',
      neutral: 'Soft',
      proud: 'Triumphant'
    };
    return music[emotion] || 'Ambient';
  }

  getEmotionColor(emotion) {
    const colors = {
      happy: { primary: '#FFD700', secondary: '#FFA500' },
      sad: { primary: '#2196F3', secondary: '#21CBF3' },
      anxious: { primary: '#F44336', secondary: '#FF5722' },
      calm: { primary: '#4CAF50', secondary: '#81C784' },
      proud: { primary: '#FFD700', secondary: '#FF6F00' },
      neutral: { primary: '#9C27B0', secondary: '#BA68C8' }
    };
    return colors[emotion] || colors.neutral;
  }

  /**
   * Share content to specific platform
   * @param {string} platform - Platform to share to
   * @param {Object} content - Formatted content for the platform
   * @param {Object} options - Additional sharing options
   */
  async shareToPlatform(platform, content, options = {}) {
    try {
      switch (platform) {
        case this.platforms.instagram:
          return await this.shareToInstagram(content, options);
        case this.platforms.tiktok:
          return await this.shareToTikTok(content, options);
        case this.platforms.twitter:
          return await this.shareToTwitter(content, options);
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      console.error(`Error sharing to ${platform}:`, error);
      throw error;
    }
  }

  /**
   * Share to Instagram Stories
   * Uses URL schemes to open Instagram and pre-populate content
   */
  async shareToInstagram(content, options) {
    const { backgroundGradient } = content;

    try {
      // Check if Instagram is installed
      const instagramUrl = `instagram-stories://share`;

      // Create query parameters for Instagram Stories
      const params = new URLSearchParams({
        backgroundTopColor: backgroundGradient[0].replace('#', ''),
        backgroundBottomColor: backgroundGradient[1].replace('#', ''),
        content_url: '', // Could add image URL here
        caption: content.text
      });

      const fullUrl = `${instagramUrl}?${params.toString()}`;

      const supported = await Linking.canOpenURL(instagramUrl);
      if (supported) {
        await Linking.openURL(fullUrl);
        return { success: true, platform: 'instagram', shared: true };
      } else {
        // Fallback to web Instagram
        const webUrl = `https://www.instagram.com/stories/create/`;
        await Linking.openURL(webUrl);
        return { success: true, platform: 'instagram', shared: true, fallback: true };
      }
    } catch (error) {
      return {
        success: false,
        platform: 'instagram',
        shared: false,
        error: error.message
      };
    }
  }

  /**
   * Share to TikTok
   * Uses TikTok app URL schemes
   */
  async shareToTikTok(content, options) {
    try {
      const tiktokUrl = `https://www.tiktok.com/upload`;

      // Prepare text for TikTok
      const shareText = encodeURIComponent(content.text);
      const hashtags = content.hashtags.map(tag => `#${tag}`).join(' ');

      const fullUrl = `${tiktokUrl}?text=${shareText}&hashtags=${encodeURIComponent(hashtags)}`;

      const supported = await Linking.canOpenURL('tiktok://');
      if (supported) {
        await Linking.openURL(fullUrl);
        return { success: true, platform: 'tiktok', shared: true };
      } else {
        // Fallback to web
        await Linking.openURL(fullUrl);
        return { success: true, platform: 'tiktok', shared: true, fallback: true };
      }
    } catch (error) {
      return {
        success: false,
        platform: 'tiktok',
        shared: false,
        error: error.message
      };
    }
  }

  /**
   * Share to Twitter/X
   * Uses Twitter's web intents for sharing
   */
  async shareToTwitter(content, options) {
    try {
      const baseUrl = 'https://twitter.com/intent/tweet';
      const text = encodeURIComponent(content.text);
      const hashtags = content.hashtags.join(',');

      let tweetUrl = `${baseUrl}?text=${text}&hashtags=${hashtags}`;

      // Add via parameter if provided
      if (options.via) {
        tweetUrl += `&via=${options.via}`;
      }

      await Linking.openURL(tweetUrl);
      return { success: true, platform: 'twitter', shared: true };
    } catch (error) {
      return {
        success: false,
        platform: 'twitter',
        shared: false,
        error: error.message
      };
    }
  }

  /**
   * Batch share to multiple platforms
   * @param {Array} platforms - Array of platforms to share to
   * @param {Object} data - Original data
   * @param {Object} options - Sharing options
   */
  async shareToMultiple(platforms, data, options = {}) {
    const results = [];
    const content = this.generateAnonymizedContent(data, options.template, options.anonymous);

    for (const platform of platforms) {
      try {
        const result = await this.shareToPlatform(platform, content[platform], options);
        results.push(result);
      } catch (error) {
        results.push({
          platform,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Utility to truncate text for Twitter's character limit
   */
  truncateForTwitter(text, maxLength = 240) {
    if (text.length <= maxLength) return text;

    const truncated = text.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');

    return lastSpace > 0
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }

  /**
   * Check if platform apps are installed
   */
  async checkPlatformAvailability(platform) {
    try {
      switch (platform) {
        case this.platforms.instagram:
          return await Linking.canOpenURL('instagram://');
        case this.platforms.tiktok:
          return await Linking.canOpenURL('tiktok://');
        case this.platforms.twitter:
          return await Linking.canOpenURL('twitter://');
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get sharing recommendations based on content type
   */
  getSharingRecommendations(contentType, userPreferences) {
    const recommendations = {
      mood: ['twitter', 'instagram'],
      achievement: ['instagram', 'tiktok'],
      wellness: ['instagram', 'tiktok'],
      gratitude: ['twitter', 'instagram']
    };

    let platforms = recommendations[contentType] || ['twitter'];

    // Respect user preferences for anonymous sharing
    if (userPreferences.anonymousOnly) {
      platforms = platforms.filter(p => p !== 'tiktok'); // TikTok has stronger privacy concerns
    }

    return platforms;
  }
}

const socialSharingService = new SocialSharingService();
export default socialSharingService;
