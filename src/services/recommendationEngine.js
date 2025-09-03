import aiService from './aiService';
import behaviorLearningService from './behaviorLearningService';
import matchingService from './matchingService';

class RecommendationEngine {
  constructor() {
    this.recommendationCache = new Map();
    this.aiContext = {};
    this.learningThreshold = 10; // Minimum interactions before AI analysis
  }

  // Generate contextual recommendations based on user behavior and context
  async generateContextualRecommendations(userId, context = {}) {
    try {
      const currentState = {
        userId,
        timestamp: Date.now(),
        context: await this.enrichContext(context),
        preferences: await this.getUserPreferences(userId),
        patterns: await behaviorLearningService.learnUserPatterns()
      };

      // Use AI service for intelligent contextual recommendations
      if (currentState.totalInteractions > this.learningThreshold) {
        const aiRecommendations = await aiService.generateContextualRecommendations({
          currentState,
          behaviorPatterns: currentState.patterns,
          context: currentState.context
        });

        if (aiRecommendations) {
          // Cache recommendations for performance
          const cacheKey = `contextual_${userId}_${currentState.timestamp}`;
          this.recommendationCache.set(cacheKey, aiRecommendations);

          return this.formatRecommendations(aiRecommendations, currentState);
        }
      }

      // Fallback to pattern-based recommendations
      return await this.generatePatternBasedRecommendations(currentState);

    } catch (error) {
      console.error('Failed to generate contextual recommendations:', error);
      return this.getFallbackRecommendations();
    }
  }

  // Generate peer-based recommendations for social features
  async generatePeerRecommendations(userId, options = {}) {
    try {
      const userProfile = await this.getUserProfile(userId);
      const matchResult = await matchingService.findMatches(userId);
      const compatiblePeers = matchResult.success ? matchResult.data : [];

      const peerRecommendations = {
        supportPartners: [],
        activityPartners: [],
        mentorMentee: [],
        groupActivities: []
      };

      // Use AI for peer matching with behavioral insights
      const peerData = await Promise.all(
        compatiblePeers.map(peer =>
          this.getPeerBehavioralProfile(peer.id).then(behavioralProfile => ({
            ...peer,
            behavioralProfile
          }))
        )
      );

      const aiPeerSuggestions = await aiService.generatePeerRecommendations({
        userProfile,
        compatiblePeers: peerData,
        userPatterns: await behaviorLearningService.learnUserPatterns(),
        options
      });

      if (aiPeerSuggestions) {
        peerRecommendations.aiSuggestedPeers = aiPeerSuggestions;
      }

      // Enhance with behavioral matching
      const enhancedPeers = await this.enhancePeerMatches(userId, compatiblePeers);
      peerRecommendations.supportPartners.push(...enhancedPeers);

      return peerRecommendations;

    } catch (error) {
      console.error('Failed to generate peer recommendations:', error);
      return { supportPartners: [], activityPartners: [], mentorMentee: [] };
    }
  }

  // Generate wellness task recommendations
  async generateWellnessTaskRecommendations(userId, context = {}) {
    try {
      const patterns = await behaviorLearningService.learnUserPatterns();
      const currentContext = await this.enrichContext(context);

      const wellnessRecommendations = {
        immediateTasks: [],
        preventiveTasks: [],
        maintenanceTasks: [],
        targetedInterventions: []
      };

      // AI-powered task suggestions
      const aiTasks = await aiService.suggestWellnessTasks({
        patterns,
        context: currentContext,
        userPreferences: await this.getUserPreferences(userId),
        triggerContext: context.trigger
      });

      if (aiTasks) {
        wellnessRecommendations.aiSuggestedTasks = aiTasks;

        // Categorize tasks by urgency and type
        wellnessRecommendations.immediateTasks =
          aiTasks.filter(task => task.priority === 'high' && task.type === 'intervention');
        wellnessRecommendations.preventiveTasks =
          aiTasks.filter(task => task.priority === 'medium' && task.type === 'preventive');
        wellnessRecommendations.maintenanceTasks =
          aiTasks.filter(task => task.priority === 'low');
      }

      return wellnessRecommendations;

    } catch (error) {
      console.error('Failed to generate wellness task recommendations:', error);
      return this.getDefaultWellnessTasks();
    }
  }

  // Get adaptive recommendations that learn from user engagement
  async getAdaptiveRecommendations(userId, engagement = {}) {
    try {
      // Track user engagement with previous recommendations
      if (engagement.recommendationId) {
        await behaviorLearningService.trackInteraction(
          'recommendation_engagement',
          {
            recommendationId: engagement.recommendationId,
            action: engagement.action,
            ...engagement
          }
        );
      }

      // Analyze recommendation effectiveness
      const effectiveness = await this.analyzeRecommendationEffectiveness(userId);

      // Generate adapted recommendations based on effectiveness
      const adaptedRecs = await aiService.generateAdaptiveRecommendations({
        userFeedback: engagement,
        pastEffectiveness: effectiveness,
        currentPatterns: await behaviorLearningService.learnUserPatterns(),
        learningRate: this.calculateLearningRate(engagement)
      });

      return adaptedRecs || await this.generateContextualRecommendations(userId);

    } catch (error) {
      console.error('Failed to generate adaptive recommendations:', error);
      return [];
    }
  }

  // Enrich context with additional data
  async enrichContext(baseContext) {
    const enrichedContext = { ...baseContext };

    try {
      // Add behavioral context
      enrichedContext.behavioralContext = await behaviorLearningService.getCurrentContext();

      // Add temporal context
      const now = new Date();
      enrichedContext.season = this.getSeason(now.getMonth());
      enrichedContext.isWeekend = [0, 6].includes(now.getDay());
      enrichedContext.quarterHour = Math.floor(now.getMinutes() / 15);
      enrichedContext.weekOfMonth = Math.ceil(now.getDate() / 7);

      // Add social context (if user has recent social interactions)
      enrichedContext.socialContext = await this.getRecentSocialContext();

      return enrichedContext;
    } catch (error) {
      console.error('Failed to enrich context:', error);
      return enrichedContext;
    }
  }

  getSeason(month) {
    if (month >= 11 || month <= 1) return 'winter';
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    return 'autumn';
  }

  async getRecentSocialContext() {
    try {
      // This would integrate with social services to get recent peer interactions
      const recentInteractions = await behaviorLearningService.getRecentInteractions(10);
      const socialInteractions = recentInteractions.filter(
        interaction => interaction.type.startsWith('social_')
      );

      return {
        hasRecentPeerContact: socialInteractions.length > 2,
        lastPeerInteraction: socialInteractions.length > 0 ?
          socialInteractions[0].timestamp : null,
        socialActivityLevel: socialInteractions.length > 5 ? 'high' :
                           socialInteractions.length > 2 ? 'medium' : 'low'
      };
    } catch (error) {
      return { hasRecentPeerContact: false, socialActivityLevel: 'unknown' };
    }
  }

  // Get comprehensive user preferences from multiple sources
  async getUserPreferences(userId) {
    try {
      // Combine behavioral preferences with explicit user settings
      const behavioralPrefs = await behaviorLearningService.preferences;
      const explicitPrefs = await this.getExplicitUserPreferences(userId);

      return {
        behavioral: Object.fromEntries(behavioralPrefs),
        explicit: explicitPrefs,
        integrated: this.mergePreferences(behavioralPrefs, explicitPrefs)
      };
    } catch (error) {
      return { behavioral: {}, explicit: {}, integrated: {} };
    }
  }

  mergePreferences(behavioralPrefs, explicitPrefs) {
    const merged = {};

    // Use explicit preferences as base, augment with behavioral data
    Object.keys(explicitPrefs).forEach(key => {
      merged[key] = explicitPrefs[key];
      // Add behavioral weight if available
      if (behavioralPrefs.has(key)) {
        const behaviorData = behavioralPrefs.get(key);
        merged[key + '_behaviorWeight'] = behaviorData.frequency;
        merged[key + '_effectiveness'] = behaviorData.effectiveness;
      }
    });

    // Add behavioral preferences that don't have explicit counterparts
    behavioralPrefs.forEach((value, key) => {
      if (!(key in explicitPrefs)) {
        merged[key] = value;
        merged[key + '_source'] = 'behavioral';
      }
    });

    return merged;
  }

  async getExplicitUserPreferences(userId) {
    // Implementation would depend on how user preferences are stored
    // This is a placeholder for the actual preference retrieval
    return {
      notificationFrequency: 'moderate',
      preferredActivityTypes: [],
      wellnessGoals: [],
      privacySettings: {}
    };
  }

  // Format recommendations for display
  formatRecommendations(aiRecommendations, state) {
    return {
      timestamp: state.timestamp,
      userId: state.userId,
      context: state.context,
      recommendations: {
        immediate: aiRecommendations.immediate || [],
        proactive: aiRecommendations.proactive || [],
        preventive: aiRecommendations.preventive || [],
        social: aiRecommendations.social || []
      },
      confidence: aiRecommendations.confidence || 0,
      reasoning: aiRecommendations.reasoning || 'Pattern-based recommendations'
    };
  }

  // Pattern-based recommendations as fallback
  async generatePatternBasedRecommendations(state) {
    return await behaviorLearningService.generateRecommendations({
      context: state.context,
      patterns: state.patterns
    });
  }

  // Get fallback recommendations
  getFallbackRecommendations() {
    return {
      immediate: [],
      proactive: [],
      preventive: [
        {
          type: 'breathing_exercise',
          title: 'Take a Deep Breath',
          reason: 'Gentle breathing exercise to reduce stress',
          priority: 'low'
        },
        {
          type: 'journal_entry',
          title: 'Reflect on Your Day',
          reason: 'Help process experiences and emotions',
          priority: 'low'
        }
      ],
      social: []
    };
  }

  // Get default wellness tasks
  getDefaultWellnessTasks() {
    return {
      immediateTasks: [],
      preventiveTasks: [
        { id: 'breathing_1', type: 'breathing', title: 'Deep Breathing', duration: 5 },
        { id: 'journal_1', type: 'journal', title: 'Evening Reflection', duration: 10 }
      ],
      maintenanceTasks: [],
      targetedInterventions: []
    };
  }

  // Enhance peer matches with behavioral data
  async enhancePeerMatches(userId, peers) {
    const enhancedPeers = [];

    for (const peer of peers) {
      const behavioralMatch = await this.calculateBehavioralSimilarity(userId, peer.id);
      enhancedPeers.push({
        ...peer,
        behavioralSimilarity: behavioralMatch,
        suggestedInteraction: this.getSuggestedInteractionType(peer.similarity, behavioralMatch)
      });
    }

    return enhancedPeers;
  }

  async calculateBehavioralSimilarity(userId1, userId2) {
    // Simplified behavioral similarity calculation
    // In practice, this would use pattern analysis and ML models
    return 0.5; // Placeholder
  }

  getSuggestedInteractionType(profileSimilarity, behavioralSimilarity) {
    const combinedScore = (profileSimilarity + behavioralSimilarity) / 2;

    if (combinedScore > 0.8) return 'collaborative_support';
    if (combinedScore > 0.6) return 'peer_mentoring';
    if (combinedScore > 0.4) return 'activity_partnership';
    return 'general_connection';
  }

  // Analyze recommendation effectiveness
  async analyzeRecommendationEffectiveness(userId) {
    try {
      const recentInteractions = await behaviorLearningService.getRecentInteractions(50);
      const recommendationInteractions = recentInteractions.filter(
        interaction => interaction.type.startsWith('recommendation_')
      );

      const effectiveness = {
        totalRecommendations: 0,
        acceptedRecommendations: 0,
        effectiveRecommendations: 0,
        categories: {}
      };

      recommendationInteractions.forEach(interaction => {
        effectiveness.totalRecommendations++;
        if (interaction.data.action === 'accepted' || interaction.data.action === 'completed') {
          effectiveness.acceptedRecommendations++;
        }
        if (interaction.data.action === 'completed' && interaction.data.rating >= 0.7) {
          effectiveness.effectiveRecommendations++;
        }

        // Category effectiveness
        const category = interaction.data.category || 'general';
        if (!effectiveness.categories[category]) {
          effectiveness.categories[category] = { total: 0, effective: 0 };
        }
        effectiveness.categories[category].total++;

        if (interaction.data.rating >= 0.7) {
          effectiveness.categories[category].effective++;
        }
      });

      return effectiveness;
    } catch (error) {
      console.error('Failed to analyze recommendation effectiveness:', error);
      return { totalRecommendations: 0, acceptedRecommendations: 0, effectiveRecommendations: 0 };
    }
  }

  async getPeerBehavioralProfile(peerId) {
    // Implementation would retrieve peer's behavioral data
    // This is a placeholder
    return {
      activityLevel: 'moderate',
      preferredTimes: ['afternoon', 'evening'],
      interests: [],
      supportStyle: 'encouraging'
    };
  }

  async getUserProfile(userId) {
    // Implementation would retrieve user's profile data
    // This is a placeholder
    return {
      id: userId,
      preferences: {},
      goals: [],
      supportNeeds: ''
    };
  }

  calculateLearningRate(feedback) {
    if (!feedback) return 0.1;

    // Adaptive learning rate based on feedback
    const feedbackScore = feedback.rating || 0.5;
    const timeSinceInteraction = Date.now() - (feedback.timestamp || Date.now());
    const recencyWeight = Math.max(0.1, Math.exp(-timeSinceInteraction / (24 * 60 * 60 * 1000))); // Exponential decay over 24 hours

    return Math.min(0.5, Math.max(0.01, feedbackScore * recencyWeight));
  }

  // Clear old cached recommendations
  clearOldCache() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [key, value] of this.recommendationCache) {
      if (value.timestamp < oneHourAgo) {
        this.recommendationCache.delete(key);
      }
    }
  }

  // Get real-time metrics for recommendation analytics
  getRecommendationMetrics() {
    return {
      cacheSize: this.recommendationCache.size,
      cacheHitRate: 0, // Would need to track hits during implementation
      averageGenerationTime: 0, // Would need to measure during generation
      recommendationDiversity: 0, // Would analyze category distribution
      userSatisfaction: 0 // Would need user feedback tracking
    };
  }
}

const recommendationEngine = new RecommendationEngine();
export default recommendationEngine;
