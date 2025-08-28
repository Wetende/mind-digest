import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import habitTrackingService from '../services/habitTrackingService';
import HabitTracker from '../components/HabitTracker';
import HabitChallengeCard from '../components/HabitChallengeCard';
import PointsAnimation from '../components/PointsAnimation';
import HabitTrackingDemo from '../components/HabitTrackingDemo';
import LoadingSpinner from '../components/LoadingSpinner';
import { colors, spacing, typography } from '../theme';

const HabitTrackingScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [availableChallenges, setAvailableChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pointsAnimation, setPointsAnimation] = useState({
    visible: false,
    points: 0,
    type: 'points',
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [statsResult, challengesResult] = await Promise.all([
        habitTrackingService.getUserStats(user.id),
        habitTrackingService.getUserChallenges(user.id),
      ]);

      setUserStats(statsResult);
      
      if (challengesResult.success) {
        setChallenges(challengesResult.data);
      }

      // Get available challenges based on user level
      const available = habitTrackingService.getAvailableChallenges(
        statsResult?.level || 1
      ).filter(challenge => 
        !challengesResult.data?.some(c => 
          c.challenge_id === challenge.id && c.status === 'active'
        )
      );
      setAvailableChallenges(available);
      
    } catch (error) {
      console.error('Error loading habit data:', error);
      Alert.alert('Error', 'Failed to load habit tracking data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStartChallenge = async (challengeId) => {
    try {
      const result = await habitTrackingService.startChallenge(user.id, challengeId);
      
      if (result.success) {
        // Show success animation
        setPointsAnimation({
          visible: true,
          points: 0,
          type: 'challenge_start',
        });
        
        Alert.alert(
          'Challenge Started! 🎯',
          'Good luck with your new challenge!',
          [{ text: 'OK', onPress: loadData }]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start challenge');
    }
  };

  const handleTestActivity = async (activityType) => {
    try {
      const result = await habitTrackingService.awardPoints(
        user.id, 
        activityType, 
        { test: true }
      );
      
      if (result.success) {
        setPointsAnimation({
          visible: true,
          points: result.data.pointsEarned,
          type: 'points',
        });
        
        // Reload data to show updated stats
        setTimeout(loadData, 1000);
      }
    } catch (error) {
      console.error('Error testing activity:', error);
    }
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText}>Habit Tracking</Text>
          <Text style={styles.headerSubtitle}>
            Build healthy habits and earn rewards
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => {
            Alert.alert(
              'How It Works',
              'Complete wellness activities to earn points, unlock badges, and level up! Take on challenges to accelerate your progress.',
              [{ text: 'Got it!' }]
            );
          }}
        >
          <Ionicons name="information-circle" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <Text style={styles.sectionTitle}>Quick Test Actions</Text>
      <Text style={styles.sectionSubtitle}>
        Test the habit tracking system (for demo purposes)
      </Text>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleTestActivity('MOOD_LOG')}
        >
          <Ionicons name="happy" size={20} color={colors.primary} />
          <Text style={styles.actionButtonText}>Log Mood</Text>
          <Text style={styles.actionButtonPoints}>+10 pts</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleTestActivity('JOURNAL_ENTRY')}
        >
          <Ionicons name="book" size={20} color={colors.primary} />
          <Text style={styles.actionButtonText}>Journal</Text>
          <Text style={styles.actionButtonPoints}>+15 pts</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleTestActivity('BREATHING_EXERCISE')}
        >
          <Ionicons name="leaf" size={20} color={colors.primary} />
          <Text style={styles.actionButtonText}>Breathe</Text>
          <Text style={styles.actionButtonPoints}>+12 pts</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleTestActivity('SOCIAL_INTERACTION')}
        >
          <Ionicons name="people" size={20} color={colors.primary} />
          <Text style={styles.actionButtonText}>Social</Text>
          <Text style={styles.actionButtonPoints}>+18 pts</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderActiveChallenges = () => {
    const activeChallenges = challenges.filter(c => c.status === 'active');
    
    if (activeChallenges.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Challenges</Text>
        {activeChallenges.map((challenge, index) => (
          <HabitChallengeCard
            key={index}
            challenge={challenge.challenge_data}
            isActive={true}
            progress={challenge.current_progress}
            onView={(challenge) => {
              Alert.alert(
                challenge.title,
                `Progress: ${challenge.current_progress}/${challenge.target_progress}\n\n${challenge.description}`,
                [{ text: 'OK' }]
              );
            }}
          />
        ))}
      </View>
    );
  };

  const renderAvailableChallenges = () => {
    if (availableChallenges.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Challenges</Text>
        <Text style={styles.sectionSubtitle}>
          Take on new challenges to accelerate your progress
        </Text>
        
        {availableChallenges.slice(0, 3).map((challenge, index) => (
          <HabitChallengeCard
            key={index}
            challenge={challenge}
            isActive={false}
            onStart={handleStartChallenge}
          />
        ))}
        
        {availableChallenges.length > 3 && (
          <TouchableOpacity style={styles.viewMoreButton}>
            <Text style={styles.viewMoreText}>
              View {availableChallenges.length - 3} more challenges
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading your habit progress...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <HabitTrackingDemo />
        <HabitTracker onPointsEarned={loadData} />
        {renderQuickActions()}
        {renderActiveChallenges()}
        {renderAvailableChallenges()}
      </ScrollView>

      <PointsAnimation
        points={pointsAnimation.points}
        visible={pointsAnimation.visible}
        type={pointsAnimation.type}
        onComplete={() => setPointsAnimation({ ...pointsAnimation, visible: false })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    paddingTop: 50,
    paddingBottom: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  headerTitleText: {
    ...typography.h2,
    color: colors.white,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  infoButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
  },
  section: {
    margin: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  quickActions: {
    margin: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    width: '48%',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  actionButtonPoints: {
    ...typography.small,
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  viewMoreText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: 'bold',
    marginRight: spacing.xs,
  },
});

export default HabitTrackingScreen;