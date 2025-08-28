import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../theme';

const ProgressShareCard = ({ 
  progressShare, 
  onReact,
  onComment,
  currentUserId,
}) => {
  const [reactions, setReactions] = useState(progressShare.reactions || {});
  
  const content = progressShare.content || {};
  const user = progressShare.user || {};
  
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getShareTypeIcon = (shareType) => {
    switch (shareType) {
      case 'milestone_reached':
        return 'flag';
      case 'badge_earned':
        return 'medal';
      case 'level_up':
        return 'trending-up';
      case 'streak_achievement':
        return 'flame';
      default:
        return 'stats-chart';
    }
  };

  const getShareTypeColor = (shareType) => {
    switch (shareType) {
      case 'milestone_reached':
        return [colors.success, colors.successDark];
      case 'badge_earned':
        return [colors.warning, colors.warningDark];
      case 'level_up':
        return [colors.primary, colors.primaryDark];
      case 'streak_achievement':
        return [colors.error, colors.errorDark];
      default:
        return [colors.primary, colors.primaryDark];
    }
  };

  const handleReaction = (reactionType) => {
    const newReactions = { ...reactions };
    const userReactions = newReactions[currentUserId] || [];
    
    if (userReactions.includes(reactionType)) {
      // Remove reaction
      newReactions[currentUserId] = userReactions.filter(r => r !== reactionType);
      if (newReactions[currentUserId].length === 0) {
        delete newReactions[currentUserId];
      }
    } else {
      // Add reaction
      newReactions[currentUserId] = [...userReactions, reactionType];
    }
    
    setReactions(newReactions);
    
    if (onReact) {
      onReact(progressShare.id, reactionType, newReactions);
    }
  };

  const getReactionCount = (reactionType) => {
    return Object.values(reactions).reduce((count, userReactions) => {
      return count + (userReactions.includes(reactionType) ? 1 : 0);
    }, 0);
  };

  const hasUserReacted = (reactionType) => {
    const userReactions = reactions[currentUserId] || [];
    return userReactions.includes(reactionType);
  };

  const renderProgressStats = () => (
    <View style={styles.progressStats}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{content.level || 1}</Text>
        <Text style={styles.statLabel}>Level</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{content.totalPoints || 0}</Text>
        <Text style={styles.statLabel}>Points</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{content.currentStreak || 0}</Text>
        <Text style={styles.statLabel}>Streak</Text>
      </View>
    </View>
  );

  const renderRecentAchievements = () => {
    if (!content.recentAchievements || content.recentAchievements.length === 0) {
      return null;
    }

    return (
      <View style={styles.achievementsSection}>
        <Text style={styles.achievementsTitle}>Recent Achievements:</Text>
        <View style={styles.achievementsList}>
          {content.recentAchievements.slice(0, 3).map((badge, index) => (
            <View key={index} style={styles.achievementItem}>
              <Ionicons 
                name={badge.badge_data?.icon || 'medal'} 
                size={16} 
                color={colors.warning} 
              />
              <Text style={styles.achievementName}>
                {badge.badge_data?.name || 'Achievement'}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderMilestone = () => {
    if (!content.milestone) return null;

    return (
      <View style={styles.milestoneSection}>
        <LinearGradient
          colors={getShareTypeColor(progressShare.share_type)}
          style={styles.milestoneCard}
        >
          <Ionicons 
            name={getShareTypeIcon(progressShare.share_type)} 
            size={24} 
            color={colors.white} 
          />
          <Text style={styles.milestoneText}>{content.milestone}</Text>
        </LinearGradient>
      </View>
    );
  };

  const renderReactions = () => {
    const reactionTypes = [
      { type: 'celebrate', icon: 'happy', label: '🎉' },
      { type: 'support', icon: 'heart', label: '❤️' },
      { type: 'motivate', icon: 'flash', label: '💪' },
      { type: 'inspire', icon: 'star', label: '⭐' },
    ];

    return (
      <View style={styles.reactionsSection}>
        <View style={styles.reactionButtons}>
          {reactionTypes.map((reaction) => (
            <TouchableOpacity
              key={reaction.type}
              style={[
                styles.reactionButton,
                hasUserReacted(reaction.type) && styles.reactionButtonActive,
              ]}
              onPress={() => handleReaction(reaction.type)}
            >
              <Text style={styles.reactionEmoji}>{reaction.label}</Text>
              {getReactionCount(reaction.type) > 0 && (
                <Text style={styles.reactionCount}>
                  {getReactionCount(reaction.type)}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color={colors.primary} />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {user.display_name || 'Anonymous User'}
            </Text>
            <Text style={styles.timeAgo}>
              {formatTimeAgo(progressShare.created_at)}
            </Text>
          </View>
        </View>
        <View style={styles.shareTypeIcon}>
          <Ionicons 
            name={getShareTypeIcon(progressShare.share_type)} 
            size={20} 
            color={colors.primary} 
          />
        </View>
      </View>

      {content.message && (
        <Text style={styles.message}>{content.message}</Text>
      )}

      {renderMilestone()}
      {renderProgressStats()}
      {renderRecentAchievements()}
      {renderReactions()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  timeAgo: {
    ...typography.small,
    color: colors.textSecondary,
  },
  shareTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  milestoneSection: {
    marginBottom: spacing.md,
  },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
  },
  milestoneText: {
    ...typography.body,
    color: colors.white,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
    flex: 1,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: 'bold',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  achievementsSection: {
    marginBottom: spacing.md,
  },
  achievementsTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  achievementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  achievementName: {
    ...typography.small,
    color: colors.warning,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  reactionsSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  reactionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    minWidth: 50,
    justifyContent: 'center',
  },
  reactionButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    ...typography.small,
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
});

export default ProgressShareCard;