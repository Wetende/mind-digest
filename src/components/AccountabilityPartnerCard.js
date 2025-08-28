import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../theme';

const AccountabilityPartnerCard = ({ 
  partner, 
  type = 'suggestion', // 'suggestion', 'active', 'request'
  onSendRequest,
  onAcceptRequest,
  onDeclineRequest,
  onSendEncouragement,
  onViewProgress,
}) => {
  const [showEncouragementModal, setShowEncouragementModal] = useState(false);
  const [encouragementMessage, setEncouragementMessage] = useState('');

  const handleSendRequest = () => {
    Alert.alert(
      'Send Partner Request',
      `Send an accountability partner request to ${partner.display_name || 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send Request', 
          onPress: () => {
            if (onSendRequest) onSendRequest(partner.id);
          }
        },
      ]
    );
  };

  const handleSendEncouragement = () => {
    if (encouragementMessage.trim()) {
      if (onSendEncouragement) {
        onSendEncouragement(partner.id, encouragementMessage.trim());
      }
      setEncouragementMessage('');
      setShowEncouragementModal(false);
    }
  };

  const renderSuggestionCard = () => (
    <View style={styles.suggestionCard}>
      <View style={styles.partnerHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={32} color={colors.primary} />
        </View>
        <View style={styles.partnerInfo}>
          <Text style={styles.partnerName}>
            {partner.display_name || 'Anonymous User'}
          </Text>
          <Text style={styles.partnerLevel}>
            Level {partner.user_habit_stats?.level || 1}
          </Text>
          <Text style={styles.compatibilityScore}>
            {partner.compatibilityScore}% compatible
          </Text>
        </View>
        <TouchableOpacity
          style={styles.requestButton}
          onPress={handleSendRequest}
        >
          <Ionicons name="person-add" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.partnerStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {partner.user_habit_stats?.total_points || 0}
          </Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {partner.user_habit_stats?.current_streak || 0}
          </Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {partner.sharedInterests?.length || 0}
          </Text>
          <Text style={styles.statLabel}>Shared</Text>
        </View>
      </View>

      {partner.sharedInterests && partner.sharedInterests.length > 0 && (
        <View style={styles.sharedInterests}>
          <Text style={styles.sharedInterestsTitle}>Shared Interests:</Text>
          <View style={styles.interestTags}>
            {partner.sharedInterests.slice(0, 3).map((interest, index) => (
              <View key={index} style={styles.interestTag}>
                <Text style={styles.interestTagText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderActivePartnerCard = () => (
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      style={styles.activePartnerCard}
    >
      <View style={styles.partnerHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={32} color={colors.white} />
        </View>
        <View style={styles.partnerInfo}>
          <Text style={styles.activePartnerName}>
            {partner.partner?.display_name || 'Anonymous Partner'}
          </Text>
          <Text style={styles.activePartnerLevel}>
            Level {partner.partner?.user_habit_stats?.level || 1}
          </Text>
          <Text style={styles.partnershipDuration}>
            Partners since {new Date(partner.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewProgressButton}
          onPress={() => onViewProgress && onViewProgress(partner)}
        >
          <Ionicons name="trending-up" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.partnerStats}>
        <View style={styles.activeStatItem}>
          <Text style={styles.activeStatValue}>
            {partner.partner?.user_habit_stats?.total_points || 0}
          </Text>
          <Text style={styles.activeStatLabel}>Points</Text>
        </View>
        <View style={styles.activeStatItem}>
          <Text style={styles.activeStatValue}>
            {partner.partner?.user_habit_stats?.current_streak || 0}
          </Text>
          <Text style={styles.activeStatLabel}>Streak</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.encourageButton}
        onPress={() => setShowEncouragementModal(true)}
      >
        <Ionicons name="heart" size={16} color={colors.primary} />
        <Text style={styles.encourageButtonText}>Send Encouragement</Text>
      </TouchableOpacity>
    </LinearGradient>
  );

  const renderRequestCard = () => (
    <View style={styles.requestCard}>
      <View style={styles.partnerHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={32} color={colors.primary} />
        </View>
        <View style={styles.partnerInfo}>
          <Text style={styles.partnerName}>
            {partner.from_user?.display_name || 'Anonymous User'}
          </Text>
          <Text style={styles.requestMessage}>
            Wants to be your accountability partner
          </Text>
          {partner.message && (
            <Text style={styles.personalMessage}>"{partner.message}"</Text>
          )}
        </View>
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => onDeclineRequest && onDeclineRequest(partner.id)}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => onAcceptRequest && onAcceptRequest(partner.id)}
        >
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEncouragementModal = () => (
    <Modal
      visible={showEncouragementModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowEncouragementModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Send Encouragement</Text>
          <Text style={styles.modalSubtitle}>
            Send a supportive message to {partner.partner?.display_name || 'your partner'}
          </Text>
          
          <TextInput
            style={styles.messageInput}
            placeholder="Write an encouraging message..."
            value={encouragementMessage}
            onChangeText={setEncouragementMessage}
            multiline
            maxLength={200}
          />
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowEncouragementModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSendButton}
              onPress={handleSendEncouragement}
              disabled={!encouragementMessage.trim()}
            >
              <Text style={styles.modalSendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {type === 'suggestion' && renderSuggestionCard()}
      {type === 'active' && renderActivePartnerCard()}
      {type === 'request' && renderRequestCard()}
      {renderEncouragementModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  suggestionCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activePartnerCard: {
    padding: spacing.md,
    borderRadius: 16,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  requestCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  activePartnerName: {
    ...typography.h4,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  partnerLevel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  activePartnerLevel: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  compatibilityScore: {
    ...typography.small,
    color: colors.primary,
    fontWeight: 'bold',
  },
  partnershipDuration: {
    ...typography.small,
    color: colors.white,
    opacity: 0.8,
  },
  requestButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewProgressButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  activeStatItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: 'bold',
  },
  activeStatValue: {
    ...typography.h3,
    color: colors.white,
    fontWeight: 'bold',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  activeStatLabel: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  sharedInterests: {
    marginTop: spacing.sm,
  },
  sharedInterestsTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestTag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  interestTagText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: 'bold',
  },
  encourageButton: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  encourageButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  requestMessage: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  personalMessage: {
    ...typography.body,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  declineButton: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
    marginRight: spacing.sm,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    flex: 1,
    marginLeft: spacing.sm,
  },
  declineButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  acceptButtonText: {
    ...typography.body,
    color: colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  messageInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    flex: 1,
    marginRight: spacing.sm,
  },
  modalSendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    flex: 1,
    marginLeft: spacing.sm,
  },
  modalCancelText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalSendText: {
    ...typography.body,
    color: colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default AccountabilityPartnerCard;