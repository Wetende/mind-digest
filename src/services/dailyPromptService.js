import { supabase } from '../config/supabase';

/**
 * Daily Prompt Service for Mental Health Content Creation
 * Provides daily wellness prompts for social sharing and self-reflection
 */

class DailyPromptService {
  constructor() {
    this.promptCategories = {
      gratitude: 'Gratitude & Appreciation',
      mindfulness: 'Mindfulness & Presence',
      growth: 'Personal Growth',
      connection: 'Social Connection',
      selfcare: 'Self-Care & Wellness',
      resilience: 'Strength & Resilience',
      hope: 'Hope & Positivity',
      reflection: 'Daily Reflection'
    };

    // Prompt templates for different categories
    this.promptTemplates = {
      gratitude: [
        "What are three small things that brought you joy today?",
        "Who in your life are you most grateful for right now?",
        "What's one thing about your body that you appreciate today?",
        "What moment today made you smile?",
        "What's something you often take for granted that you're thankful for?",
        "What's a recent act of kindness you witnessed or received?",
        "What's one thing about your current situation that you're grateful for?",
        "What skill or ability of yours are you most thankful for?"
      ],
      mindfulness: [
        "How are you feeling in this exact moment?",
        "What can you hear, see, and feel around you right now?",
        "What's one thing you noticed today that you usually overlook?",
        "How did you practice being present today?",
        "What emotions came up for you today, and how did you handle them?",
        "What's one way you showed yourself compassion today?",
        "How did you take care of your mental health today?",
        "What's something that helped you feel grounded today?"
      ],
      growth: [
        "What's one thing you learned about yourself today?",
        "How did you step outside your comfort zone recently?",
        "What challenge are you currently working through?",
        "What's a small win you had today?",
        "How have you grown in the past month?",
        "What's one habit you're proud of building?",
        "What mistake taught you something valuable recently?",
        "What's one way you've been kinder to yourself lately?"
      ],
      connection: [
        "How did you connect with someone meaningful today?",
        "What's one way you showed care for someone else?",
        "Who made you feel understood recently?",
        "What's something you'd like to tell someone but haven't yet?",
        "How did you practice empathy today?",
        "What's one way you felt supported by your community?",
        "Who could use some encouragement from you right now?",
        "What's a conversation that made you feel less alone?"
      ],
      selfcare: [
        "What's one way you nurtured yourself today?",
        "How did you honor your needs today?",
        "What activity helped you recharge recently?",
        "What boundary did you set for your wellbeing?",
        "How did you practice saying no to protect your energy?",
        "What's one thing you did just because it made you happy?",
        "How did you take care of your physical health today?",
        "What's a self-care practice you want to try?"
      ],
      resilience: [
        "What's one way you showed strength today?",
        "How did you bounce back from a difficult moment?",
        "What's helping you get through tough times right now?",
        "What's one thing you're proud of overcoming?",
        "How have you surprised yourself with your resilience?",
        "What keeps you going when things get hard?",
        "What's one coping strategy that really works for you?",
        "How have you grown stronger through adversity?"
      ],
      hope: [
        "What are you looking forward to?",
        "What gives you hope for the future?",
        "What's one positive change you've noticed in yourself?",
        "What's something good that could happen tomorrow?",
        "What dream are you working toward?",
        "What's one reason to be optimistic about your journey?",
        "What progress have you made that you're proud of?",
        "What's one thing that always lifts your spirits?"
      ],
      reflection: [
        "What was the highlight of your day?",
        "What would you tell your past self about today?",
        "What's one thing you'd do differently today?",
        "What emotion dominated your day, and why?",
        "What's one thing you accomplished that you're proud of?",
        "How did you show up for yourself today?",
        "What's one lesson today taught you?",
        "What are you most proud of about how you handled today?"
      ]
    };
  }

  /**
   * Get today's daily prompt based on user preferences and history
   * @param {string} userId - User ID
   * @param {Array} preferredCategories - User's preferred prompt categories
   * @returns {Object} Daily prompt with category, question, and sharing suggestions
   */
  async getTodaysPrompt(userId, preferredCategories = []) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if user already has a prompt for today
      const { data: existingPrompt } = await supabase
        .from('daily_prompts')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (existingPrompt) {
        return this.formatPromptResponse(existingPrompt);
      }

      // Generate new prompt for today
      const selectedCategory = this.selectPromptCategory(preferredCategories);
      const promptText = this.selectPromptFromCategory(selectedCategory, userId);
      
      // Create new prompt record
      const newPrompt = {
        user_id: userId,
        date: today,
        category: selectedCategory,
        prompt_text: promptText,
        is_completed: false,
        created_at: new Date().toISOString()
      };

      const { data: savedPrompt, error } = await supabase
        .from('daily_prompts')
        .insert([newPrompt])
        .select()
        .single();

      if (error) throw error;

      return this.formatPromptResponse(savedPrompt);
    } catch (error) {
      console.error('Error getting daily prompt:', error);
      // Return fallback prompt
      return this.getFallbackPrompt();
    }
  }

  /**
   * Select appropriate category based on user preferences and history
   * @param {Array} preferredCategories - User's preferred categories
   * @returns {string} Selected category
   */
  selectPromptCategory(preferredCategories = []) {
    const availableCategories = Object.keys(this.promptCategories);
    
    if (preferredCategories.length > 0) {
      const validPreferences = preferredCategories.filter(cat => 
        availableCategories.includes(cat)
      );
      if (validPreferences.length > 0) {
        return validPreferences[Math.floor(Math.random() * validPreferences.length)];
      }
    }
    
    // Default to random category
    return availableCategories[Math.floor(Math.random() * availableCategories.length)];
  }

  /**
   * Select a prompt from the specified category
   * @param {string} category - Prompt category
   * @param {string} userId - User ID for personalization
   * @returns {string} Selected prompt text
   */
  selectPromptFromCategory(category, userId) {
    const prompts = this.promptTemplates[category] || this.promptTemplates.reflection;
    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  /**
   * Format prompt response for client consumption
   * @param {Object} promptData - Raw prompt data from database
   * @returns {Object} Formatted prompt response
   */
  formatPromptResponse(promptData) {
    return {
      id: promptData.id,
      category: promptData.category,
      categoryName: this.promptCategories[promptData.category],
      promptText: promptData.prompt_text,
      date: promptData.date,
      isCompleted: promptData.is_completed,
      sharingSuggestions: this.generateSharingSuggestions(promptData.category),
      createdAt: promptData.created_at
    };
  }

  /**
   * Generate platform-specific sharing suggestions
   * @param {string} category - Prompt category
   * @returns {Object} Sharing suggestions for each platform
   */
  generateSharingSuggestions(category) {
    const suggestions = {
      instagram: {
        format: 'story',
        hashtags: this.getHashtagsForCategory(category),
        template: 'Daily reflection 💭\n\n{prompt}\n\n{hashtags}',
        backgroundColor: this.getColorForCategory(category)
      },
      tiktok: {
        format: 'video',
        duration: '15-30s',
        template: 'Today\'s mental health check-in: {prompt}',
        hashtags: ['#mentalhealth', '#selfcare', '#dailyreflection']
      },
      x: {
        format: 'text',
        template: '{prompt}\n\n#MentalHealthMatters #SelfCare',
        characterLimit: 280
      },
      facebook: {
        format: 'post',
        template: 'Daily wellness reflection:\n\n{prompt}\n\nWhat\'s your answer? 💙',
        privacy: 'friends'
      }
    };

    return suggestions;
  }

  /**
   * Get hashtags for specific category
   * @param {string} category - Prompt category
   * @returns {Array} Relevant hashtags
   */
  getHashtagsForCategory(category) {
    const hashtagMap = {
      gratitude: ['#gratitude', '#thankful', '#blessed', '#appreciation'],
      mindfulness: ['#mindfulness', '#present', '#awareness', '#meditation'],
      growth: ['#personalgrowth', '#selfimprovement', '#progress', '#learning'],
      connection: ['#connection', '#community', '#support', '#together'],
      selfcare: ['#selfcare', '#wellness', '#mentalhealth', '#selflove'],
      resilience: ['#resilience', '#strength', '#overcome', '#courage'],
      hope: ['#hope', '#optimism', '#future', '#dreams'],
      reflection: ['#reflection', '#thoughts', '#mindful', '#awareness']
    };

    return hashtagMap[category] || ['#mentalhealth', '#wellness', '#selfcare'];
  }

  /**
   * Get color theme for category
   * @param {string} category - Prompt category
   * @returns {string} Color hex code
   */
  getColorForCategory(category) {
    const colorMap = {
      gratitude: '#FFD700', // Gold
      mindfulness: '#87CEEB', // Sky Blue
      growth: '#98FB98', // Pale Green
      connection: '#DDA0DD', // Plum
      selfcare: '#F0E68C', // Khaki
      resilience: '#CD853F', // Peru
      hope: '#FFB6C1', // Light Pink
      reflection: '#B0C4DE'  // Light Steel Blue
    };

    return colorMap[category] || '#87CEEB';
  }

  /**
   * Mark prompt as completed and save user response
   * @param {string} promptId - Prompt ID
   * @param {string} userResponse - User's response to the prompt
   * @returns {Object} Updated prompt data
   */
  async completePrompt(promptId, userResponse = '') {
    try {
      const { data, error } = await supabase
        .from('daily_prompts')
        .update({
          is_completed: true,
          user_response: userResponse,
          completed_at: new Date().toISOString()
        })
        .eq('id', promptId)
        .select()
        .single();

      if (error) throw error;
      return this.formatPromptResponse(data);
    } catch (error) {
      console.error('Error completing prompt:', error);
      throw error;
    }
  }

  /**
   * Get user's prompt history
   * @param {string} userId - User ID
   * @param {number} limit - Number of prompts to retrieve
   * @returns {Array} Array of prompt history
   */
  async getPromptHistory(userId, limit = 30) {
    try {
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data.map(prompt => this.formatPromptResponse(prompt));
    } catch (error) {
      console.error('Error getting prompt history:', error);
      return [];
    }
  }

  /**
   * Get fallback prompt when service fails
   * @returns {Object} Fallback prompt
   */
  getFallbackPrompt() {
    const fallbackPrompts = [
      "How are you taking care of your mental health today?",
      "What's one thing you're grateful for right now?",
      "What small act of self-care can you do today?",
      "How are you feeling in this moment?"
    ];

    const randomPrompt = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];

    return {
      id: 'fallback',
      category: 'reflection',
      categoryName: 'Daily Reflection',
      promptText: randomPrompt,
      date: new Date().toISOString().split('T')[0],
      isCompleted: false,
      sharingSuggestions: this.generateSharingSuggestions('reflection'),
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Update user's prompt preferences
   * @param {string} userId - User ID
   * @param {Array} preferredCategories - New preferred categories
   * @returns {boolean} Success status
   */
  async updatePromptPreferences(userId, preferredCategories) {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          prompt_categories: preferredCategories,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating prompt preferences:', error);
      return false;
    }
  }

  /**
   * Get analytics for prompt engagement
   * @param {string} userId - User ID
   * @returns {Object} Engagement analytics
   */
  async getPromptAnalytics(userId) {
    try {
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('category, is_completed, date')
        .eq('user_id', userId);

      if (error) throw error;

      const analytics = {
        totalPrompts: data.length,
        completedPrompts: data.filter(p => p.is_completed).length,
        completionRate: 0,
        categoryBreakdown: {},
        streakDays: 0
      };

      if (analytics.totalPrompts > 0) {
        analytics.completionRate = (analytics.completedPrompts / analytics.totalPrompts) * 100;
      }

      // Category breakdown
      data.forEach(prompt => {
        if (!analytics.categoryBreakdown[prompt.category]) {
          analytics.categoryBreakdown[prompt.category] = { total: 0, completed: 0 };
        }
        analytics.categoryBreakdown[prompt.category].total++;
        if (prompt.is_completed) {
          analytics.categoryBreakdown[prompt.category].completed++;
        }
      });

      // Calculate current streak
      const sortedDates = data
        .filter(p => p.is_completed)
        .map(p => p.date)
        .sort()
        .reverse();

      let streak = 0;
      const today = new Date().toISOString().split('T')[0];
      let currentDate = new Date(today);

      for (const date of sortedDates) {
        const checkDate = currentDate.toISOString().split('T')[0];
        if (date === checkDate) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      analytics.streakDays = streak;
      return analytics;
    } catch (error) {
      console.error('Error getting prompt analytics:', error);
      return {
        totalPrompts: 0,
        completedPrompts: 0,
        completionRate: 0,
        categoryBreakdown: {},
        streakDays: 0
      };
    }
  }
}

export default new DailyPromptService();