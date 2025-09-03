import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import aiService from './aiService';
import behaviorLearningService from './behaviorLearningService';

class RecommendationAnalytics {
  constructor() {
    this.recommendationHistory = [];
    this.performanceMetrics = {};
    this.userPreferences = {};
    this.loadAnalyticsData();
  }

  async loadAnalyticsData() {
    try {
      const storedHistory = await AsyncStorage.getItem('recommendation_history');
      const storedMetrics = await AsyncStorage.getItem('recommendation_metrics');
      const storedPreferences = await AsyncStorage.getItem('recommendation_preferences');

      if (storedHistory) {
        this.recommendationHistory = JSON.parse(storedHistory);
      }

      if (storedMetrics) {
        this.performanceMetrics = JSON.parse(storedMetrics);
      }

      if (storedPreferences) {
        this.userPreferences = JSON.parse(storedPreferences);
      }
    } catch (error) {
      console.error('Failed to load recommendation analytics data:', error);
    }
  }

  async saveAnalyticsData() {
    try {
      await AsyncStorage.setItem(
        'recommendation_history',
        JSON.stringify(this.recommendationHistory.slice(-1000)) // Keep last 1000 entries
      );
      await AsyncStorage.setItem(
        'recommendation_metrics',
        JSON.stringify(this.performanceMetrics)
      );
      await AsyncStorage.setItem(
        'recommendation_preferences',
        JSON.stringify(this.userPreferences)
      );
    } catch (error) {
      console.error('Failed to save recommendation analytics data:', error);
    }
  }

  // Track recommendation interaction
  async trackRecommendationInteraction(recommendationId, action, data = {}) {
    try {
      const interaction = {
        recommendationId,
        action,
        timestamp: Date.now(),
        ...data
      };

      this.recommendationHistory.push(interaction);

      // Update metrics immediately
      await this.updateMetrics(recommendationId, action, data);

      // Save to storage
      await this.saveAnalyticsData();

      return interaction;
    } catch (error) {
      console.error('Failed to track recommendation interaction:', error);
      return null;
    }
  }

  // Update performance metrics
  async updateMetrics(recommendationId, action, data) {
    const metrics = this.performanceMetrics[recommendationId] || {
      impressions: 0,
      accepts: 0,
      dismisses: 0,
      completions: 0,
      ratings: [],
      timeToAction: [],
      category: data.category || 'unknown',
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };

    switch (action) {
      case 'impression':
        metrics.impressions++;
        break;
      case 'accept':
        metrics.accepts++;
        if (data.timeFromImpression) {
          metrics.timeToAction.push(data.timeFromImpression);
        }
        break;
      case 'dismiss':
        metrics.dismisses++;
        break;
      case 'complete':
        metrics.completions++;
        if (data.rating) {
          metrics.ratings.push(data.rating);
        }
        break;
      case 'feedback':
        if (data.rating) {
          metrics.ratings.push(data.rating);
        }
        break;
    }

    metrics.lastUpdated = Date.now();
    this.performanceMetrics[recommendationId] = metrics;
  }

  // Get recommendation performance
  getRecommendationPerformance(recommendationId) {
    const metrics = this.performanceMetrics[recommendationId];
    if (!metrics) return null;

    const acceptRate = metrics.impressions > 0 ? metrics.accepts / metrics.impressions : 0;
    const completionRate = metrics.accepts > 0 ? metrics.completions / metrics.accepts : 0;
    const engagementRate = (metrics.accepts + metrics.completions + metrics.ratings.length) / metrics.impressions;

    const averageRating = metrics.ratings.length > 0 ?
      metrics.ratings.reduce((sum, rating) => sum + rating, 0) / metrics.ratings.length : 0;

    const averageTimeToAction = metrics.timeToAction.length > 0 ?
      metrics.timeToAction.reduce((sum, time) => sum + time, 0) / metrics.timeToAction.length : 0;

    return {
      recommendationId,
      acceptRate,
      completionRate,
      engagementRate,
      averageRating,
      averageTimeToAction,
      totalImpressions: metrics.impressions,
      totalAccepts: metrics.accepts,
      totalDismisses: metrics.dismisses,
      totalCompletions: metrics.completions,
      totalFeedback: metrics.ratings.length,
      category: metrics.category,
      score: this.calculatePerformanceScore({
        acceptRate,
        completionRate,
        engagementRate,
        averageRating
      })
    };
  }

  calculatePerformanceScore(metrics) {
    // Weighted score calculation
    const weightAccept = 0.3;
    const weightCompletion = 0.3;
    const weightEngagement = 0.2;
    const weightRating = 0.2;

    return (
      metrics.acceptRate * weightAccept +
      metrics.completionRate * weightCompletion +
      metrics.engagementRate * weightEngagement +
      (metrics.averageRating / 5) * weightRating // Normalize rating to 0-1
    );
  }

  // Get category performance analytics
  getCategoryAnalytics(category, timeRange = 7 * 24 * 60 * 60 * 1000) { // Default 7 days
    const cutoffTime = Date.now() - timeRange;
    const categoryInteractions = this.recommendationHistory.filter(
      interaction => interaction.category === category && interaction.timestamp > cutoffTime
    );

    if (categoryInteractions.length === 0) {
      return {
        category,
        totalInteractions: 0,
        acceptRate: 0,
        completionRate: 0,
        averageRating: 0,
        topRecommendations: [],
        trend: 'neutral'
      };
    }

    const interactionsByRec = {};
    categoryInteractions.forEach(interaction => {
      if (!interactionsByRec[interaction.recommendationId]) {
        interactionsByRec[interaction.recommendationId] = [];
      }
      interactionsByRec[interaction.recommendationId].push(interaction);
    });

    let totalAccepts = 0;
    let totalCompletions = 0;
    let totalRatings = [];
    const recommendationScores = [];

    Object.entries(interactionsByRec).forEach(([recId, interactions]) => {
      interactions.forEach(interaction => {
        switch (interaction.action) {
          case 'accept':
            totalAccepts++;
            break;
          case 'complete':
            totalCompletions++;
            if (interaction.rating) totalRatings.push(interaction.rating);
            break;
          case 'feedback':
            if (interaction.rating) totalRatings.push(interaction.rating);
            break;
        }
      });

      const score = this.getRecommendationPerformance(recId);
      if (score) {
        recommendationScores.push(score);
      }
    });

    const impressions = Object.keys(interactionsByRec).length;
    const acceptRate = impressions > 0 ? totalAccepts / impressions : 0;
    const completionRate = totalAccepts > 0 ? totalCompletions / totalAccepts : 0;
    const averageRating = totalRatings.length > 0 ?
      totalRatings.reduce((sum, rating) => sum + rating, 0) / totalRatings.length : 0;

    // Sort recommendations by score
    recommendationScores.sort((a, b) => b.score - a.score);

    return {
      category,
      totalInteractions: categoryInteractions.length,
      uniqueRecommendations: impressions,
      acceptRate,
      completionRate,
      averageRating,
      topRecommendations: recommendationScores.slice(0, 5),
      trend: this.calculateTrend(category, timeRange)
    };
  }

  calculateTrend(category, timeRange) {
    const now = Date.now();
    const halfTimeRange = timeRange / 2;
    const recentCutoff = now - halfTimeRange;
    const olderCutoff = now - timeRange;

    const recentInteractions = this.recommendationHistory.filter(
      interaction => interaction.category === category &&
                     interaction.timestamp > recentCutoff
    );

    const olderInteractions = this.recommendationHistory.filter(
      interaction => interaction.category === category &&
                     interaction.timestamp > olderCutoff &&
                     interaction.timestamp <= recentCutoff
    );

    const recentPerformance = this.calculatePeriodPerformance(recentInteractions);
    const olderPerformance = this.calculatePeriodPerformance(olderInteractions);

    if (!olderPerformance) return 'new';

    const recentScore = recentPerformance.acceptRate + recentPerformance.completionRate;
    const olderScore = olderPerformance.acceptRate + olderPerformance.completionRate;

    const difference = recentScore - olderScore;

    if (difference > 0.1) return 'improving';
    if (difference < -0.1) return 'declining';
    return 'stable';
  }

  calculatePeriodPerformance(interactions) {
    if (interactions.length === 0) return null;

    let accepts = 0;
    let completions = 0;

    interactions.forEach(interaction => {
      if (interaction.action === 'accept') accepts++;
      if (interaction.action === 'complete') completions++;
    });

    return {
      acceptRate: accepts / interactions.length,
      completionRate: accepts > 0 ? completions / accepts : 0
    };
  }

  // Generate recommendation insights
  async generateInsights(userId, options = {}) {
    try {
      const timeRange = options.timeRange || 7 * 24 * 60 * 60 * 1000; // 7 days default
      const categories = options.categories || ['wellness', 'social', 'habits', 'mood'];

      const insights = {
        performanceOverview: this.getPerformanceOverview(timeRange),
        categoryAnalysis: {},
        userPreferences: this.userPreferences,
        recommendations: [],
        suggestedAdjustments: []
      };

      // Analyze each category
      categories.forEach(category => {
        insights.categoryAnalysis[category] = this.getCategoryAnalytics(category, timeRange);
      });

      // Generate recommendations based on insights
      insights.recommendations = this.generateRecommendationAdjustments(insights.categoryAnalysis);

      // Use AI for deeper insights if available
      if (this.recommendationHistory.length > 20) {
        const aiInsights = await this.generateAIInsights(userId, insights);
        if (aiInsights) {
          insights.aiInsights = aiInsights;
        }
      }

      return insights;
    } catch (error) {
      console.error('Failed to generate insights:', error);
      return null;
    }
  }

  getPerformanceOverview(timeRange) {
    const cutoffTime = Date.now() - timeRange;
    const recentInteractions = this.recommendationHistory.filter(
      interaction => interaction.timestamp > cutoffTime
    );

    if (recentInteractions.length === 0) {
      return {
        totalInteractions: 0,
        averageAcceptRate: 0,
        averageCompletionRate: 0,
        trend: 'insufficient_data'
      };
    }

    let totalAccepts = 0;
    let totalCompletions = 0;
    const uniqueRecommendations = new Set();

    recentInteractions.forEach(interaction => {
      if (interaction.action === 'accept') totalAccepts++;
      if (interaction.action === 'complete') totalCompletions++;
      uniqueRecommendations.add(interaction.recommendationId);
    });

    const averageAcceptRate = totalAccepts / uniqueRecommendations.size;
    const averageCompletionRate = totalAccepts > 0 ? totalCompletions / totalAccepts : 0;

    return {
      totalInteractions: recentInteractions.length,
      uniqueRecommendations: uniqueRecommendations.size,
      totalAccepts,
      totalCompletions,
      averageAcceptRate,
      averageCompletionRate,
      overallEngagement: (totalAccepts + totalCompletions) / recentInteractions.length
    };
  }

  generateRecommendationAdjustments(categoryAnalysis) {
    const adjustments = [];

    Object.entries(categoryAnalysis).forEach(([category, analysis]) => {
      if (analysis.trend === 'declining') {
        adjustments.push({
          type: 'reduce_frequency',
          category,
          reason: `Declining engagement in ${category} recommendations`,
          suggestedAction: `Reduce frequency of ${category} recommendations by 30%`
        });
      }

      if (analysis.acceptRate < 0.2) {
        adjustments.push({
          type: 'improve_quality',
          category,
          reason: `Low accept rate (${(analysis.acceptRate * 100).toFixed(1)}%) in ${category}`,
          suggestedAction: `Improve ${category} recommendation quality or reduce frequency`
        });
      }

      if (analysis.averageRating < 3.0 && analysis.averageRating > 0) {
        adjustments.push({
          type: 'quality_review',
          category,
          reason: `Low average rating (${analysis.averageRating.toFixed(1)}) in ${category}`,
          suggestedAction: `Review ${category} recommendation content quality`
        });
      }
    });

    return adjustments;
  }

  async generateAIInsights(userId, insightsData) {
    try {
      const aiAnalysis = await aiService.analyzeRecommendationPatterns({
        performanceData: insightsData.performanceOverview,
        categoryAnalysis: insightsData.categoryAnalysis,
        history: this.recommendationHistory.slice(-50), // Last 50 interactions
        userPreferences: this.userPreferences
      });

      if (aiAnalysis) {
        await behaviorLearningService.trackInteraction(
          'ai_analytics_generated',
          {
            insightType: 'recommendation_performance',
            analysis: aiAnalysis,
            timestamp: Date.now()
          }
        );

        return aiAnalysis;
      }
    } catch (error) {
      console.warn('Failed to generate AI insights:', error);
    }

    return null;
  }

  // Get user preferences from analytics data
  async analyzeUserPreferences() {
    try {
      const preferences = {
        preferredCategories: {},
        preferredTimes: {},
        engagementPatterns: {},
        feedbackPreferences: {}
      };

      // Analyze category preferences
      this.recommendationHistory.forEach(interaction => {
        const category = interaction.category || 'unknown';

        if (!preferences.preferredCategories[category]) {
          preferences.preferredCategories[category] = { accepts: 0, dismisses: 0 };
        }

        switch (interaction.action) {
          case 'accept':
          case 'complete':
            preferences.preferredCategories[category].accepts++;
            break;
          case 'dismiss':
            preferences.preferredCategories[category].dismisses++;
            break;
        }
      });

      // Calculate preference scores
      Object.keys(preferences.preferredCategories).forEach(category => {
        const data = preferences.preferredCategories[category];
        const total = data.accepts + data.dismisses;
        data.preferenceScore = total > 0 ? data.accepts / total : 0;
      });

      this.userPreferences = preferences;
      await this.saveAnalyticsData();

      return preferences;
    } catch (error) {
      console.error('Failed to analyze user preferences:', error);
      return {};
    }
  }

  // Export analytics data for reporting
  async exportAnalyticsData(options = {}) {
    try {
      const data = {
        performanceMetrics: this.performanceMetrics,
        userPreferences: this.userPreferences,
        totalInteractions: this.recommendationHistory.length,
        timeRange: options.timeRange || 'all',
        categories: options.categories || [],
        exportTimestamp: Date.now()
      };

      // Summarize key metrics
      data.summary = {
        totalRecommendations: Object.keys(this.performanceMetrics).length,
        averageAcceptRate: this.calculateOverallAcceptRate(),
        topPerformingCategories: this.getTopPerformingCategories(),
        engagementTrends: this.getEngagementTrends(),
        userSatisfaction: this.calculateUserSatisfaction()
      };

      return data;
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      return null;
    }
  }

  calculateOverallAcceptRate() {
    const metrics = Object.values(this.performanceMetrics);
    if (metrics.length === 0) return 0;

    const totalAccepts = metrics.reduce((sum, m) => sum + m.accepts, 0);
    const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);

    return totalImpressions > 0 ? totalAccepts / totalImpressions : 0;
  }

  getTopPerformingCategories() {
    const categoryMetrics = {};

    Object.values(this.performanceMetrics).forEach(metrics => {
      if (!categoryMetrics[metrics.category]) {
        categoryMetrics[metrics.category] = [];
      }
      categoryMetrics[metrics.category].push(metrics);
    });

    const categoryScores = {};
    Object.entries(categoryMetrics).forEach(([category, metrics]) => {
      const averageScore = metrics.reduce((sum, m) => sum + this.calculatePerformanceScore({
        acceptRate: m.impressions > 0 ? m.accepts / m.impressions : 0,
        completionRate: m.accepts > 0 ? m.completions / m.accepts : 0,
        engagementRate: (m.accepts + m.completions) / m.impressions,
        averageRating: m.ratings.length > 0 ?
          m.ratings.reduce((sum, r) => sum + r, 0) / m.ratings.length : 0
      }), 0) / metrics.length;

      categoryScores[category] = averageScore;
    });

    return Object.entries(categoryScores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  }

  getEngagementTrends() {
    // Simple trend analysis over time periods
    const now = Date.now();
    const periods = [
      { name: 'last_24h', range: 24 * 60 * 60 * 1000 },
      { name: 'last_7d', range: 7 * 24 * 60 * 60 * 1000 },
      { name: 'last_30d', range: 30 * 24 * 60 * 60 * 1000 }
    ];

    const trends = {};
    periods.forEach(period => {
      const cutoff = now - period.range;
      const interactions = this.recommendationHistory.filter(i => i.timestamp > cutoff);
      const accepts = interactions.filter(i => i.action === 'accept').length;

      trends[period.name] = {
        interactions: interactions.length,
        accepts: accepts,
        acceptRate: interactions.length > 0 ? accepts / interactions.length : 0
      };
    });

    return trends;
  }

  calculateUserSatisfaction() {
    const allRatings = [];
    Object.values(this.performanceMetrics).forEach(metrics => {
      allRatings.push(...metrics.ratings);
    });

    if (allRatings.length === 0) return null;

    const averageRating = allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length;

    // Calculate satisfaction based on rating distribution
    const satisfiedCount = allRatings.filter(rating => rating >= 4).length;
    const dissatisfiedCount = allRatings.filter(rating => rating <= 2).length;

    return {
      averageRating,
      satisfactionRate: allRatings.length > 0 ? satisfiedCount / allRatings.length : 0,
      dissatisfactionRate: allRatings.length > 0 ? dissatisfiedCount / allRatings.length : 0
    };
  }

  // Clear old data (keep last 1000 interactions, delete old metrics)
  async cleanupOldData() {
    try {
      // Keep only recent interactions
      this.recommendationHistory = this.recommendationHistory.slice(-1000);

      // Remove metrics for recommendations older than 30 days
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      Object.keys(this.performanceMetrics).forEach(key => {
        if (this.performanceMetrics[key].lastUpdated < thirtyDaysAgo) {
          delete this.performanceMetrics[key];
        }
      });

      await this.saveAnalyticsData();
    } catch (error) {
      console.error('Failed to cleanup old analytics data:', error);
    }
  }
}

const recommendationAnalytics = new RecommendationAnalytics();
export default recommendationAnalytics;
