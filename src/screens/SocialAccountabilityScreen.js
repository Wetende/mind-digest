import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import habitTrackingService from '../services/habitTrackingService';
import AccountabilityPartnerCard from '../components/AccountabilityPartnerCard';
import ProgressShareCard from '../components/ProgressShareCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { colors, spacing, typography } from '../theme';

const SocialAccountabilityScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('partners'); // 'partners', 'feed', 'suggestions'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Partners data
  const [accountabilityPartners, setAccountabilityPartners] = useState([]);
  const [partnerRequests, setPartnerRequests] = useState([]);
  const [partnerSuggestions, setPartnerSuggestions] = useState([]);
  
  // Progress feed data
  const [progressFeed, setProgressFeed] = useState([]);
  
  // Share progress modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [shareType, setShareType] = useState('general_progress');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [partnersResult, requestsResult, suggestionsResult, feedResult] = await Promise.all([
        habitTrackingService.getAccountabilityPartners(user.id),
        getPartnerRequests(),
        habitTrackingService.findAccountabilityPartners(user.id),
        habitTrackingService.getPartnerProgressFeed(user.id),
      ]);

      if (partnersResult.success) {
        setAccountabilityPartners(partnersResult.data);
      }

      if (requestsResult.success) {
        setPartnerRequests(requestsResult.data);
      }

      if (suggestionsResult.success) {
        setPartnerSuggestions(suggestionsResult.data);
      }

      if (feedResult.success) {
        setProgressFeed(feedResult.data);
      }
    } catch (error) {
      console.error('Error loading social accountability data:', error);
      Alert.alert('Error', 'Failed to load social accountability data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getPartnerRequests = async () => {
    try {
      // This would be implemented in the habit tracking service
      // For now, return empty array
      return { success: true, data: [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const handleSendPartnerRequest = async (partnerId) => {
    try {
      const result = await habitTrackingService.sendPartnerRequest(
        user.id,
        partnerId,
        'I would love to be accountability partners with you!'
      );

      if (result.success) {
        Alert.alert(
          'Request Sent! 📤',
          'Your accountability partner request has been sent!',
          [{ text: 'OK', onPress: loadData }]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send partner request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const result = await habitTrackingService.acceptPartnerRequest(requestId, user.id);

      if (result.success) {
        Alert.alert(
          'Partnership Created! 🤝',
          'You now have a new accountability partner!',
          [{ text: 'Great!', onPress: loadData }]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to accept partner request');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this partnership request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Decline', 
          style: 'destructive',
          onPress: async () => {
            // Implementation would go here
            Alert.alert('Request declined');
            loadData();
          }
        },
      ]
    );
  };

  const handleSendEncouragement = async (partnerId, message) => {
    try {
      const result = await habitTrackingService.sendEncouragement(
        user.id,
        partnerId,
        message,
        'general'
      );

      if (result.success) {
        Alert.alert(
          'Encouragement Sent! 💙',
          'Your supportive message has been sent to your partner!',
          [{ text: 'Great!' }]
        );
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send encouragement');
    }
  };

  const handleViewPartnerProgress = (partner) => {
    Alert.alert(
      'Partner Progress',
      `${partner.partner.display_name || 'Your partner'} is doing great!\n\nLevel: ${partner.partner.user_habit_stats?.level || 1}\nPoints: ${partner.partner.user_habit_stats?.total_points || 0}\nStreak: ${partner.partner.user_habit_stats?.current_streak || 0}`,
      [{ text: 'Nice!' }]
    );
  };

  const handleShareProgress = async () => {
    if (!shareMessage.trim()) {
      Alert.alert('Error', 'Please enter a message to share');
      return;
    }

    try {
      const result = await habitTrackingService.shareProgress(user.id, {
        type: shareType,
        message: shareMessage.trim(),
      }, 'accountability_partners');

      if (result.success) {
        Alert.alert(
          'Progress Shared! 📢',
          'Your progress has been shared with your accountability partners!',
          [{ text: 'Great!' }]
        );
        setShareMessage('');
        setShowShareModal(false);
        loadData();
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share progress');
    }
  };

  const handleReactToProgress = async (progressId, reactionType, newReactions) => {
    // Implementation would update the progress share reactions in the database
    console.log('React to progress:', progressId, reactionType, newReactions);
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
          <Text style={styles.headerTitleText}>Social Accountability</Text>
          <Text style={styles.headerSubtitle}>
            Connect with partners and share your journey
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => setShowShareModal(true)}
        >
          <Ionicons name="share" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'partners' && styles.activeTab]}
        onPress={() => setActiveTab('partners')}
      >
        <Ionicons 
          name="people" 
          size={20} 
          color={activeTab === 'partners' ? colors.primary : colors.textSecondary} 
        />
        <Text style={[
          styles.tabText,
          activeTab === 'partners' && styles.activeTabText
        ]}>
          Partners
        </Text>
        {partnerRequests.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{partnerRequests.length}</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'feed' && styles.activeTab]}
        onPress={() => setActiveTab('feed')}
      >
        <Ionicons 
          name="newspaper" 
          size={20} 
          color={activeTab === 'feed' ? colors.primary : colors.textSecondary} 
        />
        <Text style={[
          styles.tabText,
          activeTab === 'feed' && styles.activeTabText
        ]}>
          Feed
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'suggestions' && styles.activeTab]}
        onPress={() => setActiveTab('suggestions')}
      >
        <Ionicons 
          name="person-add" 
          size={20} 
          color={activeTab === 'suggestions' ? colors.primary : colors.textSecondary} 
        />
        <Text style={[
          styles.tabText,
          activeTab === 'suggestions' && styles.activeTabText
        ]}>
          Find Partners
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPartnersTab = () => (
    <View style={styles.tabContent}>
      {partnerRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partner Requests</Text>
          {partnerRequests.map((request, index) => (
            <AccountabilityPartnerCard
              key={index}
              partner={request}
              type="request"
              onAcceptRequest={handleAcceptRequest}
              onDeclineRequest={handleDeclineRequest}
            />
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Your Accountability Partners ({accountabilityPartners.length})
        </Text>
        
        {accountabilityPartners.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              No accountability partners yet
            </Text>
            <Text style={styles.emptySubtext}>
              Find partners in the "Find Partners" tab to start your journey together!
            </Text>
          </View>
        ) : (
          accountabilityPartners.map((partner, index) => (
            <AccountabilityPartnerCard
              key={index}
              partner={partner}
              type="active"
              onSendEncouragement={handleSendEncouragement}
              onViewProgress={handleViewPartnerProgress}
            />
          ))
        )}
      </View>
    </View>
  );

  const renderFeedTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Partner Progress Feed</Text>
        
        {progressFeed.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              No progress updates yet
            </Text>
            <Text style={styles.emptySubtext}>
              When your accountability partners share their progress, it will appear here!
            </Text>
          </View>
        ) : (
          progressFeed.map((progressShare, index) => (
            <ProgressShareCard
              key={index}
              progressShare={progressShare}
              currentUserId={user.id}
              onReact={handleReactToProgress}
            />
          ))
        )}
      </View>
    </View>
  );

  const renderSuggestionsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suggested Accountability Partners</Text>
        <Text style={styles.sectionSubtitle}>
          Based on your interests and activity level
        </Text>
        
        {partnerSuggestions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              No partner suggestions available
            </Text>
            <Text style={styles.emptySubtext}>
              Complete more activities to get better partner matches!
            </Text>
          </View>
        ) : (
          partnerSuggestions.map((suggestion, index) => (
            <AccountabilityPartnerCard
              key={index}
              partner={suggestion}
              type="suggestion"
              onSendRequest={handleSendPartnerRequest}
            />
          ))
        )}
      </View>
    </View>
  );

  const renderShareModal = () => (
    <Modal
      visible={showShareModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowShareModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Share Your Progress</Text>
          <Text style={styles.modalSubtitle}>
            Let your accountability partners know how you're doing!
          </Text>
          
          <TextInput
            style={styles.messageInput}
            placeholder="Share your progress, achievements, or thoughts..."
            value={shareMessage}
            onChangeText={setShareMessage}
            multiline
            maxLength={300}
          />
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowShareModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalShareButton}
              onPress={handleShareProgress}
              disabled={!shareMessage.trim()}
            >
              <Text style={styles.modalShareText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading social features...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderTabs()}
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'partners' && renderPartnersTab()}
        {activeTab === 'feed' && renderFeedTab()}
        {activeTab === 'suggestions' && renderSuggestionsTab()}
      </ScrollView>

      {renderShareModal()}
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
  shareButton: {
    padding: spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    ...typography.small,
    color: colors.white,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
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
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.h4,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
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
    minHeight: 100,
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
  modalShareButton: {
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
  modalShareText: {
    ...typography.body,
    color: colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default SocialAccountabilityScreen;
