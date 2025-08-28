import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../theme';

const HabitChallengeCard = ({ 
  challenge, 
  isActive = false, 
  progress = 0, 
  onStart, 
  onView 
}) => {
  const progressPercentage = isActive ? (progress / challenge.target) * 100 : 0;
  const isCompleted = progressPercentage >= 100;

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner':
        return colors.success;
      case 'intermediate':
        return colors.warning;
      case 'advanced':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  const getDifficultyIcon = (difficulty) => {
    switch (difficulty) {
      case 'beginner':
        return 'leaf-outline';
      case 'intermediate':
        return 'flame-outline';
      case 'advanced':
        return 'flash-outline';
      default:
        return 'star-outline';
    }
  };

  const handlePress = () => {
    if (isActive) {
      if (onView) onView(challenge);
    } else {
      Alert.alert(
        'Start Challenge',
        `Are you ready to start "${challenge.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Start', 
            onPress: () => {
              if (onStart) onStart(challenge.id);
            }
          },
        ]
      );
    }
  };

  const renderActiveChallenge = () => (
    <TouchableOpacity style={styles.activeCard} onPress={handlePress}>
      <LinearGradient
        colors={isCompleted ? [colors.success, colors.successDark] : [colors.primary, colors.primaryDark]}
        style={styles.activeGradient}
      >
        <View style={styles.activeHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.activeTitle}>{challenge.title}</Text>
            <Text style={styles.activeDescription}>{challenge.description}</Text>
          </View>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {progress}/{challenge.target}
            </Text>
            {isCompleted && (
              <Ionicons name="checkmark-circle" size={24} color={colors.white} />
            )}
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min(100, progressPercentage)}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressPercentage}>
            {Math.round(progressPercentage)}%
          </Text>
        </View>

        <View style={styles.activeFooter}>
          <View style={styles.rewardContainer}>
            <Ionicons name="trophy" size={16} color={colors.white} />
            <Text style={styles.rewardText}>{challenge.points} points</Text>
          </View>
          <View style={styles.durationContainer}>
            <Ionicons name="time" size={16} color={colors.white} />
            <Text style={styles.durationText}>{challenge.duration} days</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderAvailableChallenge = () => (
    <TouchableOpacity style={styles.availableCard} onPress={handlePress}>
      <View style={styles.availableHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.availableTitle}>{challenge.title}</Text>
          <View style={styles.difficultyBadge}>
            <Ionicons 
              name={getDifficultyIcon(challenge.difficulty)} 
              size={12} 
              color={getDifficultyColor(challenge.difficulty)} 
            />
            <Text style={[
              styles.difficultyText, 
              { color: getDifficultyColor(challenge.difficulty) }
            ]}>
              {challenge.difficulty}
            </Text>
          </View>
        </View>
        <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
      </View>

      <Text style={styles.availableDescription}>{challenge.description}</Text>

      <View style={styles.challengeDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="target" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>Target: {challenge.target}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="calendar" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>{challenge.duration} days</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="trophy" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>{challenge.points} pts</Text>
        </View>
      </View>

      {challenge.badge && (
        <View style={styles.badgeReward}>
          <Ionicons name="medal" size={16} color={colors.warning} />
          <Text style={styles.badgeRewardText}>
            Earn "{challenge.badge}" badge
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return isActive ? renderActiveChallenge() : renderAvailableChallenge();
};

const styles = StyleSheet.create({
  activeCard: {
    marginBottom: spacing.md,
    borderRadius: 16,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activeGradient: {
    padding: spacing.md,
    borderRadius: 16,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  activeTitle: {
    ...typography.h4,
    color: colors.white,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  activeDescription: {
    ...typography.body,
    color: colors.white,
    opacity: 0.9,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    ...typography.h3,
    color: colors.white,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.white,
    borderRadius: 4,
  },
  progressPercentage: {
    ...typography.caption,
    color: colors.white,
    fontWeight: 'bold',
    minWidth: 35,
    textAlign: 'right',
  },
  activeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    ...typography.caption,
    color: colors.white,
    marginLeft: spacing.xs,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationText: {
    ...typography.caption,
    color: colors.white,
    marginLeft: spacing.xs,
  },
  availableCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  availableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  availableTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  difficultyText: {
    ...typography.small,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
    textTransform: 'capitalize',
  },
  availableDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  challengeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    ...typography.small,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  badgeReward: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeRewardText: {
    ...typography.small,
    color: colors.warning,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
});

export default HabitChallengeCard;