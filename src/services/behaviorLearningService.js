import AsyncStorage from '@react-native-async-storage/async-storage';
import aiService from './aiService';
import { supabase } from '../config/supabase';
import { apiClient } from './apiClient';
import userProfileService from './userProfileService';

class BehaviorLearningService {
  constructor() {
    this.userInteractions = new Map();
    this.preferences = new Map();
    this.contextHistory = [];
    this.userBehaviorProfile = null;
    this.realTimeAdaptations = new Map();
    this.loadUserData();
  }

  async loadUserData() {
    try {
      // Load from both local storage and database
      await Promise.all([
        this.loadLocalData(),
        this.loadDatabaseData()
      ]);
      
      // Initialize user behavior profile
      await this.initializeUserBehaviorProfile();
    } catch (error) {
      console.error('Failed to load user behavior data:', error);
    }
  }

  async loadLocalData() {
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
      console.error('Failed to load local behavior data:', error);
    }
  }

  async loadDatabaseData() {
    try {
      const authResult = await supabase.auth.getUser();
      const user = authResult?.data?.user;
      if (!user) return;

      // Ensure user profile exists before accessing behavior data
      const profileResult = await userProfileService.ensureUserProfile(user.id);
      if (!profileResult.success) {
        console.warn('Failed to ensure user profile for behavior learning:', profileResult.error);
        return;
      }

      // Load user behavior data from database
      const { data: behaviorData, error } = await supabase
        .from('user_behavior_data')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        // Check if table doesn't exist (404) or other database issues
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.warn('user_behavior_data table does not exist yet. Skipping behavior data loading.');
          return;
        }
        console.warn('Failed to load behavior data from database:', error);
        return;
      }

      if (behaviorData && behaviorData.length > 0) {
        // Merge database data with local data
        behaviorData.forEach(entry => {
          const key = `${entry.interaction_type}_${entry.created_at}`;
          this.userInteractions.set(key, {
            type: entry.interaction_type,
            data: entry.interaction_data,
            timestamp: new Date(entry.created_at).getTime(),
            context: entry.context_data
          });
        });
      }
    } catch (error) {
      console.error('Failed to load database behavior data:', error);
    }
  }

  async initializeUserBehaviorProfile() {
    try {
      const authResult = await supabase.auth.getUser();
      const user = authResult?.data?.user;
      if (!user) return;

      // Ensure user profile exists first
      const profileResult = await userProfileService.ensureUserProfile(user.id);
      if (!profileResult.success) {
        console.warn('Failed to ensure user profile for behavior learning:', profileResult.error);
        return;
      }

      // Get or create user behavior profile
      const { data: profile, error } = await supabase
        .from('user_behavior_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        // Check if table doesn't exist
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          console.warn('user_behavior_profiles table does not exist yet. Skipping behavior profile initialization.');
          return;
        }
        console.warn('Failed to load user behavior profile:', error);
        return;
      }

      if (profile) {
        this.userBehaviorProfile = profile;
      } else {
        // Create new behavior profile
        const newProfile = {
          user_id: user.id,
          learning_preferences: {},
          interaction_patterns: {},
          content_preferences: {},
          peer_preferences: {},
          adaptation_settings: {
            learning_rate: 0.1,
            adaptation_threshold: 5,
            context_sensitivity: 0.7
          },
          created_at: new Date().toISOString()
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('user_behavior_profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          // Check if table doesn't exist
          if (createError.message.includes('relation') || createError.message.includes('does not exist')) {
            console.warn('user_behavior_profiles table does not exist yet. Skipping behavior profile creation.');
            return;
          }
          console.warn('Failed to create user behavior profile:', createError);
        } else {
          this.userBehaviorProfile = createdProfile;
        }
      }
    } catch (error) {
      console.error('Failed to initialize user behavior profile:', error);
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

  // Enhanced user interaction tracking with database persistence
  async trackInteraction(interactionType, data, options = {}) {
    try {
      const timestamp = Date.now();
      const context = await this.getCurrentContext();
      const sessionId = await this.getCurrentSessionId();

      const interaction = {
        type: interactionType,
        data,
        timestamp,
        context,
        sessionId,
        effectivenessScore: data.effectivenessScore || null,
        userRating: data.userRating || null
      };

      // Store interaction locally
      const key = `${interactionType}_${timestamp}`;
      this.userInteractions.set(key, interaction);

      // Store in database for persistent learning
      await this.persistInteractionToDatabase(interaction);

      // Update preferences based on interaction
      await this.updatePreferences(interactionType, data, context);

      // Apply real-time adaptations
      await this.applyRealTimeAdaptations(interactionType, data, context);

      // Save to local storage
      await this.saveUserData();

      // Trigger learning if enough data collected
      if (this.userInteractions.size % 10 === 0) {
        await this.triggerLearningUpdate();
      }

      return interaction;
    } catch (error) {
      console.error('Failed to track interaction:', error);
      return null;
    }
  }

  async persistInteractionToDatabase(interaction) {
    try {
      const authResult = await supabase.auth.getUser();
      const user = authResult?.data?.user;
      if (!user) return;

      // Ensure user profile exists before persisting interaction data
      const profileResult = await userProfileService.ensureUserProfile(user.id);
      if (!profileResult.success) {
        console.warn('Failed to ensure user profile for behavior data persistence:', profileResult.error);
        return;
      }

      const { error } = await supabase
        .from('user_behavior_data')
        .insert({
          user_id: user.id,
          interaction_type: interaction.type,
          interaction_data: interaction.data,
          context_data: interaction.context,
          effectiveness_score: interaction.effectivenessScore,
          user_rating: interaction.userRating,
          session_id: interaction.sessionId
        });

      if (error) {
        // Check if table doesn't exist
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          console.warn('user_behavior_data table does not exist yet. Skipping interaction persistence.');
          return;
        }
        console.warn('Failed to persist interaction to database:', error);
      }
    } catch (error) {
      console.error('Database persistence error:', error);
    }
  }

  async getCurrentSessionId() {
    try {
      let sessionId = await AsyncStorage.getItem('current_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('current_session_id', sessionId);
      }
      return sessionId;
    } catch (error) {
      return `session_${Date.now()}`;
    }
  }

  async applyRealTimeAdaptations(interactionType, data, context) {
    try {
      // Generate contextual adaptations based on current interaction
      const adaptationKey = this.generateAdaptationKey(context);
      const existingAdaptation = this.realTimeAdaptations.get(adaptationKey);

      const newAdaptation = {
        interactionType,
        context,
        data,
        timestamp: Date.now(),
        adaptationScore: this.calculateAdaptationScore(data, context),
        recommendations: await this.generateContextualAdaptations(interactionType, data, context)
      };

      // Merge with existing adaptation if present
      if (existingAdaptation) {
        newAdaptation.adaptationScore = (existingAdaptation.adaptationScore + newAdaptation.adaptationScore) / 2;
        newAdaptation.recommendations = this.mergeRecommendations(
          existingAdaptation.recommendations,
          newAdaptation.recommendations
        );
      }

      this.realTimeAdaptations.set(adaptationKey, newAdaptation);

      // Persist to database cache
      await this.persistAdaptationCache(adaptationKey, newAdaptation);
    } catch (error) {
      console.error('Failed to apply real-time adaptations:', error);
    }
  }

  generateAdaptationKey(context) {
    return `${context.timeOfDay}_${context.dayOfWeek}_${context.mood?.emotion || 'neutral'}`;
  }

  calculateAdaptationScore(data, context) {
    let score = 0.5; // Base score

    // Adjust based on user rating
    if (data.userRating) {
      score = (score + (data.userRating / 5)) / 2;
    }

    // Adjust based on completion
    if (data.completed) {
      score += 0.2;
    }

    // Adjust based on effectiveness
    if (data.effectivenessScore) {
      score = (score + data.effectivenessScore) / 2;
    }

    // Context-based adjustments
    if (context.mood && context.mood.confidence > 0.7) {
      score += 0.1; // Higher confidence in mood detection
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  async generateContextualAdaptations(interactionType, data, context) {
    try {
      // Use AI service for intelligent adaptations
      const aiAdaptations = await aiService.generateContextualAdaptations({
        interactionType,
        data,
        context,
        userHistory: Array.from(this.userInteractions.values()).slice(-20)
      });

      if (aiAdaptations) {
        return aiAdaptations;
      }

      // Fallback to rule-based adaptations
      return this.generateRuleBasedAdaptations(interactionType, data, context);
    } catch (error) {
      console.error('Failed to generate contextual adaptations:', error);
      return this.generateRuleBasedAdaptations(interactionType, data, context);
    }
  }

  generateRuleBasedAdaptations(interactionType, data, context) {
    const adaptations = [];

    // Time-based adaptations
    if (context.timeOfDay === 'morning' && interactionType === 'mood_log') {
      adaptations.push({
        type: 'timing_suggestion',
        message: 'Morning mood logging detected - consider adding energizing activities',
        confidence: 0.7
      });
    }

    // Mood-based adaptations
    if (context.mood && context.mood.emotion === 'anxious') {
      adaptations.push({
        type: 'mood_intervention',
        message: 'Anxiety detected - prioritizing calming exercises',
        confidence: 0.8
      });
    }

    // Completion-based adaptations
    if (data.completed && data.userRating >= 4) {
      adaptations.push({
        type: 'positive_reinforcement',
        message: 'Great job! Similar activities will be prioritized',
        confidence: 0.9
      });
    }

    return adaptations;
  }

  mergeRecommendations(existing, newRecs) {
    const merged = [...existing];
    
    newRecs.forEach(newRec => {
      const existingIndex = merged.findIndex(rec => rec.type === newRec.type);
      if (existingIndex >= 0) {
        // Update existing recommendation with higher confidence
        if (newRec.confidence > merged[existingIndex].confidence) {
          merged[existingIndex] = newRec;
        }
      } else {
        merged.push(newRec);
      }
    });

    return merged.sort((a, b) => b.confidence - a.confidence);
  }

  async persistAdaptationCache(adaptationKey, adaptation) {
    try {
      const authResult = await supabase.auth.getUser();
      const user = authResult?.data?.user;
      if (!user) return;

      const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours

      const { error } = await supabase
        .from('adaptation_cache')
        .upsert({
          user_id: user.id,
          context_key: adaptationKey,
          adaptation_data: adaptation,
          confidence_score: adaptation.adaptationScore,
          expires_at: expiresAt.toISOString()
        });

      if (error) {
        console.warn('Failed to persist adaptation cache:', error);
      }
    } catch (error) {
      console.error('Adaptation cache persistence error:', error);
    }
  }

  async triggerLearningUpdate() {
    try {
      // Update user behavior profile with latest patterns
      const patterns = await this.learnUserPatterns();
      await this.updateBehaviorProfile(patterns);

      // Clean up old adaptations
      await this.cleanupOldAdaptations();
    } catch (error) {
      console.error('Failed to trigger learning update:', error);
    }
  }

  async updateBehaviorProfile(patterns) {
    try {
      const authResult = await supabase.auth.getUser();
      const user = authResult?.data?.user;
      if (!user || !this.userBehaviorProfile) return;

      const updatedProfile = {
        ...this.userBehaviorProfile,
        learning_preferences: patterns.contentPreferences,
        interaction_patterns: patterns.engagementPatterns,
        content_preferences: patterns.timePreferences,
        peer_preferences: patterns.moodPatterns,
        last_updated: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_behavior_profiles')
        .update(updatedProfile)
        .eq('user_id', user.id);

      if (error) {
        // Check if table doesn't exist
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          console.warn('user_behavior_profiles table does not exist yet. Skipping profile update.');
          return;
        }
        console.warn('Failed to update user behavior profile:', error);
      } else {
        this.userBehaviorProfile = updatedProfile;
      }
    } catch (error) {
      console.error('Failed to update behavior profile:', error);
    }
  }

  async cleanupOldAdaptations() {
    try {
      // Remove adaptations older than 24 hours
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
      
      for (const [key, adaptation] of this.realTimeAdaptations) {
        if (adaptation.timestamp < cutoffTime) {
          this.realTimeAdaptations.delete(key);
        }
      }

      // Clean up database cache
      const authResult = await supabase.auth.getUser();
      const user = authResult?.data?.user;
      if (user) {
        await supabase
          .from('adaptation_cache')
          .delete()
          .eq('user_id', user.id)
          .lt('expires_at', new Date().toISOString());
      }
    } catch (error) {
      console.error('Failed to cleanup old adaptations:', error);
    }
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

  // Enhanced content recommendation algorithm
  async generateContentRecommendations(options = {}) {
    try {
      const patterns = await this.learnUserPatterns();
      const context = await this.getCurrentContext();
      const contentHistory = await this.getContentInteractionHistory();

      const recommendations = {
        personalizedContent: [],
        trendingContent: [],
        contextualContent: [],
        diversityContent: [],
        confidence: 0
      };

      // Use AI service for intelligent content recommendations
      const aiContentRecs = await aiService.generateContentRecommendations({
        patterns,
        context,
        contentHistory,
        preferences: Object.fromEntries(this.preferences),
        options
      });

      if (aiContentRecs) {
        recommendations.personalizedContent = aiContentRecs.personalized || [];
        recommendations.contextualContent = aiContentRecs.contextual || [];
        recommendations.confidence = aiContentRecs.confidence || 0;
      }

      // Generate algorithm-based recommendations
      const algorithmRecs = await this.generateAlgorithmicContentRecommendations(patterns, context, contentHistory);
      
      // Merge AI and algorithmic recommendations
      recommendations.personalizedContent = this.mergeContentRecommendations(
        recommendations.personalizedContent,
        algorithmRecs.personalized
      );

      recommendations.trendingContent = algorithmRecs.trending;
      recommendations.diversityContent = algorithmRecs.diversity;

      // Apply real-time adaptations
      recommendations = await this.applyContentAdaptations(recommendations, context);

      return recommendations;
    } catch (error) {
      console.error('Failed to generate content recommendations:', error);
      return this.getFallbackContentRecommendations();
    }
  }

  // Enhanced peer recommendation algorithm
  async generatePeerRecommendations(options = {}) {
    try {
      const patterns = await this.learnUserPatterns();
      const context = await this.getCurrentContext();
      const peerHistory = await this.getPeerInteractionHistory();
      const userProfile = await this.getUserProfile();

      let recommendations = {
        supportPartners: [],
        activityPartners: [],
        mentorConnections: [],
        groupSuggestions: [],
        confidence: 0
      };

      // Use AI service for intelligent peer matching
      const aiPeerRecs = await aiService.generatePeerRecommendations({
        userProfile,
        patterns,
        context,
        peerHistory,
        options
      });

      if (aiPeerRecs) {
        recommendations.supportPartners = aiPeerRecs.supportPartners || [];
        recommendations.activityPartners = aiPeerRecs.activityPartners || [];
        recommendations.confidence = aiPeerRecs.confidence || 0;
      }

      // Generate compatibility-based recommendations
      const compatibilityRecs = await this.generateCompatibilityBasedPeerRecommendations(
        userProfile, patterns, context
      );

      // Merge recommendations
      recommendations.supportPartners = this.mergePeerRecommendations(
        recommendations.supportPartners,
        compatibilityRecs.supportPartners
      );

      recommendations.mentorConnections = compatibilityRecs.mentorConnections;
      recommendations.groupSuggestions = compatibilityRecs.groupSuggestions;

      // Apply behavioral filtering
      recommendations = await this.applyBehavioralPeerFiltering(recommendations, patterns);

      return recommendations;
    } catch (error) {
      console.error('Failed to generate peer recommendations:', error);
      return this.getFallbackPeerRecommendations();
    }
  }

  // Real-time recommendation adaptation based on mood and context
  async adaptRecommendationsRealTime(baseRecommendations, currentContext = null) {
    try {
      const context = currentContext || await this.getCurrentContext();
      const adaptationKey = this.generateAdaptationKey(context);
      const cachedAdaptation = this.realTimeAdaptations.get(adaptationKey);

      let adaptedRecommendations = { ...baseRecommendations };

      // Apply cached adaptations if available
      if (cachedAdaptation && cachedAdaptation.recommendations) {
        adaptedRecommendations = this.applyAdaptationRules(
          adaptedRecommendations,
          cachedAdaptation.recommendations
        );
      }

      // Apply mood-based adaptations
      if (context.mood) {
        adaptedRecommendations = await this.applyMoodBasedAdaptations(
          adaptedRecommendations,
          context.mood
        );
      }

      // Apply time-based adaptations
      adaptedRecommendations = this.applyTimeBasedAdaptations(
        adaptedRecommendations,
        context
      );

      // Apply stress/anxiety level adaptations
      if (context.anxietyLevel || context.stressLevel) {
        adaptedRecommendations = this.applyStressBasedAdaptations(
          adaptedRecommendations,
          context
        );
      }

      // Update confidence scores based on adaptations
      adaptedRecommendations.confidence = this.calculateAdaptedConfidence(
        baseRecommendations.confidence || 0.5,
        context
      );

      return adaptedRecommendations;
    } catch (error) {
      console.error('Failed to adapt recommendations in real-time:', error);
      return baseRecommendations;
    }
  }

  async generateAlgorithmicContentRecommendations(patterns, context, contentHistory) {
    const recommendations = {
      personalized: [],
      trending: [],
      diversity: []
    };

    try {
      // Personalized recommendations based on interaction patterns
      const personalizedContent = this.generatePersonalizedContent(patterns, contentHistory);
      recommendations.personalized = personalizedContent;

      // Trending content based on community engagement
      const trendingContent = await this.getTrendingContent(context);
      recommendations.trending = trendingContent;

      // Diversity recommendations to prevent filter bubbles
      const diversityContent = this.generateDiversityContent(patterns, contentHistory);
      recommendations.diversity = diversityContent;

      return recommendations;
    } catch (error) {
      console.error('Failed to generate algorithmic content recommendations:', error);
      return recommendations;
    }
  }

  generatePersonalizedContent(patterns, contentHistory) {
    const personalizedContent = [];

    try {
      // Analyze content preferences from patterns
      const contentPrefs = patterns.contentPreferences || {};
      const engagementPatterns = patterns.engagementPatterns || {};

      // Score content types based on user engagement
      const contentScores = {};
      Object.entries(contentPrefs.activityTypes || {}).forEach(([contentType, frequency]) => {
        const completionRate = contentPrefs.completionRates?.[contentType] || 0;
        const effectiveness = contentPrefs.effectivenessScores?.[contentType] || 0;
        const userRating = contentPrefs.userRatings?.[contentType] || 0;

        contentScores[contentType] = {
          score: (frequency * 0.3) + (completionRate * 0.4) + (effectiveness * 0.2) + (userRating * 0.1),
          frequency,
          completionRate,
          effectiveness,
          userRating
        };
      });

      // Generate recommendations based on scores
      Object.entries(contentScores)
        .sort(([,a], [,b]) => b.score - a.score)
        .slice(0, 5)
        .forEach(([contentType, data]) => {
          personalizedContent.push({
            type: contentType,
            score: data.score,
            reason: this.getPersonalizationReason(data),
            priority: data.score > 0.7 ? 'high' : data.score > 0.4 ? 'medium' : 'low'
          });
        });

      return personalizedContent;
    } catch (error) {
      console.error('Failed to generate personalized content:', error);
      return [];
    }
  }

  getPersonalizationReason(data) {
    if (data.completionRate > 0.8) return 'High completion rate indicates strong engagement';
    if (data.userRating > 4) return 'Highly rated by you in the past';
    if (data.effectiveness > 0.7) return 'Proven effective for your wellness goals';
    if (data.frequency > 10) return 'Frequently used activity';
    return 'Based on your activity patterns';
  }

  async getTrendingContent(context) {
    try {
      // Get trending content from database
      const { data: trendingData, error } = await supabase
        .from('content_interactions')
        .select('content_type, content_id, COUNT(*) as interaction_count')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .group('content_type, content_id')
        .order('interaction_count', { ascending: false })
        .limit(10);

      if (error) {
        console.warn('Failed to get trending content:', error);
        return [];
      }

      return (trendingData || []).map(item => ({
        type: item.content_type,
        id: item.content_id,
        trendingScore: item.interaction_count,
        reason: 'Popular in the community this week'
      }));
    } catch (error) {
      console.error('Failed to get trending content:', error);
      return [];
    }
  }

  generateDiversityContent(patterns, contentHistory) {
    const diversityContent = [];

    try {
      // Identify content types user hasn't tried recently
      const recentContentTypes = new Set();
      contentHistory.slice(-20).forEach(interaction => {
        recentContentTypes.add(interaction.content_type);
      });

      // Suggest diverse content types
      const allContentTypes = [
        'breathing_exercise', 'meditation', 'journaling', 'social_activity',
        'physical_exercise', 'creative_activity', 'learning', 'mindfulness'
      ];

      const unexploredTypes = allContentTypes.filter(type => !recentContentTypes.has(type));

      unexploredTypes.slice(0, 3).forEach(contentType => {
        diversityContent.push({
          type: contentType,
          reason: 'Explore new wellness activities',
          diversityScore: 1.0,
          priority: 'medium'
        });
      });

      return diversityContent;
    } catch (error) {
      console.error('Failed to generate diversity content:', error);
      return [];
    }
  }

  async generateCompatibilityBasedPeerRecommendations(userProfile, patterns, context) {
    const recommendations = {
      supportPartners: [],
      mentorConnections: [],
      groupSuggestions: []
    };

    try {
      // Get potential peers from database
      const { data: potentialPeers, error } = await supabase
        .from('users')
        .select('id, display_name, mental_health_interests, shared_experiences, preferences')
        .neq('id', userProfile.id)
        .eq('is_active', true)
        .limit(50);

      if (error || !potentialPeers) {
        console.warn('Failed to get potential peers:', error);
        return recommendations;
      }

      // Calculate compatibility scores
      const compatibilityScores = potentialPeers.map(peer => ({
        ...peer,
        compatibilityScore: this.calculatePeerCompatibility(userProfile, peer, patterns)
      }));

      // Sort by compatibility and categorize
      compatibilityScores.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

      // Support partners (high compatibility, similar experiences)
      recommendations.supportPartners = compatibilityScores
        .filter(peer => peer.compatibilityScore > 0.7)
        .slice(0, 5)
        .map(peer => ({
          ...peer,
          matchReason: 'High compatibility based on shared experiences and interests'
        }));

      // Mentor connections (complementary skills/experience)
      recommendations.mentorConnections = compatibilityScores
        .filter(peer => peer.compatibilityScore > 0.5 && peer.compatibilityScore <= 0.7)
        .slice(0, 3)
        .map(peer => ({
          ...peer,
          matchReason: 'Complementary experiences for mutual learning'
        }));

      return recommendations;
    } catch (error) {
      console.error('Failed to generate compatibility-based peer recommendations:', error);
      return recommendations;
    }
  }

  calculatePeerCompatibility(userProfile, peer, patterns) {
    let compatibilityScore = 0;

    try {
      // Interest similarity (30% weight)
      const userInterests = new Set(userProfile.mental_health_interests || []);
      const peerInterests = new Set(peer.mental_health_interests || []);
      const commonInterests = new Set([...userInterests].filter(x => peerInterests.has(x)));
      const interestSimilarity = commonInterests.size / Math.max(userInterests.size, peerInterests.size, 1);
      compatibilityScore += interestSimilarity * 0.3;

      // Experience similarity (25% weight)
      const userExperiences = new Set(userProfile.shared_experiences || []);
      const peerExperiences = new Set(peer.shared_experiences || []);
      const commonExperiences = new Set([...userExperiences].filter(x => peerExperiences.has(x)));
      const experienceSimilarity = commonExperiences.size / Math.max(userExperiences.size, peerExperiences.size, 1);
      compatibilityScore += experienceSimilarity * 0.25;

      // Communication style compatibility (20% weight)
      const userCommStyle = userProfile.preferred_communication_style;
      const peerCommStyle = peer.preferred_communication_style;
      const commCompatibility = userCommStyle === peerCommStyle ? 1.0 : 0.5;
      compatibilityScore += commCompatibility * 0.2;

      // Activity pattern similarity (15% weight)
      const activitySimilarity = this.calculateActivityPatternSimilarity(patterns, peer);
      compatibilityScore += activitySimilarity * 0.15;

      // Age range compatibility (10% weight)
      const ageCompatibility = this.calculateAgeCompatibility(userProfile.age_range, peer.age_range);
      compatibilityScore += ageCompatibility * 0.1;

      return Math.min(1.0, Math.max(0.0, compatibilityScore));
    } catch (error) {
      console.error('Failed to calculate peer compatibility:', error);
      return 0;
    }
  }

  calculateActivityPatternSimilarity(userPatterns, peer) {
    // Simplified activity pattern similarity
    // In a full implementation, this would compare detailed activity patterns
    return 0.5; // Placeholder
  }

  calculateAgeCompatibility(userAgeRange, peerAgeRange) {
    if (!userAgeRange || !peerAgeRange) return 0.5;
    return userAgeRange === peerAgeRange ? 1.0 : 0.3;
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
        contextAwareTips: [],
        contentRecommendations: [],
        peerRecommendations: []
      };

      // Generate content recommendations
      const contentRecs = await this.generateContentRecommendations(options);
      recommendations.contentRecommendations = contentRecs;

      // Generate peer recommendations
      const peerRecs = await this.generatePeerRecommendations(options);
      recommendations.peerRecommendations = peerRecs;

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

      // Apply real-time adaptations
      const adaptedRecommendations = await this.adaptRecommendationsRealTime(recommendations, context);

      return adaptedRecommendations;

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

  // Helper methods for content and peer recommendations

  async getContentInteractionHistory() {
    try {
      const authResult = await supabase.auth.getUser();
      const user = authResult?.data?.user;
      if (!user) return [];

      const { data: contentHistory, error } = await supabase
        .from('content_interactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('Failed to get content interaction history:', error);
        return [];
      }

      return contentHistory || [];
    } catch (error) {
      console.error('Failed to get content interaction history:', error);
      return [];
    }
  }

  async getPeerInteractionHistory() {
    try {
      const authResult = await supabase.auth.getUser();
      const user = authResult?.data?.user;
      if (!user) return [];

      const { data: peerHistory, error } = await supabase
        .from('peer_interactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('Failed to get peer interaction history:', error);
        return [];
      }

      return peerHistory || [];
    } catch (error) {
      console.error('Failed to get peer interaction history:', error);
      return [];
    }
  }

  async getUserProfile() {
    try {
      const authResult = await supabase.auth.getUser();
      const user = authResult?.data?.user;
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn('Failed to get user profile:', error);
        return null;
      }

      return profile;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  mergeContentRecommendations(aiRecs, algorithmRecs) {
    const merged = [...(aiRecs || [])];
    
    (algorithmRecs || []).forEach(algRec => {
      const existingIndex = merged.findIndex(rec => rec.type === algRec.type);
      if (existingIndex >= 0) {
        // Combine scores if same type
        merged[existingIndex].score = (merged[existingIndex].score + algRec.score) / 2;
      } else {
        merged.push(algRec);
      }
    });

    return merged.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  mergePeerRecommendations(aiRecs, algorithmRecs) {
    const merged = [...(aiRecs || [])];
    
    (algorithmRecs || []).forEach(algRec => {
      const existingIndex = merged.findIndex(rec => rec.id === algRec.id);
      if (existingIndex === -1) {
        merged.push(algRec);
      }
    });

    return merged.sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0));
  }

  async applyContentAdaptations(recommendations, context) {
    try {
      // Apply mood-based content filtering
      if (context.mood) {
        recommendations = this.filterContentByMood(recommendations, context.mood);
      }

      // Apply time-based content prioritization
      recommendations = this.prioritizeContentByTime(recommendations, context);

      // Apply stress/anxiety level adaptations
      if (context.anxietyLevel || context.stressLevel) {
        recommendations = this.adaptContentForStress(recommendations, context);
      }

      return recommendations;
    } catch (error) {
      console.error('Failed to apply content adaptations:', error);
      return recommendations;
    }
  }

  filterContentByMood(recommendations, mood) {
    const moodBasedPriorities = {
      'anxious': ['breathing_exercise', 'meditation', 'mindfulness'],
      'sad': ['social_activity', 'creative_activity', 'journaling'],
      'stressed': ['physical_exercise', 'breathing_exercise', 'meditation'],
      'happy': ['social_activity', 'creative_activity', 'learning'],
      'neutral': ['journaling', 'mindfulness', 'learning']
    };

    const moodCategory = this.normalizeMood(mood.emotion);
    const priorityTypes = moodBasedPriorities[moodCategory] || [];

    // Boost priority for mood-appropriate content
    recommendations.personalizedContent = recommendations.personalizedContent.map(content => {
      if (priorityTypes.includes(content.type)) {
        return {
          ...content,
          score: Math.min(1.0, (content.score || 0.5) + 0.2),
          moodBoost: true,
          reason: `${content.reason} (mood-optimized)`
        };
      }
      return content;
    });

    return recommendations;
  }

  prioritizeContentByTime(recommendations, context) {
    const timeBasedPriorities = {
      'morning': ['physical_exercise', 'journaling', 'learning'],
      'afternoon': ['social_activity', 'creative_activity', 'learning'],
      'evening': ['meditation', 'mindfulness', 'journaling'],
      'night': ['breathing_exercise', 'meditation', 'mindfulness']
    };

    const priorityTypes = timeBasedPriorities[context.timeOfDay] || [];

    recommendations.personalizedContent = recommendations.personalizedContent.map(content => {
      if (priorityTypes.includes(content.type)) {
        return {
          ...content,
          score: Math.min(1.0, (content.score || 0.5) + 0.1),
          timeOptimized: true
        };
      }
      return content;
    });

    return recommendations;
  }

  adaptContentForStress(recommendations, context) {
    const stressLevel = Math.max(context.anxietyLevel || 0, context.stressLevel || 0);
    
    if (stressLevel >= 7) {
      // High stress - prioritize immediate relief
      const immediateReliefTypes = ['breathing_exercise', 'meditation', 'mindfulness'];
      
      recommendations.personalizedContent = recommendations.personalizedContent.filter(content =>
        immediateReliefTypes.includes(content.type)
      );

      recommendations.personalizedContent.forEach(content => {
        content.priority = 'urgent';
        content.reason = 'Immediate stress relief recommended';
      });
    }

    return recommendations;
  }

  async applyBehavioralPeerFiltering(recommendations, patterns) {
    try {
      // Filter peers based on behavioral compatibility
      const engagementPatterns = patterns.engagementPatterns || {};
      const userActivityLevel = this.categorizeActivityLevel(engagementPatterns);

      // Filter support partners by activity level compatibility
      recommendations.supportPartners = recommendations.supportPartners.filter(peer => {
        const peerActivityLevel = this.estimatePeerActivityLevel(peer);
        return this.areActivityLevelsCompatible(userActivityLevel, peerActivityLevel);
      });

      return recommendations;
    } catch (error) {
      console.error('Failed to apply behavioral peer filtering:', error);
      return recommendations;
    }
  }

  categorizeActivityLevel(engagementPatterns) {
    const avgSessionLength = engagementPatterns.averageSessionLength || 0;
    const sessionFrequency = Object.values(engagementPatterns.sessionFrequency || {}).reduce((a, b) => a + b, 0);

    if (avgSessionLength > 30 && sessionFrequency > 5) return 'high';
    if (avgSessionLength > 15 && sessionFrequency > 2) return 'medium';
    return 'low';
  }

  estimatePeerActivityLevel(peer) {
    // Simplified estimation - in practice would use peer's actual data
    return 'medium'; // Placeholder
  }

  areActivityLevelsCompatible(userLevel, peerLevel) {
    const compatibility = {
      'high': ['high', 'medium'],
      'medium': ['high', 'medium', 'low'],
      'low': ['medium', 'low']
    };

    return compatibility[userLevel]?.includes(peerLevel) || false;
  }

  applyAdaptationRules(recommendations, adaptationRules) {
    adaptationRules.forEach(rule => {
      if (rule.type === 'boost_priority') {
        this.boostContentPriority(recommendations, rule.contentType, rule.boost);
      } else if (rule.type === 'filter_content') {
        this.filterContent(recommendations, rule.criteria);
      } else if (rule.type === 'add_suggestion') {
        this.addSuggestion(recommendations, rule.suggestion);
      }
    });

    return recommendations;
  }

  boostContentPriority(recommendations, contentType, boost) {
    recommendations.personalizedContent = recommendations.personalizedContent.map(content => {
      if (content.type === contentType) {
        return {
          ...content,
          score: Math.min(1.0, (content.score || 0.5) + boost),
          adaptationApplied: true
        };
      }
      return content;
    });
  }

  filterContent(recommendations, criteria) {
    if (criteria.excludeTypes) {
      recommendations.personalizedContent = recommendations.personalizedContent.filter(
        content => !criteria.excludeTypes.includes(content.type)
      );
    }
  }

  addSuggestion(recommendations, suggestion) {
    recommendations.contextAwareTips = recommendations.contextAwareTips || [];
    recommendations.contextAwareTips.push(suggestion);
  }

  async applyMoodBasedAdaptations(recommendations, mood) {
    const moodCategory = this.normalizeMood(mood.emotion);
    const moodIntensity = mood.confidence || 0.5;

    // High intensity negative moods need immediate intervention
    if (moodIntensity > 0.7 && ['anxious', 'sad', 'stressed'].includes(moodCategory)) {
      recommendations.priority = 'urgent';
      recommendations.interventionNeeded = true;
      
      // Filter to only show immediate relief options
      const interventionTypes = ['breathing_exercise', 'crisis_support', 'peer_support'];
      recommendations.personalizedContent = recommendations.personalizedContent.filter(
        content => interventionTypes.includes(content.type)
      );
    }

    return recommendations;
  }

  applyTimeBasedAdaptations(recommendations, context) {
    const currentHour = context.hour || new Date().getHours();

    // Late night adaptations
    if (currentHour >= 22 || currentHour <= 6) {
      recommendations.timeContext = 'late_night';
      
      // Prioritize calming activities
      const calmingTypes = ['meditation', 'breathing_exercise', 'mindfulness'];
      recommendations.personalizedContent = recommendations.personalizedContent.map(content => {
        if (calmingTypes.includes(content.type)) {
          return {
            ...content,
            score: Math.min(1.0, (content.score || 0.5) + 0.15),
            nightOptimized: true
          };
        }
        return content;
      });
    }

    return recommendations;
  }

  applyStressBasedAdaptations(recommendations, context) {
    const stressLevel = Math.max(context.anxietyLevel || 0, context.stressLevel || 0);

    if (stressLevel >= 8) {
      recommendations.stressLevel = 'critical';
      recommendations.immediateAction = true;
      
      // Only show crisis and immediate relief options
      const crisisTypes = ['breathing_exercise', 'crisis_support', 'emergency_contact'];
      recommendations.personalizedContent = recommendations.personalizedContent.filter(
        content => crisisTypes.includes(content.type)
      );
    } else if (stressLevel >= 6) {
      recommendations.stressLevel = 'elevated';
      
      // Prioritize stress relief
      const stressReliefTypes = ['breathing_exercise', 'meditation', 'peer_support'];
      recommendations.personalizedContent = recommendations.personalizedContent.map(content => {
        if (stressReliefTypes.includes(content.type)) {
          return {
            ...content,
            score: Math.min(1.0, (content.score || 0.5) + 0.25),
            stressOptimized: true
          };
        }
        return content;
      });
    }

    return recommendations;
  }

  calculateAdaptedConfidence(baseConfidence, context) {
    let adaptedConfidence = baseConfidence;

    // Increase confidence if we have strong contextual signals
    if (context.mood && context.mood.confidence > 0.8) {
      adaptedConfidence += 0.1;
    }

    // Increase confidence if we have recent interaction data
    if (this.userInteractions.size > 50) {
      adaptedConfidence += 0.1;
    }

    // Decrease confidence if context is uncertain
    if (!context.mood || context.mood.confidence < 0.3) {
      adaptedConfidence -= 0.1;
    }

    return Math.min(1.0, Math.max(0.0, adaptedConfidence));
  }

  getFallbackContentRecommendations() {
    return {
      personalizedContent: [
        {
          type: 'breathing_exercise',
          reason: 'General wellness activity',
          score: 0.5,
          priority: 'medium'
        },
        {
          type: 'journaling',
          reason: 'Reflection and self-awareness',
          score: 0.4,
          priority: 'medium'
        }
      ],
      trendingContent: [],
      contextualContent: [],
      diversityContent: [],
      confidence: 0.3
    };
  }

  getFallbackPeerRecommendations() {
    return {
      supportPartners: [],
      activityPartners: [],
      mentorConnections: [],
      groupSuggestions: [],
      confidence: 0.2
    };
  }

  // Track content interactions for learning
  async trackContentInteraction(contentType, contentId, interactionType, data = {}) {
    try {
      const authResult = await supabase.auth.getUser();
      const user = authResult?.data?.user;
      if (!user) return;

      const interaction = {
        user_id: user.id,
        content_type: contentType,
        content_id: contentId,
        interaction_type: interactionType,
        duration_seconds: data.duration || null,
        completion_percentage: data.completionPercentage || null,
        user_rating: data.userRating || null,
        context_data: await this.getCurrentContext()
      };

      const { error } = await supabase
        .from('content_interactions')
        .insert(interaction);

      if (error) {
        console.warn('Failed to track content interaction:', error);
      }

      // Also track in behavior learning system
      await this.trackInteraction(`content_${interactionType}`, {
        contentType,
        contentId,
        ...data
      });
    } catch (error) {
      console.error('Failed to track content interaction:', error);
    }
  }

  // Track peer interactions for learning
  async trackPeerInteraction(peerId, interactionType, data = {}) {
    try {
      const authResult = await supabase.auth.getUser();
      const user = authResult?.data?.user;
      if (!user) return;

      const interaction = {
        user_id: user.id,
        peer_id: peerId,
        interaction_type: interactionType,
        interaction_quality: data.quality || 'neutral',
        interaction_data: data,
        mutual_rating: data.mutualRating || null
      };

      const { error } = await supabase
        .from('peer_interactions')
        .insert(interaction);

      if (error) {
        console.warn('Failed to track peer interaction:', error);
      }

      // Also track in behavior learning system
      await this.trackInteraction(`peer_${interactionType}`, {
        peerId,
        ...data
      });
    } catch (error) {
      console.error('Failed to track peer interaction:', error);
    }
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
