import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
  Animated,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Card from './Card';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import RecommendationCard from './RecommendationCard';
import PeerCompatibilityCard from './PeerCompatibilityCard';
import RecommendationFeedbackModal from './RecommendationFeedbackModal';
import recommendationEngine from '../services/recommendationEngine';
import behaviorLearningService from '../services/behaviorLearningService';
import recommendationRefreshService from '../services/recommendationRefreshService';

const { width: screenWidth } = Dimensions.get('window');

const RecommendationDeliverySystem = ({
  userId,
  onNavigate,
  refreshTrigger = 0,
  showCategories = true,
  enableAutoRefresh = true,
  maxRecommendations = 10
}) => {
  const [recommendations, setRecommendations] = useState({
    content: [],
    exercises: [],
    peers: [],
    activities: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [feedbackModal, setFeedbackModal] = useState({
    visible: false,
    recommendation: null
  });
  const [refreshStats, setRefreshStats] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(null);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    initializeRecommendationSystem();
    
    return () => {
      recommendationRefreshService.stopRefresh(userId);
    };
  }, [userId]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      handleManualRefresh();
    }
  }, [refreshTrigger]);

  const initializeRecommendationSystem = async () => {
    try {
      setIsLoading(true);

      // Load initial recommendations
      await loadRecommendations();

      // Start adaptive refresh if enabled
      if (enableAutoRefresh) {
        const refreshResult = await recommendationRefreshService.startAdaptiveRefresh(userId, {
          onRefresh: handleAutoRefresh
        });
        
        if (refreshResult.success) {
          console.log(`Adaptive refresh started with ${refreshResult.interval}ms interval`);
        }
      }

      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

    } catch (error) {
      console.error('Failed to initialize recommendation system:', error);
      Alert.alert('Error', 'Failed to load recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const context = await behaviorLearningService.getCurrentContext();

      // Load content recommendations
      const contentRecs = await behaviorLearningService.generateContentRecommendations({
        limit: Math.ceil(maxRecommendations * 0.4),
        context
      });

      // Load exercise recommendations
      const exerciseRecs = await recommendationEngine.generateWellnessTaskRecommendations(userId, {
        ...context,
        type: 'exercises'
      });

      // Load peer recommendations
      const peerRecs = await recommendationEngine.generatePeerRecommendations(userId, {
        limit: Math.ceil(maxRecommendations * 0.3),
        context
      });

      // Load activity recommendations
      const activityRecs = await recommendationEngine.generateContextualRecommendations(userId, {
        ...context,
        type: 'activities'
      });

      setRecommendations({
        content: contentRecs?.personalizedContent || [],
        exercises: [
          ...(exerciseRecs?.immediateTasks || []),
          ...(exerciseRecs?.preventiveTasks || [])
        ].slice(0, Math.ceil(maxRecommendations * 0.3)),
        peers: [
          ...(peerRecs?.supportPartners || []),
          ...(peerRecs?.activityPartners || [])
        ].slice(0, Math.ceil(maxRecommendations * 0.2)),
        activities: activityRecs?.recommendations?.proactive || []
      });

      setLastRefreshTime(new Date());
      
      // Update refresh stats
      const stats = recommendationRefreshService.getRefreshStatistics(userId);
      setRefreshStats(stats);

    } catch (error) {
      console.error('Failed to load recommendations:', error);
      throw error;
    }
  };

  const handleAutoRefresh = useCallback(async (refreshResults) => {
    try {
      // Update recommendations based on refresh results
      if (refreshResults.content?.success) {
        setRecommendations(prev => ({
          ...prev,
          content: refreshResults.content.data?.personalizedContent || prev.content
        }));
      }

      if (refreshResults.peers?.success) {
        setRecommendations(prev => ({
          ...prev,
          peers: [
            ...(refreshResults.peers.data?.supportPartners || []),
            ...(refreshResults.peers.data?.activityPartners || [])
          ].slice(0, Math.ceil(maxRecommendations * 0.2))
        }));
      }

      if (refreshResults.exercises?.success) {
        setRecommendations(prev => ({
          ...prev,
          exercises: [
            ...(refreshResults.exercises.data?.immediateTasks || []),
            ...(refreshResults.exercises.data?.preventiveTasks || [])
          ].slice(0, Math.ceil(maxRecommendations * 0.3))
        }));
      }

      if (refreshResults.activities?.success) {
        setRecommendations(prev => ({
          ...prev,
          activities: refreshResults.activities.data?.recommendations?.proactive || prev.activities
        }));
      }

      setLastRefreshTime(new Date());
      
      // Update refresh stats
      const stats = recommendationRefreshService.getRefreshStatistics(userId);
      setRefreshStats(stats);

    } catch (error) {
      console.error('Failed to handle auto refresh:', error);
    }
  }, [userId, maxRecommendations]);

  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      
      const refreshResult = await recommendationRefreshService.triggerManualRefresh(userId);
      
      if (refreshResult.success) {
        await handleAutoRefresh(refreshResult.results);
      } else {
        // Fallback to full reload
        await loadRecommendations();
      }
    } catch (error) {
      console.error('Failed to perform manual refresh:', error);
      Alert.alert('Error', 'Failed to refresh recommendations. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRecommendationAction = async (action, recommendation, category) => {
    try {
      // Track the interaction
      await behaviorLearningService.trackInteraction(
        'recommendation_action',
        {
          recommendationId: recommendation.id,
          category,
          action,
          timestamp: Date.now()
        }
      );

      // Track in recommendation engine
      await recommendationEngine.trackRecommendationEngagement(
        userId,
        recommendation.id,
        action,
        {
          category,
          recommendationType: recommendation.type || 'general',
          priority: recommendation.priority
        }
      );

      switch (action) {
        case 'accept':
          await handleAcceptRecommendation(recommendation, category);
          break;
        case 'dismiss':
          await handleDismissRecommendation(recommendation, category);
          break;
        case 'feedback':
          setFeedbackModal({
            visible: true,
            recommendation: { ...recommendation, category }
          });
          break;
        case 'save':
          await handleSaveRecommendation(recommendation, category);
          break;
      }
    } catch (error) {
      console.error('Failed to handle recommendation action:', error);
    }
  };

  const handleAcceptRecommendation = async (recommendation, category) => {
    // Navigate to appropriate screen based on category and type
    switch (category) {
      case 'exercises':
        if (recommendation.type === 'breathing') {
          onNavigate?.('BreathingExercise', { exercise: recommendation });
        } else if (recommendation.type === 'mindfulness') {
          onNavigate?.('MindfulnessExercise', { exercise: recommendation });
        }
        break;
      case 'content':
        if (recommendation.type === 'journal_prompt') {
          onNavigate?.('Journal', { prompt: recommendation.title });
        } else if (recommendation.type === 'article') {
          onNavigate?.('ContentViewer', { content: recommendation });
        }
        break;
      case 'peers':
        onNavigate?.('PeerProfile', { peerId: recommendation.id });
        break;
      case 'activities':
        if (recommendation.type === 'social_scenario') {
          onNavigate?.('SocialScenarioPlanner', { scenario: recommendation });
        } else if (recommendation.type === 'habit_challenge') {
          onNavigate?.('HabitTracker', { challenge: recommendation });
        }
        break;
    }

    // Remove from current recommendations
    setRecommendations(prev => ({
      ...prev,
      [category]: prev[category].filter(r => r.id !== recommendation.id)
    }));
  };

  const handleDismissRecommendation = async (recommendation, category) => {
    // Remove from current recommendations
    setRecommendations(prev => ({
      ...prev,
      [category]: prev[category].filter(r => r.id !== recommendation.id)
    }));
  };

  const handleSaveRecommendation = async (recommendation, category) => {
    Alert.alert(
      'Saved!',
      `"${recommendation.title}" has been saved to your favorites.`,
      [{ text: 'OK' }]
    );
  };

  const handlePeerConnect = async (peer) => {
    try {
      // This would integrate with the peer connection system
      Alert.alert(
        'Connection Request Sent',
        `Your connection request has been sent to ${peer.display_name || 'this user'}.`,
        [{ text: 'OK' }]
      );

      // Remove from recommendations after connecting
      setRecommendations(prev => ({
        ...prev,
        peers: prev.peers.filter(p => p.id !== peer.id)
      }));
    } catch (error) {
      console.error('Failed to connect with peer:', error);
      Alert.alert('Error', 'Failed to send connection request. Please try again.');
    }
  };

  const handleFeedbackSubmitted = async (feedback) => {
    try {
      const { recommendation } = feedbackModal;
      
      // Track feedback
      await recommendationEngine.trackRecommendationEngagement(
        userId,
        recommendation.id,
        'feedback',
        {
          category: recommendation.category,
          rating: feedback.rating,
          feedbackType: feedback.type,
          comments: feedback.comments,
          effectiveness: feedback.rating / 5 // Convert to 0-1 scale
        }
      );

      setFeedbackModal({ visible: false, recommendation: null });
      
      Alert.alert(
        'Thank You!',
        'Your feedback helps us provide better recommendations.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  };

  const renderCategoryTabs = () => {
    const categories = [
      { key: 'all', label: 'All', icon: 'apps' },
      { key: 'content', label: 'Content', icon: 'book' },
      { key: 'exercises', label: 'Exercises', icon: 'fitness' },
      { key: 'peers', label: 'Peers', icon: 'people' },
      { key: 'activities', label: 'Activities', icon: 'star' }
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryTabs}
        contentContainerStyle={styles.categoryTabsContent}
      >
        {categories.map(category => {
          const isSelected = selectedCategory === category.key;
          const count = category.key === 'all' 
            ? Object.values(recommendations).reduce((sum, arr) => sum + arr.length, 0)
            : recommendations[category.key]?.length || 0;

          return (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryTab,
                isSelected && styles.categoryTabSelected
              ]}
              onPress={() => setSelectedCategory(category.key)}
            >
              <Ionicons
                name={category.icon}
                size={16}
                color={isSelected ? '#6366f1' : '#6b7280'}
              />
              <Text style={[
                styles.categoryTabText,
                isSelected && styles.categoryTabTextSelected
              ]}>
                {category.label}
              </Text>
              {count > 0 && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const renderRecommendationSection = (categoryKey, categoryItems, categoryTitle) => {
    if (categoryItems.length === 0) return null;

    return (
      <View key={categoryKey} style={styles.recommendationSection}>
        <Text style={styles.sectionTitle}>{categoryTitle}</Text>
        {categoryKey === 'peers' ? (
          categoryItems.map(peer => (
            <PeerCompatibilityCard
              key={peer.id}
              peer={peer}
              onConnect={handlePeerConnect}
              onDismiss={(p) => handleRecommendationAction('dismiss', p, 'peers')}
              onViewProfile={(p) => onNavigate?.('PeerProfile', { peerId: p.id })}
              showCompatibilityDetails={true}
            />
          ))
        ) : (
          categoryItems.map(recommendation => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              onAccept={(r) => handleRecommendationAction('accept', r, categoryKey)}
              onDismiss={(r) => handleRecommendationAction('dismiss', r, categoryKey)}
              onFeedback={(r) => handleRecommendationAction('feedback', r, categoryKey)}
              showFeedback={true}
            />
          ))
        )}
      </View>
    );
  };

  const getFilteredRecommendations = () => {
    if (selectedCategory === 'all') {
      return recommendations;
    }
    return {
      [selectedCategory]: recommendations[selectedCategory] || []
    };
  };

  const getTotalRecommendations = () => {
    return Object.values(recommendations).reduce((sum, arr) => sum + arr.length, 0);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading personalized recommendations...</Text>
      </View>
    );
  }

  const totalRecommendations = getTotalRecommendations();

  if (totalRecommendations === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyTitle}>No Recommendations Available</Text>
          <Text style={styles.emptyText}>
            Keep using the app to receive personalized recommendations based on your preferences and patterns.
          </Text>
          <Button
            title="Refresh"
            onPress={handleManualRefresh}
            style={styles.refreshButton}
            variant="outline"
          />
        </Card>
      </View>
    );
  }

  const filteredRecommendations = getFilteredRecommendations();

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recommendations</Text>
        <View style={styles.headerActions}>
          {refreshStats && (
            <Text style={styles.refreshStats}>
              {refreshStats.totalRefreshes} refreshes
            </Text>
          )}
          <TouchableOpacity
            onPress={handleManualRefresh}
            style={styles.refreshButton}
            disabled={isRefreshing}
          >
            <Ionicons
              name="refresh"
              size={20}
              color={isRefreshing ? '#9ca3af' : '#6366f1'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {showCategories && renderCategoryTabs()}

      {lastRefreshTime && (
        <Text style={styles.lastUpdated}>
          Last updated: {lastRefreshTime.toLocaleTimeString()}
        </Text>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleManualRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {selectedCategory === 'all' ? (
          <>
            {renderRecommendationSection('content', filteredRecommendations.content, '📖 Recommended Content')}
            {renderRecommendationSection('exercises', filteredRecommendations.exercises, '🧘 Wellness Exercises')}
            {renderRecommendationSection('peers', filteredRecommendations.peers, '👥 Peer Connections')}
            {renderRecommendationSection('activities', filteredRecommendations.activities, '🎯 Activities')}
          </>
        ) : (
          Object.entries(filteredRecommendations).map(([categoryKey, categoryItems]) =>
            renderRecommendationSection(categoryKey, categoryItems, getCategoryTitle(categoryKey))
          )
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Showing {totalRecommendations} personalized recommendations
          </Text>
        </View>
      </ScrollView>

      <RecommendationFeedbackModal
        visible={feedbackModal.visible}
        onClose={() => setFeedbackModal({ visible: false, recommendation: null })}
        recommendation={feedbackModal.recommendation}
        onFeedbackSubmitted={handleFeedbackSubmitted}
      />
    </Animated.View>
  );
};

const getCategoryTitle = (categoryKey) => {
  const titles = {
    content: '📖 Recommended Content',
    exercises: '🧘 Wellness Exercises',
    peers: '👥 Peer Connections',
    activities: '🎯 Activities'
  };
  return titles[categoryKey] || categoryKey;
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    width: '100%',
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
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d3436',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshStats: {
    fontSize: 12,
    color: '#6b7280',
  },
  refreshButton: {
    padding: 8,
  },
  categoryTabs: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  categoryTabSelected: {
    backgroundColor: '#e0e7ff',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  categoryTabTextSelected: {
    color: '#6366f1',
  },
  categoryBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    padding: 8,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  recommendationSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3436',
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 16,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default RecommendationDeliverySystem;