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
        engagementPa