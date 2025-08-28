import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import habitTrackingService from '../services/habitTrackingService';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, typography } from '../theme';
import LoadingSpinner from './LoadingSpinner';

const HabitTracker = ({ onPointsEarned }) => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState(null);
  const [badges, setBadges] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadHabitData();
    }
  }, [user]);

  const loadHabitData = async () => {
    try {
      setLoading(true);
      
      const [statsResult, badgesResult, challengesResult, insightsResult] = await Promise.all([
        habitTrackingService.getUserStats(user.id),
        habitTrackingService.getUserBadges(user.id),
        habitTrackingService.getUserChallenges(user.id),
        habitTrackingService.getHabitInsights(user.id),
      ]);

      setUserStats(statsResult);
      
      if (badgesResult.success) {
        setBadges(badgesResult.data);
      }
      
      if (challengesResult.success) {
        setChallenges(challengesResult.data);
      }
      
      if (insightsResult.success) {
        setInsights(insightsResult.data);
      }
    } catch (error) {
      console.error('Error loading habit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChallenge = async (challengeId) => {
    try {
      const result = await habitTrackingService.startChallenge(user.id, challengeId);
      
      if (result.success) {
        Alert.alert(
          'Challenge Started! 🎯',
          'Good luck with your new challenge!',
          [{ text: 'OK', onPress: loadHabitData }]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start challenge');
    }
  };

  const renderStatsCard = () => (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      style={styles.statsCard}
    >
      <View style={styles.statsHeader}>
        <Ionicons name="trophy" size={24} color={colors.white} />
        <Text style={styles.statsTitle}>Your Progress</Text>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userStats?.level || 1}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userStats?.total_points || 0}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userStats?.current_streak || 0}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{userStats?.total_activities || 0}</Text>
          <Text style={styles.statLabel}>Activities</Text>
        </View>
      </View>
      
      {insights && (
        <View style={styles.progressBar}>
          <Text style={styles.progressText}>
            Level {insights.level} Progress
          </Text>
          <View style={styles.progressTrack}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min(100, (insights.totalPoints % 50) * 2)}%` }
              ]} 
            />
          </View>
        </View>
      )}
    </LinearGradient>
  );

  const renderBadges = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Badges Earned ({badges.length})</Text>
      
      {badges.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="medal-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Complete activities to earn badges!</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.badgesList}>
            {badges.map((badge, index) => (
              <View key={index} style={styles.badgeCard}>
                <Ionicons 
                  name={badge.badge_data.icon} 
                  size={32} 
                  color={colors.primary} 
                />
                <Text style={styles.badgeName}>{badge.badge_data.name}</Text>
                <Text style={styles.badgeDescription}>
                  {badge.badge_data.description}
                </Text>
                <Text style={styles.badgePoints}>
                  +{badge.badge_data.points} pts
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );

  const renderChallenges = () => {
    const activeChallenges = challenges.filter(c => c.status === 'active');
    const availableChallenges = habitTrackingService.getAvailableChallenges(
      userStats?.level || 1
    ).filter(challenge => 
      !challenges.some(c => c.challenge_id === challenge.id && c.status === 'active')
    );

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Challenges</Text>
        
        {activeChallenges.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Active Challenges</Text>
            {activeChallenges.map((challenge, index) => (
              <View key={index} style={styles.challengeCard}>
                <View style={styles.challengeHeader}>
                  <Text style={styles.challengeTitle}>
                    {challenge.challenge_data.title}
                  </Text>
                  <Text style={styles.challengeProgress}>
                    {challenge.current_progress}/{challenge.target_progress}
                  </Text>
                </View>
                
                <Text style={styles.challengeDescription}>
                  {challenge.challenge_data.description}
                </Text>
                
                <View style={styles.challengeProgressBar}>
                  <View 
                    style={[
                      styles.challengeProgressFill,
                      { 
                        width: `${(challenge.current_progress / challenge.target_progress) * 100}%` 
                      }
                    ]} 
                  />
                </View>
                
                <Text style={styles.challengeReward}>
                  Reward: {challenge.challenge_data.points} points
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {availableChallenges.length > 0 && (
          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>Available Challenges</Text>
            {availableChallenges.slice(0, 3).map((challenge, index) => (
              <TouchableOpacity
                key={index}
                style={styles.availableChallengeCard}
                onPress={() => handleStartChallenge(challenge.id)}
              >
                <View style={styles.challengeHeader}>
                  <Text style={styles.challengeTitle}>{challenge.title}</Text>
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </View>
                
                <Text style={styles.challengeDescription}>
                  {challenge.description}
                </Text>
                
                <View style={styles.challengeDetails}>
                  <Text style={styles.challengeDetail}>
                    🎯 Target: {challenge.target}
                  </Text>
                  <Text style={styles.challengeDetail}>
                    ⏱️ Duration: {challenge.duration} days
                  </Text>
                  <Text style={styles.challengeDetail}>
                    🏆 Reward: {challenge.points} points
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderInsights = () => {
    if (!insights || !insights.recommendations.length) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Insights & Recommendations</Text>
        
        {insights.recommendations.map((rec, index) => (
          <View key={index} style={styles.insightCard}>
            <Ionicons 
              name="bulb-outline" 
              size={20} 
              color={colors.primary} 
              style={styles.insightIcon}
            />
            <View style={styles.insightContent}>
              <Text style={styles.insightMessage}>{rec.message}</Text>
              <Text style={styles.insightAction}>{rec.action}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading your progress...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderStatsCard()}
      {renderBadges()}
      {renderChallenges()}
      {renderInsights()}
    </ScrollView>
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
  statsCard: {
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: 16,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statsTitle: {
    ...typography.h3,
    color: colors.white,
    marginLeft: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.white,
    fontWeight: 'bold',
  },
  statLabel: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  progressBar: {
    marginTop: spacing.md,
  },
  progressText: {
    ...typography.caption,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: 3,
  },
  section: {
    margin: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  subsection: {
    marginBottom: spacing.lg,
  },
  subsectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  badgesList: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
  },
  badgeCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginRight: spacing.sm,
    alignItems: 'center',
    width: 120,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  badgeName: {
    ...typography.caption,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  badgeDescription: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  badgePoints: {
    ...typography.small,
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  challengeCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  availableChallengeCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  challengeTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    flex: 1,
  },
  challengeProgress: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: 'bold',
  },
  challengeDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  challengeProgressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  challengeProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  challengeReward: {
    ...typography.caption,
    color: colors.success,
    fontWeight: 'bold',
  },
  challengeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  challengeDetail: {
    ...typography.small,
    color: colors.textSecondary,
  },
  insightCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  insightIcon: {
    marginRight: spacing.sm,
    marginTop: spacing.xs,
  },
  insightContent: {
    flex: 1,
  },
  insightMessage: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  insightAction: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: 'bold',
  },
});

export default HabitTracker;