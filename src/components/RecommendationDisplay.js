import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Alert, Dimensions } from 'react-native';
import RecommendationCard from './RecommendationCard';
import LoadingSpinner from './LoadingSpinner';
import Button from './Button';
import Card from './Card';
import recommendationEngine from '../services/recommendationEngine';
import behaviorLearningService from '../services/behaviorLearningService';

const { width: screenWidth } = Dimensions.get('window');

const RecommendationDisplay = ({
  userId,
  context = {},
  onRecommendationAction,
  refreshTrigger = 0,
  maxRecommendations = 5,
  showCategories = true,
  compact = false,
  showAdaptiveRecommendations = true
}) => {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [categories, setCategories] = useState({});
  const [lastRefreshTime, setLastRefreshTime] = useState(null);

  useEffect(() => {
    loadRecommendations();
  }, [userId, refreshTrigger]);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);

      // Get contextual recommendations
      const contextualRecs = await recommendationEngine.generateContextualRecommendations(userId, context);

      // Get wellness task recommendations
      const wellnessRecs = await recommendationEngine.generateWellnessTaskRecommendations(userId, context);

      // Get adaptive recommendations if enabled
      let adaptiveRecs = [];
      if (showAdaptiveRecommendations) {
        adaptiveRecs = await recommendationEngine.getAdaptiveRecommendations(userId, {});
        if (adaptiveRecs && Array.isArray(adaptiveRecs)) {
          adaptiveRecs = adaptiveRecs.slice(0, 2); // Limit to top 2 adaptive recommendations
        }
      }

      // Combine and prioritize recommendations
      const allRecommendations = prioritizeRecommendations([
        ...contextualRecs.recommendations?.immediate || [],
        ...contextualRecs.recommendations?.proactive || [],
        ...wellnessRecs.immediateTasks || [],
        ...wellnessRecs.preventiveTasks || [],
        ...adaptiveRecs || []
      ]);

      // Limit total recommendations
      const limitedRecommendations = allRecommendations.slice(0, maxRecommendations);

      setRecommendations(limitedRecommendations);
      setLastRefreshTime(new Date());

      // Categorize recommendations if needed
      if (showCategories) {
        const categorized = categorizeRecommendations(limitedRecommendations);
        setCategories(categorized);
      }

    } catch (error) {
      console.error('Failed to load recommendations:', error);
      Alert.alert('Error', 'Failed to load recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const categorizeRecommendations = (recs) => {
    const categories = {
      immediate: [],
      wellness: [],
      preventive: [],
      adaptive: []
    };

    recs.forEach(rec => {
      if (rec.priority === 'high' || rec.type === 'intervention') {
        categories.immediate.push(rec);
      } else if (rec.category === 'wellness_task' || rec.category === 'breathing_exercise') {
        categories.wellness.push(rec);
      } else if (rec.type === 'preventive' || rec.priority === 'medium') {
        categories.preventive.push(rec);
      } else {
        categories.adaptive.push(rec);
      }
    });

    // Remove empty categories
    return Object.fromEntries(
      Object.entries(categories).filter(([_, items]) => items.length > 0)
    );
  };

  const prioritizeRecommendations = (recs) => {
    return recs.sort((a, b) => {
      // High priority first
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;

      // Then by confidence score if available
      const aConfidence = a.confidence || (a.priority === 'high' ? 0.8 : 0.5);
      const bConfidence = b.confidence || (b.priority === 'high' ? 0.8 : 0.5);

      if (aConfidence !== bConfidence) {
        return bConfidence - aConfidence;
      }

      // Finally by recent engagement (this would need to be implemented)
      return 0;
    });
  };

  const handleRecommendationAction = async (action, recommendation) => {
    try {
      // Track the interaction
      await behaviorLearningService.trackInteraction(
        'recommendation_action',
        {
          recommendationId: recommendation.id,
          action,
          category: recommendation.category,
          priority: recommendation.priority,
          timestamp: Date.now()
        }
      );

      // Call parent handler if provided
      if (onRecommendationAction) {
        onRecommendationAction(action, recommendation);
      }

      // Handle specific actions
      switch (action) {
        case 'accept':
          handleAcceptRecommendation(recommendation);
          break;
        case 'dismiss':
          handleDismissRecommendation(recommendation);
          break;
        case 'feedback':
          handleFeedback(recommendation);
          break;
      }
    } catch (error) {
      console.error('Failed to handle recommendation action:', error);
    }
  };

  const handleAcceptRecommendation = async (recommendation) => {
    // Navigate to appropriate screen or perform action
    switch (recommendation.category) {
      case 'wellness_task':
        // Navigate to wellness task screen
        break;
      case 'journal_prompt':
        // Navigate to journal screen with prompt
        break;
      case 'breathing_exercise':
        // Navigate to breathing exercise screen
        break;
      case 'peer_suggestion':
        // Handle peer connection
        break;
      default:
        console.log('Accepted recommendation:', recommendation.title);
    }

    // Remove from current recommendations
    setRecommendations(prev => prev.filter(r => r.id !== recommendation.id));
  };

  const handleDismissRecommendation = async (recommendation) => {
    // Track dismissal
    await behaviorLearningService.trackInteraction(
      'recommendation_dismissed',
      {
        recommendationId: recommendation.id,
        reason: 'user_dismissed'
      }
    );

    // Remove from current recommendations
    setRecommendations(prev => prev.filter(r => r.id !== recommendation.id));
  };

  const handleFeedback = async (recommendation, feedback = {}) => {
    await behaviorLearningService.trackInteraction(
      'recommendation_feedback',
      {
        recommendationId: recommendation.id,
        feedback,
        timestamp: Date.now()
      }
    );

    Alert.alert(
      'Feedback Received',
      'Thank you for your feedback! We\'ll use this to improve our recommendations.',
      [{ text: 'OK' }]
    );
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadRecommendations();
    setIsRefreshing(false);
  };

  const renderCategorySection = (categoryName, categoryItems) => {
    if (categoryItems.length === 0) return null;

    return (
      <View key={categoryName} style={styles.categoryContainer}>
        <Text style={styles.categoryTitle}>
          {getCategoryDisplayName(categoryName)}
        </Text>
        {categoryItems.map((rec) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            onAccept={(r) => handleRecommendationAction('accept', r)}
            onDismiss={(r) => handleRecommendationAction('dismiss', r)}
            onFeedback={(r, f) => handleRecommendationAction('feedback', r, f)}
            showFeedback={true}
            compact={compact}
          />
        ))}
      </View>
    );
  };

  const getCategoryDisplayName = (categoryKey) => {
    const names = {
      immediate: '⚡ Immediate Actions',
      wellness: '🧘 Wellness Activities',
      preventive: '🛡️ Preventive Care',
      adaptive: '🎯 Personalized Recommendations'
    };
    return names[categoryKey] || categoryKey;
  };

  if (isLoading && recommendations.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading personalized recommendations...</Text>
      </View>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>💡</Text>
        <Text style={styles.emptyTitle}>No Recommendations Yet</Text>
        <Text style={styles.emptyText}>
          As you use the app more, we'll provide personalized recommendations based on your patterns and preferences.
        </Text>
        <Button
          title="Refresh"
          onPress={loadRecommendations}
          style={styles.refreshButton}
          variant="outline"
        />
      </Card>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {lastRefreshTime && (
        <Text style={styles.lastUpdated}>
          Last updated: {lastRefreshTime.toLocaleTimeString()}
        </Text>
      )}

      {showCategories && Object.keys(categories).length > 0 ? (
        Object.entries(categories).map(([categoryName, categoryItems]) =>
          renderCategorySection(categoryName, categoryItems)
        )
      ) : (
        <View style={styles.recommendationsList}>
          {recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              onAccept={(r) => handleRecommendationAction('accept', r)}
              onDismiss={(r) => handleRecommendationAction('dismiss', r)}
              onFeedback={(r, f) => handleRecommendationAction('feedback', r, f)}
              showFeedback={true}
              compact={compact}
            />
          ))}
        </View>
      )}

      {recommendations.length > 0 && (
        <View style={styles.footer}>
          <Button
            title="Load More"
            onPress={() => loadRecommendations()}
            style={styles.loadMoreButton}
            variant="outline"
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#636e72',
    textAlign: 'center',
  },
  emptyContainer: {
    margin: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#636e72',
    textAlign: 'center',
    lineHeight: 20,
  },
  refreshButton: {
    marginTop: 16,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    padding: 8,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3436',
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  recommendationsList: {
    paddingBottom: 24,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    minWidth: 150,
  },
});

export default RecommendationDisplay;
