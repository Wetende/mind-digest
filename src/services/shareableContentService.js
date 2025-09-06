import { supabase } from '../config/supabase';
import dailyPromptService from './dailyPromptService';

/**
 * Shareable Content Service
 * Handles content generation, anonymization, and platform-specific formatting
 */

class ShareableContentService {
  constructor() {
    this.contentTypes = {
      mood_update: 'Mood Update',
      achievement: 'Achievement',
      tip: 'Wellness Tip',
      quote: 'Inspirational Quote',
      prompt_response: 'Daily Reflection',
      milestone: 'Milestone Celebration'
    };

    this.platformSpecs = {
      instagram: {
        story: {
          maxLength: 2200,
          aspectRatio: '9:16',
          recommendedSize: '1080x1920'
        },
        post: {
          maxLength: 2200,
          aspectRatio: '1:1',
          recommendedSize: '1080x1080'
        }
      },
      tiktok: {
        video: {
          maxDuration: 180, // seconds
          aspectRatio: '9:16',
          recommendedSize: '1080x1920'
        }
      },
      x: {
        post: {
          maxLength: 280,
          mediaSupported: true
        }
      },
      facebook: {
        post: {
          maxLength: 63206,
          aspectRatio: '16:9',
          recommendedSize: '1200x630'
        }
      }
    };
  }

  /**
   * Generate shareable content from user input
   * @param {Object} contentData - Content data including type, message, mood, etc.
   * @param {string} userId - User ID
   * @param {boolean} isAnonymous - Whether to anonymize the content
   * @returns {Object} Generated shareable content
   */
  async generateShareableContent(contentData, userId, isAnonymous = true) {
    try {
      const {
        type,
        message,
        mood,
        achievement,
        promptResponse,
        platforms = ['instagram', 'x', 'facebook']
      } = contentData;

      // Create base content
      const baseContent = await this.createBaseContent(type, {
        message,
        mood,
        achievement,
        promptResponse
      });

      // Anonymize if requested
      const anonymizedContent = isAnonymous 
        ? this.anonymizeContent(baseContent, userId)
        : baseContent;

      // Generate platform-specific versions
      const platformContent = {};
      for (const platform of platforms) {
        platformContent[platform] = this.formatForPlatform(
          anonymizedContent,
          platform,
          type
        );
      }

      // Save to database
      const shareableContent = {
        user_id: userId,
        content_type: type,
        base_content: anonymizedContent,
        platform_content: platformContent,
        is_anonymous: isAnonymous,
        platforms: platforms,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('shareable_content')
        .insert([shareableContent])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        type: type,
        baseContent: anonymizedContent,
        platformContent: platformContent,
        isAnonymous: isAnonymous,
        platforms: platforms,
        createdAt: data.created_at
      };

    } catch (error) {
      console.error('Error generating shareable content:', error);
      throw error;
    }
  }

  /**
   * Create base content based on type and input data
   * @param {string} type - Content type
   * @param {Object} data - Input data
   * @returns {Object} Base content structure
   */
  async createBaseContent(type, data) {
    const templates = {
      mood_update: this.createMoodUpdateContent,
      achievement: this.createAchievementContent,
      tip: this.createTipContent,
      quote: this.createQuoteContent,
      prompt_response: this.createPromptResponseContent,
      milestone: this.createMilestoneContent
    };

    const createFunction = templates[type] || templates.mood_update;
    return await createFunction.call(this, data);
  }

  /**
   * Create mood update content
   * @param {Object} data - Mood data
   * @returns {Object} Mood update content
   */
  createMoodUpdateContent(data) {
    const { mood, message } = data;
    const moodEmoji = this.getMoodEmoji(mood);
    const moodText = this.getMoodText(mood);

    return {
      title: `Today's Mood Check-in ${moodEmoji}`,
      content: message || `Feeling ${moodText} today. Taking it one step at a time.`,
      hashtags: ['#MoodCheck', '#MentalHealthMatters', '#SelfCare', '#Wellness'],
      emoji: moodEmoji,
      category: 'mood'
    };
  }

  /**
   * Create achievement content
   * @param {Object} data - Achievement data
   * @returns {Object} Achievement content
   */
  createAchievementContent(data) {
    const { achievement, message } = data;

    return {
      title: '🎉 Small Win Alert!',
      content: message || `Celebrating a personal victory: ${achievement}`,
      hashtags: ['#SmallWins', '#Progress', '#MentalHealthWins', '#Proud'],
      emoji: '🎉',
      category: 'achievement'
    };
  }

  /**
   * Create wellness tip content
   * @param {Object} data - Tip data
   * @returns {Object} Tip content
   */
  createTipContent(data) {
    const { message } = data;
    const tips = [
      "Take 3 deep breaths when feeling overwhelmed",
      "Practice the 5-4-3-2-1 grounding technique",
      "Write down 3 things you're grateful for",
      "Take a 5-minute walk outside",
      "Reach out to a friend or loved one"
    ];

    const tip = message || tips[Math.floor(Math.random() * tips.length)];

    return {
      title: '💡 Wellness Tip',
      content: tip,
      hashtags: ['#WellnessTip', '#MentalHealthTips', '#SelfCare', '#Mindfulness'],
      emoji: '💡',
      category: 'tip'
    };
  }

  /**
   * Create inspirational quote content
   * @param {Object} data - Quote data
   * @returns {Object} Quote content
   */
  createQuoteContent(data) {
    const { message } = data;
    const quotes = [
      "Progress, not perfection.",
      "You are stronger than you think.",
      "It's okay to not be okay.",
      "Healing is not linear.",
      "You matter, and your feelings are valid."
    ];

    const quote = message || quotes[Math.floor(Math.random() * quotes.length)];

    return {
      title: '✨ Daily Reminder',
      content: `"${quote}"`,
      hashtags: ['#MentalHealthQuote', '#Inspiration', '#YouMatter', '#Healing'],
      emoji: '✨',
      category: 'quote'
    };
  }

  /**
   * Create prompt response content
   * @param {Object} data - Prompt response data
   * @returns {Object} Prompt response content
   */
  createPromptResponseContent(data) {
    const { promptResponse, message } = data;

    return {
      title: '💭 Daily Reflection',
      content: message || promptResponse || "Taking time for self-reflection today.",
      hashtags: ['#DailyReflection', '#Mindfulness', '#SelfAwareness', '#Growth'],
      emoji: '💭',
      category: 'reflection'
    };
  }

  /**
   * Create milestone content
   * @param {Object} data - Milestone data
   * @returns {Object} Milestone content
   */
  createMilestoneContent(data) {
    const { achievement, message } = data;

    return {
      title: '🏆 Milestone Reached!',
      content: message || `Reached an important milestone: ${achievement}`,
      hashtags: ['#Milestone', '#Progress', '#MentalHealthJourney', '#Proud'],
      emoji: '🏆',
      category: 'milestone'
    };
  }

  /**
   * Anonymize content to protect user privacy
   * @param {Object} content - Original content
   * @param {string} userId - User ID
   * @returns {Object} Anonymized content
   */
  anonymizeContent(content, userId) {
    const anonymized = { ...content };

    // Remove or replace personal identifiers
    anonymized.content = this.removePersonalInfo(content.content);
    
    // Add anonymization disclaimer
    anonymized.disclaimer = "Shared anonymously to support mental health awareness";
    
    // Generate anonymous identifier for consistency
    anonymized.anonymousId = this.generateAnonymousId(userId);

    return anonymized;
  }

  /**
   * Remove personal information from content
   * @param {string} text - Original text
   * @returns {string} Sanitized text
   */
  removePersonalInfo(text) {
    if (!text) return text;

    // Replace common personal identifiers
    let sanitized = text
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]')
      .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[phone]')
      .replace(/\b\d{3}\.\d{3}\.\d{4}\b/g, '[phone]')
      .replace(/\b\(\d{3}\)\s*\d{3}-\d{4}\b/g, '[phone]')
      .replace(/\b\d{1,5}\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi, '[address]')
      .replace(/\b(my name is|i'm|i am)\s+[A-Z][a-z]+/gi, 'I am [name]')
      .replace(/\b[A-Z][a-z]+\s+(said|told me|asked me)/gi, '[someone] $1');

    return sanitized;
  }

  /**
   * Generate consistent anonymous ID for user
   * @param {string} userId - User ID
   * @returns {string} Anonymous identifier
   */
  generateAnonymousId(userId) {
    // Create a simple hash-based anonymous ID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `Anonymous${Math.abs(hash) % 10000}`;
  }

  /**
   * Format content for specific platform
   * @param {Object} content - Base content
   * @param {string} platform - Target platform
   * @param {string} type - Content type
   * @returns {Object} Platform-formatted content
   */
  formatForPlatform(content, platform, type) {
    const formatters = {
      instagram: this.formatForInstagram,
      tiktok: this.formatForTikTok,
      x: this.formatForX,
      facebook: this.formatForFacebook
    };

    const formatter = formatters[platform];
    return formatter ? formatter.call(this, content, type) : content;
  }

  /**
   * Format content for Instagram
   * @param {Object} content - Base content
   * @param {string} type - Content type
   * @returns {Object} Instagram-formatted content
   */
  formatForInstagram(content, type) {
    const hashtagString = content.hashtags.join(' ');
    
    return {
      story: {
        text: `${content.title}\n\n${content.content}`,
        hashtags: hashtagString,
        backgroundColor: this.getColorForCategory(content.category),
        stickers: [content.emoji],
        template: 'story'
      },
      post: {
        caption: `${content.content}\n\n${hashtagString}`,
        image: null, // Will be generated separately
        template: 'post'
      }
    };
  }

  /**
   * Format content for TikTok
   * @param {Object} content - Base content
   * @param {string} type - Content type
   * @returns {Object} TikTok-formatted content
   */
  formatForTikTok(content, type) {
    const hashtagString = content.hashtags.map(tag => tag.replace('#', '')).join(' #');
    
    return {
      description: `${content.content} #${hashtagString}`,
      videoScript: `Today's mental health moment: ${content.content}`,
      duration: 15,
      template: 'video'
    };
  }

  /**
   * Format content for X (Twitter)
   * @param {Object} content - Base content
   * @param {string} type - Content type
   * @returns {Object} X-formatted content
   */
  formatForX(content, type) {
    const maxLength = this.platformSpecs.x.post.maxLength;
    const hashtagString = content.hashtags.slice(0, 2).join(' '); // Limit hashtags for character count
    
    let text = `${content.content}\n\n${hashtagString}`;
    
    // Truncate if too long
    if (text.length > maxLength) {
      const availableLength = maxLength - hashtagString.length - 5; // 5 for "\n\n" and "..."
      text = `${content.content.substring(0, availableLength)}...\n\n${hashtagString}`;
    }

    return {
      text: text,
      template: 'post'
    };
  }

  /**
   * Format content for Facebook
   * @param {Object} content - Base content
   * @param {string} type - Content type
   * @returns {Object} Facebook-formatted content
   */
  formatForFacebook(content, type) {
    return {
      message: `${content.title}\n\n${content.content}\n\n${content.hashtags.join(' ')}`,
      privacy: 'friends',
      template: 'post'
    };
  }

  /**
   * Get mood emoji based on mood value
   * @param {number} mood - Mood value (1-10)
   * @returns {string} Mood emoji
   */
  getMoodEmoji(mood) {
    if (mood >= 8) return '😊';
    if (mood >= 6) return '🙂';
    if (mood >= 4) return '😐';
    if (mood >= 2) return '😔';
    return '😢';
  }

  /**
   * Get mood text based on mood value
   * @param {number} mood - Mood value (1-10)
   * @returns {string} Mood description
   */
  getMoodText(mood) {
    if (mood >= 8) return 'great';
    if (mood >= 6) return 'good';
    if (mood >= 4) return 'okay';
    if (mood >= 2) return 'low';
    return 'struggling';
  }

  /**
   * Get color for content category
   * @param {string} category - Content category
   * @returns {string} Color hex code
   */
  getColorForCategory(category) {
    const colorMap = {
      mood: '#87CEEB',
      achievement: '#98FB98',
      tip: '#FFD700',
      quote: '#DDA0DD',
      reflection: '#F0E68C',
      milestone: '#FFB6C1'
    };

    return colorMap[category] || '#87CEEB';
  }

  /**
   * Get user's shareable content history
   * @param {string} userId - User ID
   * @param {number} limit - Number of items to retrieve
   * @returns {Array} Content history
   */
  async getContentHistory(userId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('shareable_content')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting content history:', error);
      return [];
    }
  }

  /**
   * Delete shareable content
   * @param {string} contentId - Content ID
   * @param {string} userId - User ID
   * @returns {boolean} Success status
   */
  async deleteContent(contentId, userId) {
    try {
      const { error } = await supabase
        .from('shareable_content')
        .delete()
        .eq('id', contentId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting content:', error);
      return false;
    }
  }
}

export default new ShareableContentService();