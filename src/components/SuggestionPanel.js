import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import recommendationEngine from '../services/recommendationEngine';
import behaviorLearningService from '../services/behaviorLearningService';

const { width: screenWidth } = Dimensions.get('window');

const SuggestionPanel = ({
  userId,
  context = {},
  onSuggestionAction,
  refreshTrigger = 0,
  maxSuggestions = 8,
  showCategories = true,
  compact = false,
  enableAutoRefresh = true
}) => {
  const [suggestions, setSuggestions] = useState({
    content: [],
    exercises: [],
    peers: [],
    activities: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    loadSuggestions();
    
    if (enableAutoRefresh) {
      // Auto-refresh every 15 minutes
      const interval = setInterval(loadSuggestions, 15 * 60 * 1000);
      setRefreshInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [userId, refreshTrigger, enableAutoRefresh]);

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);

      // Get content recommendations
      const contentRecs = await behaviorLearningService.generateContentRecommendations({
        limit: Math.ceil(maxSuggestions * 0.4),
        context
      });

      // Get exercise recommendations
      const exerciseRecs = await recommendationEngine.generateWellnessTaskRecommendations(userId, {
        ...context,
        type: 'exercises'
      });

      // Get peer recommendations
      const peerRecs = await recommendationEngine.generatePeerRecommendations(userId, {
        limit: Math.ceil(maxSuggestions * 0.3),
        context
      });

      // Get activity recommendations
      const activityRecs = await recommendationEngine.generateContextualRecommendations(userId, {
        ...context,
        type: 'activities'
      });

      setSuggestions({
        content: contentRecs?.personalizedContent || [],
        exercises: [
          ...(exerciseRecs?.immediateTasks || []),
          ...(exerciseRecs?.preventiveTasks || [])
        ].slice(0, Math.ceil(maxSuggestions * 0.3)),
        peers: [
          ...(peerRecs?.supportPartners || []),
          ...(peerRecs?.activityPartners || [])
        ].slice(0, Math.ceil(maxSuggestions * 0.2)),
        activities: activityRecs?.recommendations?.proactive || []
      });

      setLastRefreshTime(new Date());

    } catch (error) {
      console.error('Failed to load suggestions:', error);
      Alert.alert('Error', 'Failed to load suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionAction = async (action, suggestion, category) => {
    try {
      // Track the interaction
      await behaviorLearningService.trackInteraction(
        'suggestion_interaction',
        {
          suggestionId: suggestion.id,
          category,
          action,
          suggestionType: suggestion.type || 'general',
          timestamp: Date.now()
        }
      );

      // Call parent handler if provided
      if (onSuggestionAction) {
        onSuggestionAction(action, suggestion, category);
      }

      // Handle specific actions
      switch (action) {
        case 'accept':
          await handleAcceptSuggestion(suggestion, category);
          break;
        case 'dismiss':
          await handleDismissSuggestion(suggestion, category);
          break;
        case 'feedback':
          await handleFeedback(suggestion, category);
          break;
        case 'save':
          await handleSaveSuggestion(suggestion, category);
          break;
      }
    } catch (error) {
      console.error('Failed to handle suggestion action:', error);
    }
  };

  const handleAcceptSuggestion = async (suggestion, category) => {
    // Remove from current suggestions
    setSuggestions(prev => ({
      ...prev,
      [category]: prev[category].filter(s => s.id !== suggestion.id)
    }));

    // Show success feedback
    Alert.alert(
      'Great Choice!',
      `We've noted your interest in "${suggestion.title}". Similar suggestions will be prioritized.`,
      [{ text: 'OK' }]
    );
  };

  const handleDismissSuggestion = async (suggestion, category) => {
    // Track dismissal for learning
    await behaviorLearningService.trackInteraction(
      'suggestion_dismissed',
      {
        suggestionId: suggestion.id,
        category,
        reason: 'user_dismissed'
      }
    );

    // Remove from current suggestions
    setSuggestions(prev => ({
      ...prev,
      [category]: prev[category].filter(s => s.id !== suggestion.id)
    }));
  };

  const handleFeedback = async (suggestion, category) => {
    Alert.alert(
      'Feedback',
      'How would you rate this suggestion?',
      [
        { text: 'Not Helpful', onPress: () => submitFeedback(suggestion, category, 1) },
        { text: 'Somewhat Helpful', onPress: () => submitFeedback(suggestion, category, 3) },
        { text: 'Very Helpful', onPress: () => submitFeedback(suggestion, category, 5) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const submitFeedback = async (suggestion, category, rating) => {
    await behaviorLearningService.trackInteraction(
      'suggestion_feedback',
      {
        suggestionId: suggestion.id,
        category,
        rating,
        timestamp: Date.now()
      }
    );

    Alert.alert(
      'Thank You!',
      'Your feedback helps us provide better suggestions.',
      [{ text: 'OK' }]
    );
  };

  const handleSaveSuggestion = async (suggestion, category) => {
    // This would save to user's favorites or bookmarks
    Alert.alert(
      'Saved!',
      `"${suggestion.title}" has been saved to your favorites.`,
      [{ text: 'OK' }]
    );
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadSuggestions();
    setIsRefreshing(false);
  };

  const renderSuggestionCard = (suggestion, category) => {
    const getSuggestionIcon = () => {
      switch (category) {
        case 'content':
          return suggestion.type === 'article' ? '📖' : '💡';
        case 'exercises':
          return '🧘';
        case 'peers':
          return '👥';
        case 'activities':
          return '🎯';
        default:
          return '✨';
      }
    };

    const getPriorityColor = () => {
      switch (suggestion.priority) {
        case 'high':
          return '#ef4444';
        case 'medium':
          return '#f59e0b';
        case 'low':
          return '#10b981';
        default:
          return '#6366f1';
      }
    };

    if (compact) {
      return (
        <TouchableOpacity
          key={suggestion.id}
          style={styles.compactSuggestionCard}
          onPress={() => handleSuggestionAction('accept', suggestion, category)}
        >
          <Text style={styles.compactIcon}>{getSuggestionIcon()}</Text>
          <View style={styles.compactContent}>
            <Text style={styles.compactTitle} numberOfLines={1}>
              {suggestion.title}
            </Text>
            {suggestion.confidence && (
              <Text style={styles.compactConfidence}>
                {Math.round(suggestion.confidence * 100)}% match
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => handleSuggestionAction('dismiss', suggestion, category)}
            style={styles.compactDismiss}
          >
            <Ionicons name="close" size={16} color="#6b7280" />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }

    return (
      <Card key={suggestion.id} style={styles.suggestionCard}>
        <View style={styles.suggestionHeader}>
          <View style={styles.suggestionHeaderLeft}>
            <Text style={styles.suggestionIcon}>{getSuggestionIcon()}</Text>
            <View style={styles.suggestionTitleContainer}>
              <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
              {suggestion.confidence && (
                <Text style={styles.confidenceText}>
                  {Math.round(suggestion.confidence * 100)}% match
                </Text>
              )}
            </View>
          </View>
          <View
            style={[
              styles.priorityIndicator,
              { backgroundColor: getPriorityColor() }
            ]}
          />
        </View>

        <Text style={styles.suggestionDescription}>
          {suggestion.description || suggestion.reason}
        </Text>

        {suggestion.expectedOutcome && (
          <Text style={styles.outcomeText}>
            Expected: {suggestion.expectedOutcome}
          </Text>
        )}

        <View style={styles.suggestionActions}>
          <Button
            title="Try It"
            onPress={() => handleSuggestionAction('accept', suggestion, category)}
            style={styles.primaryAction}
          />
          <TouchableOpacity
            onPress={() => handleSuggestionAction('save', suggestion, category)}
            style={styles.iconAction}
          >
            <Ionicons name="bookmark-outline" size={20} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSuggestionAction('feedback', suggestion, category)}
            style={styles.iconAction}
          >
            <Ionicons name="thumbs-up-outline" size={20} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSuggestionAction('dismiss', suggestion, category)}
            style={styles.iconAction}
          >
            <Ionicons name="close" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  const renderCategorySection = (categoryKey, categoryItems, categoryTitle) => {
    if (categoryItems.length === 0) return null;

    return (
      <View key={categoryKey} style={styles.categorySection}>
        <Text style={styles.categoryTitle}>{categoryTitle}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categoryItems.map(item => renderSuggestionCard(item, categoryKey))}
        </ScrollView>
      </View>
    );
  };

  if (isLoading && Object.values(suggestions).every(arr => arr.length === 0)) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading personalized suggestions...</Text>
      </View>
    );
  }

  const totalSuggestions = Object.values(suggestions).reduce(
    (total, arr) => total + arr.length, 0
  );

  if (totalSuggestions === 0) {
    return (
      <Card style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🎯</Text>
        <Text style={styles.emptyTitle}>No Suggestions Available</Text>
        <Text style={styles.emptyText}>
          Keep using the app to receive personalized suggestions based on your preferences and patterns.
        </Text>
        <Button
          title="Refresh"
          onPress={loadSuggestions}
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
          Updated: {lastRefreshTime.toLocaleTimeString()}
        </Text>
      )}

      {showCategories ? (
        <>
          {renderCategorySection('content', suggestions.content, '📖 Recommended Content')}
          {renderCategorySection('exercises', suggestions.exercises, '🧘 Wellness Exercises')}
          {renderCategorySection('peers', suggestions.peers, '👥 Peer Connections')}
          {renderCategorySection('activities', suggestions.activities, '🎯 Activities')}
        </>
      ) : (
        <View style={styles.allSuggestions}>
          {Object.entries(suggestions).flatMap(([category, items]) =>
            items.map(item => renderSuggestionCard(item, category))
          )}
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
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3436',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  suggestionCard: {
    width: screenWidth * 0.8,
    padding: 16,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  suggestionHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  suggestionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  suggestionTitleContainer: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3436',
    lineHeight: 20,
  },
  confidenceText: {
    fontSize: 12,
    color: '#20c997',
    marginTop: 4,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#636e72',
    lineHeight: 18,
    marginBottom: 12,
  },
  outcomeText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  suggestionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryAction: {
    flex: 1,
  },
  iconAction: {
    padding: 8,
  },
  compactSuggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  compactIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d3436',
  },
  compactConfidence: {
    fontSize: 12,
    color: '#20c997',
    marginTop: 2,
  },
  compactDismiss: {
    padding: 4,
  },
  allSuggestions: {
    padding: 16,
    gap: 12,
  },
});

export default SuggestionPanel;