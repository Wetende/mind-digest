import AsyncStorage from '@react-native-async-storage/async-storage';
import aiService from './aiService';

class BehaviorLearningService {
  constructor() {
    this.userInteractions = new Map();
    this.preferences = new Map();
    this.contextHistory = [];
    this.loadUserData();
  }

  async loadUserData() {
    try {
      const storedInteractions = await AsyncStorage.getItem('user_interactions');
      const storedPreferences = await AsyncStorage.getItem('user_preferences');
      const storedContext = await AsyncStorage.getItem('context_history');
      
      if (storedInteractions) {
        const interactions = JSON.parse(storedInteractions);
        this.userInteractions = new Map(Object.entries(interactions));
      }
      
      if (storedPreferences) {
        const preferences = JSON.parse(storedPreferences);
        this.preferences = new Map(Object.entries(preferences));
      }
      
      if (storedContext) {
        this.contextHistory = JSON.parse(storedContext);
      }
    } catch (error) {
      console.error('Failed to load user behavior data:', error);
    }
  }

  async saveUserData() {
    try {
      await AsyncStorage.setItem(
        'user_interactions',
        JSON.stringify(Object.fromEntries(this.userInteractions))
      );
      await AsyncStorage.setItem(
        'user_preferences',
        JSON.stringify(Object.fromEntries(this.preferences))
      );
      await AsyncStorage.setItem(
        'context_history',
        JSON.stringify(this.contextHistory.slice(-100)) // Keep last 100 entries
      );
    } catch (error) {
      console.error('Failed to save user behavior data:', error);
    }
  }

  // Track user interactions for learning
  async trackInteraction(interactionType, data) {
    const timestamp = Date.now();
    const interaction = {
      type: interactionType,
      data,
      timestamp,
      context: await this.getCurrentContext()
    };

    // Store interaction
    const key = `${interactionType}_${timestamp}`;
    this.userInteractions.set(key, interaction);

    // Update preferences based on interaction
    await this.updatePreferences(interactionType, data);

    // Save to storage
    await this.saveUserData();

    return interaction;
  }

  async getCurrentContext() {
    try {
      // Get current mood, time of day, and other contextual factors
      const currentHour = new Date().getHours();
      const dayOfWeek = new Date().getDay();
      
      // Get recent mood if available
      const recentMood = await this.getRecentMood();
      
      return {
        timeOfDay: this.categorizeTimeOfDay(currentHour),
        dayOfWeek,
        hour: currentHour,
        mood: recentMood,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to get current context:', error);
      return {
        timeOfDay: 'unknown',
        dayOfWeek: new Date().getDay(),
        hour: new Date().getHours(),
        mood: null,
        timestamp: Date.now()
      };
    }
  }

  categorizeTimeOfDay(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  async getRecentMood() {
    try {
      const moodData = await AsyncStorage.getItem('recent_mood');
      return moodData ? JSON.parse(moodData) : null;
    } catch (error) {
      return null;
    }
  }

  // Update user preferences based on interactions
  async updatePreferences(interactionType, data) {
    const currentPrefs = this.preferences.get(interactionType) || {
      frequency: 0,
      lastUsed: 0,
      contexts: {},
      effectiveness: 0,
      userRating: 0
    };

    // Update frequency and last used
    currentPrefs.frequency += 1;
    currentPrefs.lastUsed = Date.now();

    // Update context preferences
    const context = await this.getCurrentContext();
    const contextKey = `${context.timeOfDay}_${context.dayOfWeek}`;
    currentPrefs.contexts[contextKey] = (currentPrefs.contexts[contextKey] || 0) + 1;

    // Update effectiveness based on user behavior
    if (data.completed || data.rating) {
      const effectiveness = data.rating || (data.completed ? 1 : 0);
      currentPrefs.effectiveness = (currentPrefs.effectiveness + effectiveness) / 2;
    }

    this.preferences.set(interactionType, currentPrefs);
  }

  // Learn from user behavior patterns
  async learnUserPatterns() {
    try {
      const patterns = {
        timePreferences: this.analyzeTimePreferences(),
        contentPreferences: this.analyzeContentPreferences(),
        moodPatterns: await this.analyzeMoodBasedPreferences(),
        engagementPatterns: this.analyzeEngagementPatterns(),
        contextualPreferences: this.analyzeContextualPreferences()
      };

      return patterns;
    } catch (error) {
      console.error('Failed to learn user patterns:', error);
      return {
        timePreferences: {},
        contentPreferences: {},
        moodPatterns: {},
        engagementPatterns: {},
        contextualPreferences: {}
      };
    }
  }

  // Analyze when users prefer to engage with different activities
  analyzeTimePreferences() {
    const timePrefs = {
      morning: {},
      afternoon: {},
      evening: {},
      night: {}
    };

    for (const [key, interaction] of this.userInteractions) {
      if (interaction.context && interaction.context.timeOfDay) {
        const timeOfDay = interaction.context.timeOfDay;
        const interactionType = interaction.type;

        if (!timePrefs[timeOfDay][interactionType]) {
          timePrefs[timeOfDay][interactionType] = 0;
        }
        timePrefs[timeOfDay][interactionType]++;
      }
    }

    return timePrefs;
  }

  // Analyze which types of content users prefer
  analyzeContentPreferences() {
    const contentPrefs = {
      activityTypes: {},
      effectivenessScores: {},
      userRatings: {},
      completionRates: {}
    };

    for (const [interactionType, pref] of this.preferences) {
      contentPrefs.activityTypes[interactionType] = pref.frequency;
      contentPrefs.effectivenessScores[interactionType] = pref.effectiveness || 0;

      if (pref.userRating > 0) {
        contentPrefs.userRatings[interactionType] = pref.userRating;
      }

      // Calculate completion rate if interaction data includes completion info
      const completions = Array.from(this.userInteractions.values())
        .filter(interaction =>
          interaction.type === interactionType && interaction.data.completed
        ).length;

      if (pref.frequency > 0) {
        contentPrefs.completionRates[interactionType] = completions / pref.frequency;
      }
    }

    return contentPrefs;
  }

  // Analyze preferences based on user mood states
  async analyzeMoodBasedPreferences() {
    const moodPrefs = {
      happy: {},
      neutral: {},
      sad: {},
      anxious: {},
      stressed: {}
    };

    try {
      for (const [key, interaction] of this.userInteractions) {
        if (interaction.context && interaction.context.mood) {
          // Normalize mood to standard categories
          const moodCategory = this.normalizeMood(interaction.context.mood.emotion);
          const interactionType = interaction.type;

          if (!moodPrefs[moodCategory][interactionType]) {
            moodPrefs[moodCategory][interactionType] = 0;
          }
          moodPrefs[moodCategory][interactionType]++;
        }
      }

      // Use AI service to analyze mood patterns if available
      if (this.userInteractions.size > 5) {
        const moodAnalysis = await aiService.analyzeMoodPatterns(
          Array.from(this.userInteractions.values())
        );
        if (moodAnalysis) {
          moodPrefs.aiInsights = moodAnalysis;
        }
      }
    } catch (error) {
      console.error('Failed to analyze mood-based preferences:', error);
    }

    return moodPrefs;
  }

  normalizeMood(mood) {
    if (!mood) return 'neutral';
    const moodMap = {
      'joy': 'happy',
      'happiness': 'happy',
      'happy': 'happy',
      'sad': 'sad',
      'sadness': 'sad',
      'depressed': 'sad',
      'anxious': 'anxious',
      'anxiety': 'anxious',
      'worried': 'anxious',
      'stressed': 'stressed',
      'stress': 'stressed',
      'overwhelmed': 'stressed'
    };
    return moodMap[mood.toLowerCase()] || 'neutral';
  }

  // Analyze user engagement patterns and session behavior
  analyzeEngagementPatterns() {
    const engagement = {
      averageSessionLength: 0,
      preferredActivities: {},
      sessionFrequency: {},
      dropOffPoints: {},
      completionPatterns: {}
    };

    // Calculate session patterns
    const sessions = this.groupInteractionsBySession();

    if (sessions.length > 0) {
      const sessionLengths = sessions.map(session =>
        session.lastInteraction - session.firstInteraction
      );
      engagement.averageSessionLength = sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length;

      // Analyze frequency by day of week
      const daysOfWeek = sessions.map(session => new Date(session.firstInteraction).getDay());
      daysOfWeek.forEach(day => {
        engagement.sessionFrequency[day] = (engagement.sessionFrequency[day] || 0) + 1;
      });
    }

    // Find most engaging activities
    const activityEngagements = {};
    for (const [key, interaction] of this.userInteractions) {
      const type = interaction.type;
      if (!activityEngagements[type]) {
        activityEngagements[type] = {
          totalInteractions: 0,
          completedInteractions: 0,
          averageRating: 0,
          ratings: []
        };
      }

      activityEngagements[type].totalInteractions++;

      if (interaction.data.completed) {
        activityEngagements[type].completedInteractions++;
      }

      if (interaction.data.rating) {
        activityEngagements[type].ratings.push(interaction.data.rating);
        activityEngagements[type].averageRating =
          activityEngagements[type].ratings.reduce((a, b) => a + b, 0) /
          activityEngagements[type].ratings.length;
      }
    }

    // Convert to preferences
    Object.entries(activityEngagements).forEach(([type, data]) => {
      const completionRate = data.completedInteractions / data.totalInteractions;
      engagement.preferredActivities[type] = {
        frequencyScore: data.totalInteractions,
        completionRate: completionRate,
        averageRating: data.averageRating || 0,
        engagementScore: (completionRate * 0.7) + (data.averageRating * 0.3)
      };
    });

    return engagement;
  }

  groupInteractionsBySession() {
    const sessions = [];
    let currentSession = null;
    const sessionGap = 30 * 60 * 1000; // 30 minutes

    const sortedInteractions = Array.from(this.userInteractions.values())
      .sort((a, b) => a.timestamp - b.timestamp);

    sortedInteractions.forEach(interaction => {
      if (!currentSession ||
          (interaction.timestamp - currentSession.lastInteraction) > sessionGap) {
        currentSession = {
          firstInteraction: interaction.timestamp,
          lastInteraction: interaction.timestamp,
          interactions: [interaction]
        };
        sessions.push(currentSession);
      } else {
        currentSession.lastInteraction = interaction.timestamp;
        currentSession.interactions.push(interaction);
      }
    });

    return sessions;
  }

  // Analyze contextual preferences (location, device, time combinations)
  analyzeContextualPreferences() {
    const contextualPrefs = {
      timeDayCombinations: {},
      moodDayCombinations: {},
      peakActivityTimes: {},
      contextualEffectiveness: {}
    };

    for (const [key, interaction] of this.userInteractions) {
      if (interaction.context) {
        const ctx = interaction.context;
        const type = interaction.type;

        // Time and day combinations
        const timeDayKey = `${ctx.timeOfDay}_${ctx.dayOfWeek}`;
        if (!contextualPrefs.timeDayCombinations[timeDayKey]) {
          contextualPrefs.timeDayCombinations[timeDayKey] = {};
        }
        contextualPrefs.timeDayCombinations[timeDayKey][type] =
          (contextualPrefs.timeDayCombinations[timeDayKey][type] || 0) + 1;

        // Mood and day combinations
        if (ctx.mood) {
          const moodDayKey = `${this.normalizeMood(ctx.mood.emotion)}_${ctx.dayOfWeek}`;
          if (!contextualPrefs.moodDayCombinations[moodDayKey]) {
            contextualPrefs.moodDayCombinations[moodDayKey] = {};
          }
          contextualPrefs.moodDayCombinations[moodDayKey][type] =
            (contextualPrefs.moodDayCombinations[moodDayKey][type] || 0) + 1;
        }
      }
    }

    // Find peak activity times
    const hourDistribution = {};
    for (const [key, interaction] of this.userInteractions) {
      if (interaction.context && interaction.context.hour !== undefined) {
        const hour = interaction.context.hour;
        hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
      }
    }

    // Find top 3 peak hours
    const sortedHours = Object.entries(hourDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    contextualPrefs.peakActivityTimes = Object.fromEntries(sortedHours);

    return contextualPrefs;
  }

  // Generate personalized recommendations based on learning patterns
  async generateRecommendations(options = {}) {
    try {
      const patterns = await this.learnUserPatterns();
      const context = await this.getCurrentContext();

      const recommendations = {
        suggestedActivities: [],
        optimalTimes: [],
        moodBasedSuggestions: [],
        contextAwareTips: []
      };

      // Use AI service for intelligent recommendation generation
      const aiRecommendations = await aiService.generatePersonalizedRecommendations({
        patterns,
        currentContext: context,
        preferences: Object.fromEntries(this.preferences),
        history: Array.from(this.userInteractions.values())
      });

      if (aiRecommendations) {
        recommendations.aiSuggestions = aiRecommendations.suggestions || [];
        recommendations.confidence = aiRecommendations.confidence || 0;
      }

      // Manual pattern-based recommendations as fallback
      recommendations.suggestedActivities = this.generateActivitySuggestions(patterns);
      recommendations.optimalTimes = this.findOptimalActivityTimes(patterns);
      recommendations.moodBasedSuggestions = this.generateMoodBasedSuggestions(patterns, context);

      return recommendations;

    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return {
        suggestedActivities: [],
        optimalTimes: [],
        moodBasedSuggestions: [],
        error: error.message
      };
    }
  }

  generateActivitySuggestions(patterns) {
    const suggestions = [];
    const contentPrefs = patterns.contentPreferences;

    // Prioritize activities with high completion rates and ratings
    Object.entries(contentPrefs.activityTypes).forEach(([activity, frequency]) => {
      const effectiveness = contentPrefs.effectivenessScores[activity] || 0;
      const completionRate = contentPrefs.completionRates[activity] || 0;
      const userRating = contentPrefs.userRatings[activity] || 0;

      const score = (frequency * 0.3) + (completionRate * 0.4) + (effectiveness * 0.2) + (userRating * 0.1);

      suggestions.push({
        activity: activity,
        score: score,
        reason: this.getSuggestionReason(activity, score)
      });
    });

    return suggestions.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  findOptimalActivityTimes(patterns) {
    const timePrefs = patterns.timePreferences;
    const optimalTimes = [];

    Object.entries(timePrefs).forEach(([timeOfDay, activities]) => {
      const totalActivities = Object.values(activities).reduce((sum, count) => sum + count, 0);
      if (totalActivities > 0) {
        optimalTimes.push({
          timeOfDay: timeOfDay,
          activityCount: totalActivities,
          preference: this.mapTimeOfDayToPreference(timeOfDay)
        });
      }
    });

    return optimalTimes.sort((a, b) => b.activityCount - a.activityCount);
  }

  generateMoodBasedSuggestions(patterns, context) {
    const suggestions = [];
    const moodPrefs = patterns.moodPatterns;

    const userMood = context.mood ? this.normalizeMood(context.mood.emotion) : 'neutral';

    if (moodPrefs[userMood]) {
      Object.entries(moodPrefs[userMood]).forEach(([activity, count]) => {
        suggestions.push({
          activity: activity,
          frequency: count,
          moodFit: userMood,
          reason: `${activity} has helped during ${userMood} periods`
        });
      });
    }

    return suggestions.sort((a, b) => b.frequency - a.frequency).slice(0, 2);
  }

  getSuggestionReason(activity, score) {
    if (score > 0.8) return 'Highly effective based on your history';
    if (score > 0.6) return 'Well-suited to your preferences';
    if (score > 0.4) return 'Moderately engaging for you';
    return 'Worth exploring based on your activity patterns';
  }

  mapTimeOfDayToPreference(timeOfDay) {
    const preferences = {
      morning: 'Energizing activities',
      afternoon: 'Productive work',
      evening: 'Relaxing activities',
      night: 'Wind-down activities'
    };
    return preferences[timeOfDay] || 'General activities';
  }

  // Get recent interactions for adaptive learning
  getRecentInteractions(limit = 20) {
    return Array.from(this.userInteractions.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

const behaviorLearningService = new BehaviorLearningService();
export default behaviorLearningService;
