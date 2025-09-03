import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { ENV } from '../config/env';

const HabitTrackingDemo = () => {
  const [userStats, setUserStats] = useState({
    level: 1,
    totalPoints: 0,
    currentStreak: 0,
    totalActivities: 0,
  });

  const [badges, setBadges] = useState([]);
  const [activities, setActivities] = useState([]);

  const demoActivities = [
    { type: 'MOOD_LOG', name: 'Log Mood', points: 10, icon: 'happy' },
    { type: 'JOURNAL_ENTRY', name: 'Journal Entry', points: 15, icon: 'book' },
    { type: 'BREATHING_EXERCISE', name: 'Breathing Exercise', points: 12, icon: 'leaf' },
    { type: 'SOCIAL_INTERACTION', name: 'Social Activity', points: 18, icon: 'people' },
  ];

  const demoBadges = {
    FIRST_STEPS: {
      name: 'First Steps',
      description: 'Complete your first wellness activity',
      icon: 'footsteps-outline',
      points: 25,
    },
    WEEK_WARRIOR: {
      name: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: 'trophy-outline',
      points: 100,
    },
    CONSISTENCY_CHAMPION: {
      name: 'Consistency Champion',
      description: 'Complete 30 wellness activities',
      icon: 'medal-outline',
      points: 200,
    },
  };

  const simulateActivity = (activityType) => {
    const activity = demoActivities.find(a => a.type === activityType);
    if (!activity) return;

    // Add activity to history
    const newActivity = {
      ...activity,
      timestamp: new Date().toISOString(),
      id: Date.now(),
    };
    setActivities(prev => [newActivity, ...prev.slice(0, 9)]); // Keep last 10

    // Update stats
    const newTotalActivities = userStats.totalActivities + 1;
    const newTotalPoints = userStats.totalPoints + activity.points;
    const newLevel = calculateLevel(newTotalPoints);
    const newStreak = userStats.currentStreak + 1;

    setUserStats({
      level: newLevel,
      totalPoints: newTotalPoints,
      currentStreak: newStreak,
      totalActivities: newTotalActivities,
    });

    // Check for badge achievements
    checkBadgeAchievements(newTotalActivities, newStreak);

    Alert.alert(
      'Activity Completed! 🎉',
      `You earned ${activity.points} points!\n\nTotal Points: ${newTotalPoints}\nLevel: ${newLevel}`,
      [{ text: 'Great!' }]
    );
  };

  const calculateLevel = (totalPoints) => {
    if (totalPoints < 100) return 1;
    return Math.floor((totalPoints - 100) / 50) + 2;
  };

  const checkBadgeAchievements = (totalActivities, currentStreak) => {
    const newBadges = [...badges];

    // First Steps badge
    if (totalActivities === 1 && !badges.some(b => b.key === 'FIRST_STEPS')) {
      newBadges.push({ key: 'FIRST_STEPS', ...demoBadges.FIRST_STEPS });
      Alert.alert('New Badge! 🏆', `You earned the "${demoBadges.FIRST_STEPS.name}" badge!`);
    }

    // Week Warrior badge
    if (currentStreak >= 7 && !badges.some(b => b.key === 'WEEK_WARRIOR')) {
      newBadges.push({ key: 'WEEK_WARRIOR', ...demoBadges.WEEK_WARRIOR });
      Alert.alert('New Badge! 🏆', `You earned the "${demoBadges.WEEK_WARRIOR.name}" badge!`);
    }

    // Consistency Champion badge
    if (totalActivities >= 30 && !badges.some(b => b.key === 'CONSISTENCY_CHAMPION')) {
      newBadges.push({ key: 'CONSISTENCY_CHAMPION', ...demoBadges.CONSISTENCY_CHAMPION });
      Alert.alert('New Badge! 🏆', `You earned the "${demoBadges.CONSISTENCY_CHAMPION.name}" badge!`);
    }

    setBadges(newBadges);
  };

  const resetDemo = () => {
    setUserStats({
      level: 1,
      totalPoints: 0,
      currentStreak: 0,
      totalActivities: 0,
    });
    setBadges([]);
    setActivities([]);
    Alert.alert('Demo Reset', 'All progress has been reset for demo purposes.');
  };

  const simulateStreakBreak = () => {
    Alert.alert(
      'Streak Broken! 😔',
      'Oh no! Your streak has been broken. But don\'t worry - your accountability partners have been notified and are here to support you!\n\n💙 Social support activated\n🎯 Recovery challenge available\n💪 You can bounce back stronger!',
      [
        { text: 'Thanks for the support!' },
      ]
    );
  };

  const simulateProgressShare = () => {
    Alert.alert(
      'Progress Shared! 📢',
      'Your progress has been shared with your accountability partners!\n\n🎉 Level 2 achievement\n⭐ 150 total points\n🔥 5-day streak\n\nYour partners are cheering you on!',
      [
        { text: 'Awesome!' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Habit Tracking Demo</Text>
      <Text style={styles.subtitle}>
        Test the gamified habit tracking system
      </Text>

      {/* Stats Display */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Your Progress</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.level}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.totalPoints}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.currentStreak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{userStats.totalActivities}</Text>
            <Text style={styles.statLabel}>Activities</Text>
          </View>
        </View>
      </View>

      {/* Activity Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Complete Activities</Text>
        <View style={styles.activityGrid}>
          {demoActivities.map((activity) => (
            <TouchableOpacity
              key={activity.type}
              style={styles.activityButton}
              onPress={() => simulateActivity(activity.type)}
            >
              <Ionicons name={activity.icon} size={24} color={colors.primary} />
              <Text style={styles.activityName}>{activity.name}</Text>
              <Text style={styles.activityPoints}>+{activity.points} pts</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Badges */}
      {badges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges Earned ({badges.length})</Text>
          <View style={styles.badgesContainer}>
            {badges.map((badge, index) => (
              <View key={index} style={styles.badgeCard}>
                <Ionicons name={badge.icon} size={32} color={colors.warning} />
                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgePoints}>+{badge.points} pts</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recent Activities */}
      {activities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          {activities.slice(0, 5).map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <Ionicons name={activity.icon} size={20} color={colors.primary} />
              <Text style={styles.activityItemName}>{activity.name}</Text>
              <Text style={styles.activityItemPoints}>+{activity.points}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Social Features Demo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Social Accountability Features</Text>
        <View style={styles.socialButtons}>
          <TouchableOpacity style={styles.socialButton} onPress={simulateProgressShare}>
            <Ionicons name="share" size={20} color={colors.primary} />
            <Text style={styles.socialButtonText}>Share Progress</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.socialButton} onPress={simulateStreakBreak}>
            <Ionicons name="heart-dislike" size={20} color={colors.error} />
            <Text style={styles.socialButtonText}>Break Streak (Support)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reset Button */}
      <TouchableOpacity style={styles.resetButton} onPress={resetDemo}>
        <Text style={styles.resetButtonText}>Reset Demo</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  statsCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.lg,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: 'bold',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  activityButton: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    width: '48%',
    marginBottom: spacing.sm,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  activityName: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  activityPoints: {
    ...typography.small,
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    width: '30%',
    marginBottom: spacing.sm,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  badgeName: {
    ...typography.small,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  badgePoints: {
    ...typography.small,
    color: colors.warning,
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  activityItemName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    marginLeft: spacing.sm,
  },
  activityItemPoints: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: colors.error,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resetButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: 'bold',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  socialButton: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    width: '48%',
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  socialButtonText: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

// COMPLETELY REMOVE FROM PRODUCTION - No mocks allowed
export default () => null;
