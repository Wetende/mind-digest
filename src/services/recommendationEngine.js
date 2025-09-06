import aiService from './aiService';
import behaviorLearningService from './behaviorLearningService';
import matchingService from './matchingService';

class RecommendationEngine {
  constructor() {
    this.recommendationCache = new Map();
    this.aiContext = {};
    this.learningThreshold = 10; // Minimum interactions before AI analysis
  }

  // Enhanced contextual recommendations with real-time adaptation
  async generateContextualRecommendations(userId, context = {}) {
    try {
      const currentState = {
        userId,
        timestamp: Date.now(),
        context: await this.enrichContext(context),
        preferences: await this.getUserPreferences(userId),
        patterns: await behaviorLearningService.learnUserPatterns()
      };

      // Get base recommendations from behavior learning service
      const baseRecommendations = await behaviorLearningService.generateRecommendations({
        context: currentState.context,
        userId: userId
      });

      // Apply real-time adaptations
      const adaptedRecommendations = await behaviorLearningService.adaptRecommendationsRealTime(
        baseRecommendations,
        currentState.context
      );

      // Use AI service for intelligent contextual recommendations if enough data
      if (behaviorLearningService.userInteractions.size > this.learningThreshold) {
        const aiRecommendations = await aiService.generateContextualRecommendations({
          currentState,
          behaviorPatterns: currentState.patterns,
          context: currentState.context,
          baseRecommendations: adaptedRecommendations
        });

        if (aiRecommendations) {
          // Merge AI recommendations with adapted recommendations
          const mergedRecommendations = this.mergeRecommendations(adaptedRecommendations, aiRecommendations);
          
          // Cache recommendations for performance
          const cacheKey = `contextual_${userId}_${Math.floor(currentState.timestamp / 300000)}`; // 5-minute cache buckets
          this.recommendationCache.set(cacheKey, mergedRecommendations);

          return this.formatRecommendations(mergedRecommendations, currentState);
        }
      }

      // Return adapted recommendations
      return this.formatRecommendations(adaptedRecommendations, currentState);

    } catch (error) {
      console.error('Failed to generate contextual recommendations:', error);
      return this.getFallbackRecommendations();
    }
  }

  // Enhanced peer recommendations with behavioral learning integration
  async generatePeerRecommendations(userId, options = {}) {
    try {
      // Get peer recommendations from behavior learning service
      const behaviorBasedPeerRecs = await behaviorLearningService.generatePeerRecommendations(options);

      // Get traditional matching service results
      const userProfile = await this.getUserProfile(userId);
      const matchResult = await matchingService.findMatches(userId);
      const compatiblePeers = matchResult.success ? matchResult.data : [];

      // Merge behavioral and traditional peer recommendations
      const mergedPeerRecommendations = {
        supportPartners: [...(behaviorBasedPeerRecs.supportPartners || [])],
        activityPartners: [...(behaviorBasedPeerRecs.activityPartners || [])],
        mentorMentee: [...(behaviorBasedPeerRecs.mentorConnections || [])],
        groupActivities: [...(behaviorBasedPeerRecs.groupSuggestions || [])]
      };

      // Enhance traditional matches with behavioral insights
      const peerData = await Promise.all(
        compatiblePeers.map(peer =>
          this.getPeerBehavioralProfile(peer.id).then(behavioralProfile => ({
            ...peer,
            behavioralProfile
          }))
        )
      );

      // Use AI for peer matching with behavioral insights
      const aiPeerSuggestions = await aiService.generatePeerRecommendations({
        userProfile,
        compatiblePeers: peerData,
        userPatterns: await behaviorLearningService.learnUserPatterns(),
        behaviorBasedRecommendations: behaviorBasedPeerRecs,
        options
      });

      if (aiPeerSuggestions) {
        mergedPeerRecommendations.aiSuggestedPeers = aiPeerSuggestions;
        
        // Merge AI suggestions with existing recommendations
        mergedPeerRecommendations.supportPartners = this.mergePeerLists(
          mergedPeerRecommendations.supportPartners,
          aiPeerSuggestions.supportPartners || []
        );
      }

      // Enhance with behavioral matching
      const enhancedPeers = await this.enhancePeerMatches(userId, compatiblePeers);
      mergedPeerRecommendations.supportPartners = this.mergePeerLists(
        mergedPeerRecommendations.supportPartners,
        enhancedPeers
      );

      // Apply real-time filtering based on current context
      const context = await behaviorLearningService.getCurrentContext();
      const filteredRecommendations = await this.applyContextualPeerFiltering(
        mergedPeerRecommendations,
        context
      );

      return filteredRecommendations;

    } catch (error) {
      console.error('Failed to generate peer recommendations:', error);
      return { supportPartners: [], activityPartners: [], mentorMentee: [], groupActivities: [] };
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

  // Helper methods for enhanced recommendation system

  mergeRecommendations(baseRecommendations, aiRecommendations) {
    const merged = { ...baseRecommendations };

    // Merge content recommendations
    if (aiRecommendations.contentRecommendations) {
      merged.contentRecommendations = merged.contentRecommendations || {};
      merged.contentRecommendations.personalizedContent = this.mergeContentLists(
        merged.contentRecommendations.personalizedContent || [],
        aiRecommendations.contentRecommendations.personalizedContent || []
      );
    }

    // Merge peer recommendations
    if (aiRecommendations.peerRecommendations) {
      merged.peerRecommendations = merged.peerRecommendations || {};
      merged.peerRecommendations.supportPartners = this.mergePeerLists(
        merged.peerRecommendations.supportPartners || [],
        aiRecommendations.peerRecommendations.supportPartners || []
      );
    }

    // Merge AI suggestions
    if (aiRecommendations.aiSuggestions) {
      merged.aiSuggestions = [
        ...(merged.aiSuggestions || []),
        ...aiRecommendations.aiSuggestions
      ];
    }

    // Update confidence score
    merged.confidence = Math.max(
      merged.confidence || 0,
      aiRecommendations.confidence || 0
    );

    return merged;
  }

  mergeContentLists(list1, list2) {
    const merged = [...list1];
    
    list2.forEach(item2 => {
      const existingIndex = merged.findIndex(item1 => 
        item1.type === item2.type && item1.id === item2.id
      );
      
      if (existingIndex >= 0) {
        // Merge scores and combine reasons
        merged[existingIndex] = {
          ...merged[existingIndex],
          score: Math.max(merged[existingIndex].score || 0, item2.score || 0),
          reason: `${merged[existingIndex].reason}; ${item2.reason}`,
          aiEnhanced: true
        };
      } else {
        merged.push({ ...item2, aiEnhanced: true });
      }
    });

    return merged.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  mergePeerLists(list1, list2) {
    const merged = [...list1];
    
    list2.forEach(peer2 => {
      const existingIndex = merged.findIndex(peer1 => peer1.id === peer2.id);
      
      if (existingIndex >= 0) {
        // Merge compatibility scores
        merged[existingIndex] = {
          ...merged[existingIndex],
          compatibilityScore: Math.max(
            merged[existingIndex].compatibilityScore || 0,
            peer2.compatibilityScore || 0
          ),
          aiEnhanced: true
        };
      } else {
        merged.push({ ...peer2, aiEnhanced: true });
      }
    });

    return merged.sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0));
  }

  async applyContextualPeerFiltering(peerRecommendations, context) {
    try {
      // Filter based on current mood and stress levels
      if (context.mood && ['anxious', 'stressed'].includes(behaviorLearningService.normalizeMood(context.mood.emotion))) {
        // Prioritize supportive peers over activity partners during stress
        peerRecommendations.supportPartners = peerRecommendations.supportPartners.slice(0, 5);
        peerRecommendations.activityPartners = peerRecommendations.activityPartners.slice(0, 2);
      }

      // Filter based on time of day
      if (context.timeOfDay === 'night') {
        // Reduce social recommendations during late hours
        peerRecommendations.activityPartners = [];
        peerRecommendations.groupActivities = [];
      }

      // Filter based on social energy levels
      const recentSocialInteractions = await behaviorLearningService.getRecentInteractions(10)
        .filter(interaction => interaction.type.startsWith('social_'));
      
      if (recentSocialInteractions.length > 5) {
        // User has been socially active, reduce recommendations
        peerRecommendations.supportPartners = peerRecommendations.supportPartners.slice(0, 3);
      }

      return peerRecommendations;
    } catch (error) {
      console.error('Failed to apply contextual peer filtering:', error);
      return peerRecommendations;
    }
  }

  // Track recommendation effectiveness for learning
  async trackRecommendationEngagement(userId, recommendationId, action, data = {}) {
    try {
      // Track in behavior learning service
      await behaviorLearningService.trackInteraction('recommendation_engagement', {
        recommendationId,
        action,
        effectiveness: data.effectiveness || null,
        userRating: data.userRating || null,
        ...data
      });

      // Store in recommendation history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('recommendation_history')
          .insert({
            user_id: user.id,
            recommendation_type: data.recommendationType || 'general',
            recommendation_data: { recommendationId, ...data },
            context_at_time: await behaviorLearningService.getCurrentContext(),
            user_action: action,
            effectiveness_rating: data.effectiveness || null
          });

        if (error) {
          console.warn('Failed to store recommendation history:', error);
        }
      }

      // Update recommendation analytics
      await this.updateRecommendationAnalytics(action, data);

    } catch (error) {
      console.error('Failed to track recommendation engagement:', error);
    }
  }

  async updateRecommendationAnalytics(action, data) {
    try {
      // Update internal analytics
      if (!this.analytics) {
        this.analytics = {
          totalRecommendations: 0,
          acceptedRecommendations: 0,
          effectiveRecommendations: 0,
          averageRating: 0,
          categoryPerformance: {}
        };
      }

      this.analytics.totalRecommendations++;

      if (['accepted', 'completed'].includes(action)) {
        this.analytics.acceptedRecommendations++;
      }

      if (data.effectiveness && data.effectiveness >= 0.7) {
        this.analytics.effectiveRecommendations++;
      }

      if (data.userRating) {
        this.analytics.averageRating = (
          (this.analytics.averageRating * (this.analytics.totalRecommendations - 1)) + 
          data.userRating
        ) / this.analytics.totalRecommendations;
      }

      // Update category performance
      if (data.category) {
        if (!this.analytics.categoryPerformance[data.category]) {
          this.analytics.categoryPerformance[data.category] = {
            total: 0,
            accepted: 0,
            effective: 0
          };
        }

        this.analytics.categoryPerformance[data.category].total++;
        
        if (['accepted', 'completed'].includes(action)) {
          this.analytics.categoryPerformance[data.category].accepted++;
        }

        if (data.effectiveness && data.effectiveness >= 0.7) {
          this.analytics.categoryPerformance[data.category].effective++;
        }
      }

    } catch (error) {
      console.error('Failed to update recommendation analytics:', error);
    }
  }

  // Get real-time metrics for recommendation analytics
  getRecommendationMetrics() {
    const behaviorMetrics = behaviorLearningService.userInteractions.size;
    
    return {
      cacheSize: this.recommendationCache.size,
      behaviorDataPoints: behaviorMetrics,
      adaptationCacheSize: behaviorLearningService.realTimeAdaptations.size,
      analytics: this.analytics || {},
      learningThreshold: this.learningThreshold,
      isLearningActive: behaviorMetrics > this.learningThreshold
    };
  }

  // Get personalized recommendation insights
  async getRecommendationInsights(userId) {
    try {
      const patterns = await behaviorLearningService.learnUserPatterns();
      const context = await behaviorLearningService.getCurrentContext();
      
      return {
        userPatterns: patterns,
        currentContext: context,
        adaptations: Array.from(behaviorLearningService.realTimeAdaptations.entries()),
        recentInteractions: behaviorLearningService.getRecentInteractions(10),
        behaviorProfile: behaviorLearningService.userBehaviorProfile,
        metrics: this.getRecommendationMetrics()
      };
    } catch (error) {
      console.error('Failed to get recommendation insights:', error);
      return null;
    }
  }
}

const recommendationEngine = new RecommendationEngine();
export default recommendationEngine;
