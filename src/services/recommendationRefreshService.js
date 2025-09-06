import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import recommendationEngine from './recommendationEngine';
import behaviorLearningService from './behaviorLearningService';
import recommendationAnalytics from './recommendationAnalytics';

class RecommendationRefreshService {
  constructor() {
    this.refreshIntervals = new Map();
    this.refreshCallbacks = new Map();
    this.refreshHistory = [];
    this.isRefreshing = false;
    this.lastRefreshTime = null;
    this.refreshConfig = {
      minInterval: 5 * 60 * 1000, // 5 minutes minimum
      maxInterval: 60 * 60 * 1000, // 1 hour maximum
      adaptiveRefresh: true,
      engagementThreshold: 0.3,
      stalenessThreshold: 30 * 60 * 1000, // 30 minutes
    };
    
    this.loadRefreshConfig();
  }

  async loadRefreshConfig() {
    try {
      const storedConfig = await AsyncStorage.getItem('recommendation_refresh_config');
      if (storedConfig) {
        this.refreshConfig = { ...this.refreshConfig, ...JSON.parse(storedConfig) };
      }
    } catch (error) {
      console.error('Failed to load refresh config:', error);
    }
  }

  async saveRefreshConfig() {
    try {
      await AsyncStorage.setItem(
        'recommendation_refresh_config',
        JSON.stringify(this.refreshConfig)
      );
    } catch (error) {
      console.error('Failed to save refresh config:', error);
    }
  }

  // Start adaptive refresh for a user
  async startAdaptiveRefresh(userId, options = {}) {
    try {
      // Clear existing interval if any
      this.stopRefresh(userId);

      const refreshInterval = await this.calculateOptimalRefreshInterval(userId);
      
      const intervalId = setInterval(async () => {
        await this.performAdaptiveRefresh(userId, options);
      }, refreshInterval);

      this.refreshIntervals.set(userId, intervalId);

      // Perform initial refresh
      await this.performAdaptiveRefresh(userId, options);

      return { success: true, interval: refreshInterval };
    } catch (error) {
      console.error('Failed to start adaptive refresh:', error);
      return { success: false, error: error.message };
    }
  }

  // Stop refresh for a user
  stopRefresh(userId) {
    const intervalId = this.refreshIntervals.get(userId);
    if (intervalId) {
      clearInterval(intervalId);
      this.refreshIntervals.delete(userId);
    }
  }

  // Calculate optimal refresh interval based on user behavior
  async calculateOptimalRefreshInterval(userId) {
    try {
      // Get user engagement patterns
      const patterns = await behaviorLearningService.learnUserPatterns();
      const analytics = await recommendationAnalytics.analyzeUserPreferences();

      // Base interval
      let interval = this.refreshConfig.minInterval * 2; // 10 minutes default

      // Adjust based on engagement patterns
      if (patterns.engagementPatterns) {
        const avgSessionLength = patterns.engagementPatterns.averageSessionLength || 0;
        const sessionFrequency = Object.values(patterns.engagementPatterns.sessionFrequency || {})
          .reduce((sum, freq) => sum + freq, 0);

        // More active users get more frequent refreshes
        if (avgSessionLength > 10 * 60 * 1000) { // 10+ minute sessions
          interval *= 0.7; // 30% more frequent
        }

        if (sessionFrequency > 5) { // Active multiple days per week
          interval *= 0.8; // 20% more frequent
        }
      }

      // Adjust based on recommendation effectiveness
      const effectiveness = await recommendationAnalytics.calculateOverallAcceptRate();
      if (effectiveness > 0.5) {
        interval *= 0.9; // More frequent if recommendations are effective
      } else if (effectiveness < 0.2) {
        interval *= 1.5; // Less frequent if recommendations are not effective
      }

      // Adjust based on time of day preferences
      if (patterns.timePreferences) {
        const currentHour = new Date().getHours();
        const timeOfDay = this.categorizeTimeOfDay(currentHour);
        const timePrefs = patterns.timePreferences[timeOfDay] || {};
        
        const totalInteractions = Object.values(timePrefs).reduce((sum, count) => sum + count, 0);
        if (totalInteractions > 10) {
          interval *= 0.8; // More frequent during preferred times
        }
      }

      // Ensure interval is within bounds
      interval = Math.max(this.refreshConfig.minInterval, interval);
      interval = Math.min(this.refreshConfig.maxInterval, interval);

      return Math.round(interval);
    } catch (error) {
      console.error('Failed to calculate optimal refresh interval:', error);
      return this.refreshConfig.minInterval * 2;
    }
  }

  categorizeTimeOfDay(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  // Perform adaptive refresh based on context and engagement
  async performAdaptiveRefresh(userId, options = {}) {
    if (this.isRefreshing) return;

    try {
      this.isRefreshing = true;

      // Check if refresh is needed
      const shouldRefresh = await this.shouldPerformRefresh(userId);
      if (!shouldRefresh && !options.force) {
        return { success: true, skipped: true, reason: 'Not needed' };
      }

      // Get current context
      const context = await behaviorLearningService.getCurrentContext();
      
      // Determine what types of recommendations to refresh
      const refreshTypes = await this.determineRefreshTypes(userId, context);

      const refreshResults = {};

      // Refresh content recommendations
      if (refreshTypes.includes('content')) {
        refreshResults.content = await this.refreshContentRecommendations(userId, context);
      }

      // Refresh peer recommendations
      if (refreshTypes.includes('peers')) {
        refreshResults.peers = await this.refreshPeerRecommendations(userId, context);
      }

      // Refresh exercise recommendations
      if (refreshTypes.includes('exercises')) {
        refreshResults.exercises = await this.refreshExerciseRecommendations(userId, context);
      }

      // Refresh activity recommendations
      if (refreshTypes.includes('activities')) {
        refreshResults.activities = await this.refreshActivityRecommendations(userId, context);
      }

      // Track refresh event
      await this.trackRefreshEvent(userId, refreshTypes, refreshResults, context);

      // Update last refresh time
      this.lastRefreshTime = Date.now();

      // Notify callbacks
      await this.notifyRefreshCallbacks(userId, refreshResults);

      return { success: true, results: refreshResults, types: refreshTypes };

    } catch (error) {
      console.error('Failed to perform adaptive refresh:', error);
      return { success: false, error: error.message };
    } finally {
      this.isRefreshing = false;
    }
  }

  // Determine if refresh is needed based on various factors
  async shouldPerformRefresh(userId) {
    try {
      // Check time since last refresh
      if (this.lastRefreshTime) {
        const timeSinceRefresh = Date.now() - this.lastRefreshTime;
        if (timeSinceRefresh < this.refreshConfig.minInterval) {
          return false; // Too soon
        }
      }

      // Check user activity level
      const recentInteractions = await behaviorLearningService.getRecentInteractions(10);
      const recentRecommendationInteractions = recentInteractions.filter(
        interaction => interaction.type.includes('recommendation')
      );

      // If user has been very active with recommendations, refresh more often
      if (recentRecommendationInteractions.length > 5) {
        return true;
      }

      // Check recommendation staleness
      const analytics = recommendationAnalytics.getEngagementTrends();
      const recentEngagement = analytics.last_24h?.acceptRate || 0;
      
      if (recentEngagement < this.refreshConfig.engagementThreshold) {
        return true; // Low engagement, try new recommendations
      }

      // Check context changes
      const currentContext = await behaviorLearningService.getCurrentContext();
      const contextChanged = await this.hasContextChanged(currentContext);
      
      if (contextChanged) {
        return true; // Context changed significantly
      }

      // Default: refresh if enough time has passed
      const timeSinceRefresh = this.lastRefreshTime ? 
        Date.now() - this.lastRefreshTime : 
        this.refreshConfig.stalenessThreshold + 1;

      return timeSinceRefresh > this.refreshConfig.stalenessThreshold;

    } catch (error) {
      console.error('Failed to determine if refresh is needed:', error);
      return true; // Default to refresh on error
    }
  }

  // Determine which types of recommendations to refresh
  async determineRefreshTypes(userId, context) {
    const refreshTypes = [];

    try {
      // Always refresh content recommendations
      refreshTypes.push('content');

      // Refresh peers based on social activity
      const recentSocialInteractions = await behaviorLearningService.getRecentInteractions(20)
        .filter(interaction => interaction.type.includes('social') || interaction.type.includes('peer'));
      
      if (recentSocialInteractions.length < 3 || Math.random() < 0.3) {
        refreshTypes.push('peers');
      }

      // Refresh exercises based on mood and stress levels
      if (context.mood && ['anxious', 'stressed', 'sad'].includes(
        behaviorLearningService.normalizeMood(context.mood.emotion)
      )) {
        refreshTypes.push('exercises');
      }

      // Refresh activities based on time of day and engagement
      const timeOfDay = context.timeOfDay;
      if (['morning', 'afternoon'].includes(timeOfDay)) {
        refreshTypes.push('activities');
      }

      // Ensure at least one type is refreshed
      if (refreshTypes.length === 0) {
        refreshTypes.push('content');
      }

      return refreshTypes;

    } catch (error) {
      console.error('Failed to determine refresh types:', error);
      return ['content']; // Default fallback
    }
  }

  // Refresh content recommendations
  async refreshContentRecommendations(userId, context) {
    try {
      const contentRecs = await behaviorLearningService.generateContentRecommendations({
        context,
        refreshMode: true,
        diversityBoost: 0.2 // Increase diversity for refresh
      });

      return {
        success: true,
        count: contentRecs?.personalizedContent?.length || 0,
        data: contentRecs
      };
    } catch (error) {
      console.error('Failed to refresh content recommendations:', error);
      return { success: false, error: error.message };
    }
  }

  // Refresh peer recommendations
  async refreshPeerRecommendations(userId, context) {
    try {
      const peerRecs = await recommendationEngine.generatePeerRecommendations(userId, {
        context,
        refreshMode: true,
        includeNewMatches: true
      });

      return {
        success: true,
        count: (peerRecs?.supportPartners?.length || 0) + (peerRecs?.activityPartners?.length || 0),
        data: peerRecs
      };
    } catch (error) {
      console.error('Failed to refresh peer recommendations:', error);
      return { success: false, error: error.message };
    }
  }

  // Refresh exercise recommendations
  async refreshExerciseRecommendations(userId, context) {
    try {
      const exerciseRecs = await recommendationEngine.generateWellnessTaskRecommendations(userId, {
        ...context,
        type: 'exercises',
        refreshMode: true
      });

      return {
        success: true,
        count: (exerciseRecs?.immediateTasks?.length || 0) + (exerciseRecs?.preventiveTasks?.length || 0),
        data: exerciseRecs
      };
    } catch (error) {
      console.error('Failed to refresh exercise recommendations:', error);
      return { success: false, error: error.message };
    }
  }

  // Refresh activity recommendations
  async refreshActivityRecommendations(userId, context) {
    try {
      const activityRecs = await recommendationEngine.generateContextualRecommendations(userId, {
        ...context,
        type: 'activities',
        refreshMode: true
      });

      return {
        success: true,
        count: activityRecs?.recommendations?.proactive?.length || 0,
        data: activityRecs
      };
    } catch (error) {
      console.error('Failed to refresh activity recommendations:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if context has changed significantly
  async hasContextChanged(currentContext) {
    try {
      const lastContext = await AsyncStorage.getItem('last_refresh_context');
      if (!lastContext) return true;

      const parsedLastContext = JSON.parse(lastContext);

      // Check mood change
      if (currentContext.mood && parsedLastContext.mood) {
        const currentMoodNorm = behaviorLearningService.normalizeMood(currentContext.mood.emotion);
        const lastMoodNorm = behaviorLearningService.normalizeMood(parsedLastContext.mood.emotion);
        
        if (currentMoodNorm !== lastMoodNorm) {
          return true;
        }
      }

      // Check time of day change
      if (currentContext.timeOfDay !== parsedLastContext.timeOfDay) {
        return true;
      }

      // Check day change
      if (currentContext.dayOfWeek !== parsedLastContext.dayOfWeek) {
        return true;
      }

      return false;

    } catch (error) {
      console.error('Failed to check context change:', error);
      return true; // Default to changed on error
    }
  }

  // Track refresh event for analytics
  async trackRefreshEvent(userId, refreshTypes, results, context) {
    try {
      const refreshEvent = {
        userId,
        timestamp: Date.now(),
        refreshTypes,
        results,
        context,
        totalRecommendations: Object.values(results).reduce(
          (total, result) => total + (result.count || 0), 0
        )
      };

      this.refreshHistory.push(refreshEvent);

      // Keep only last 100 refresh events
      if (this.refreshHistory.length > 100) {
        this.refreshHistory = this.refreshHistory.slice(-100);
      }

      // Track in behavior learning service
      await behaviorLearningService.trackInteraction(
        'recommendation_refresh',
        {
          refreshTypes,
          totalRecommendations: refreshEvent.totalRecommendations,
          context
        }
      );

      // Store last context for comparison
      await AsyncStorage.setItem('last_refresh_context', JSON.stringify(context));

    } catch (error) {
      console.error('Failed to track refresh event:', error);
    }
  }

  // Register callback for refresh notifications
  registerRefreshCallback(userId, callback) {
    if (!this.refreshCallbacks.has(userId)) {
      this.refreshCallbacks.set(userId, []);
    }
    this.refreshCallbacks.get(userId).push(callback);
  }

  // Unregister refresh callback
  unregisterRefreshCallback(userId, callback) {
    const callbacks = this.refreshCallbacks.get(userId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Notify all registered callbacks
  async notifyRefreshCallbacks(userId, refreshResults) {
    const callbacks = this.refreshCallbacks.get(userId);
    if (callbacks && callbacks.length > 0) {
      for (const callback of callbacks) {
        try {
          await callback(refreshResults);
        } catch (error) {
          console.error('Refresh callback error:', error);
        }
      }
    }
  }

  // Manual refresh trigger
  async triggerManualRefresh(userId, options = {}) {
    return await this.performAdaptiveRefresh(userId, { ...options, force: true });
  }

  // Get refresh statistics
  getRefreshStatistics(userId) {
    const userRefreshEvents = this.refreshHistory.filter(event => event.userId === userId);
    
    if (userRefreshEvents.length === 0) {
      return {
        totalRefreshes: 0,
        averageRecommendations: 0,
        lastRefresh: null,
        refreshFrequency: 0
      };
    }

    const totalRecommendations = userRefreshEvents.reduce(
      (sum, event) => sum + event.totalRecommendations, 0
    );

    const timeSpan = userRefreshEvents.length > 1 ? 
      userRefreshEvents[userRefreshEvents.length - 1].timestamp - userRefreshEvents[0].timestamp : 0;

    return {
      totalRefreshes: userRefreshEvents.length,
      averageRecommendations: totalRecommendations / userRefreshEvents.length,
      lastRefresh: userRefreshEvents[userRefreshEvents.length - 1].timestamp,
      refreshFrequency: timeSpan > 0 ? userRefreshEvents.length / (timeSpan / (24 * 60 * 60 * 1000)) : 0
    };
  }

  // Update refresh configuration
  async updateRefreshConfig(newConfig) {
    this.refreshConfig = { ...this.refreshConfig, ...newConfig };
    await this.saveRefreshConfig();
  }

  // Cleanup resources
  cleanup() {
    // Clear all intervals
    for (const [userId, intervalId] of this.refreshIntervals) {
      clearInterval(intervalId);
    }
    this.refreshIntervals.clear();
    this.refreshCallbacks.clear();
  }
}

const recommendationRefreshService = new RecommendationRefreshService();
export default recommendationRefreshService;