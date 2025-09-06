import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { matchingService } from '../services';
import { LoadingSpinner } from '../components';
import { theme } from '../theme';

export default function UserMatchingScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('matches');
  const [matches, setMatches] = useState([]);
  const [pairings, setPairings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMatches(),
        loadPairings()
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load matching data');
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    try {
      const result = await matchingService.findMatches(user.id, { limit: 10 });
      if (result.success) {
        setMatches(result.data);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const loadPairings = async () => {
    try {
      const result = await matchingService.getUserPairings(user.id);
      if (result.success) {
        setPairings(result.data);
      }
    } catch (error) {
      console.error('Error loading pairings:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const sendChatRequest = async (matchUserId) => {
    try {
      const result = await matchingService.createChatPairing(user.id, matchUserId);
      if (result.success) {
        Alert.alert(
          'Request Sent!',
          'Your chat request has been sent. You\'ll be notified when they respond.',
          [{ text: 'OK' }]
        );
        await loadPairings(); // Refresh pairings
      } else {
        Alert.alert('Error', result.error || 'Failed to send chat request');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong sending the request');
    }
  };

  const acceptPairing = async (pairingId) => {
    try {
      const result = await matchingService.acceptPairing(pairingId, user.id);
      if (result.success) {
        Alert.alert(
          'Chat Started!',
          'You can now start chatting with your new peer support partner.',
          [
            {
              text: 'Start Chatting',
              onPress: () => navigation.navigate('ChatRoom', { room: result.data.room })
            },
            { text: 'Later', style: 'cancel' }
          ]
        );
        await loadPairings();
      } else {
        Alert.alert('Error', 'Failed to accept pairing');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong accepting the pairing');
    }
  };

  const declinePairing = async (pairingId) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this chat request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await matchingService.declinePairing(pairingId, user.id);
              if (result.success) {
                await loadPairings();
              } else {
                Alert.alert('Error', 'Failed to decline pairing');
              }
            } catch (error) {
              Alert.alert('Error', 'Something went wrong');
            }
          }
        }
      ]
    );
  };

  const reportUser = (userId, userName) => {
    const reasons = [
      'Inappropriate behavior',
      'Harassment',
      'Spam or promotional content',
      'Sharing personal information',
      'Other safety concern'
    ];

    Alert.alert(
      'Report User',
      `Report ${userName} for inappropriate behavior?`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...reasons.map(reason => ({
          text: reason,
          onPress: async () => {
            try {
              const result = await matchingService.reportUser(userId, user.id, reason);
              if (result.success) {
                Alert.alert('Report Submitted', 'Thank you for helping keep our community safe.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to submit report');
            }
          }
        }))
      ]
    );
  };

  const renderCompatibilityScore = (score) => {
    const percentage = Math.round(score * 100);
    const color = score >= 0.7 ? '#10b981' : score >= 0.5 ? '#f59e0b' : '#ef4444';
    
    return (
      <View style={[styles.compatibilityBadge, { backgroundColor: color }]}>
        <Text style={styles.compatibilityText}>{percentage}%</Text>
      </View>
    );
  };

  const renderMatchCard = (match) => (
    <View key={match.id} style={styles.matchCard}>
      <View style={styles.matchHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {match.avatar_url ? (
              <Image source={{ uri: match.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={24} color={theme.colors.gray[500]} />
              </View>
            )}
            {match.is_anonymous && (
              <View style={styles.anonymousBadge}>
                <Ionicons name="shield-checkmark" size={12} color="white" />
              </View>
            )}
          </View>
          
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {match.is_anonymous ? 'Anonymous User' : match.display_name}
            </Text>
            <Text style={styles.lastActive}>
              Active {new Date(match.last_active).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {renderCompatibilityScore(match.compatibilityScore)}
      </View>

      {match.sharedInterests.length > 0 && (
        <View style={styles.sharedSection}>
          <Text style={styles.sharedTitle}>Shared Interests</Text>
          <View style={styles.tagsContainer}>
            {match.sharedInterests.slice(0, 3).map((interest, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{interest}</Text>
              </View>
            ))}
            {match.sharedInterests.length > 3 && (
              <Text style={styles.moreText}>+{match.sharedInterests.length - 3} more</Text>
            )}
          </View>
        </View>
      )}

      {match.sharedExperiences.length > 0 && (
        <View style={styles.sharedSection}>
          <Text style={styles.sharedTitle}>Shared Experiences</Text>
          <View style={styles.tagsContainer}>
            {match.sharedExperiences.slice(0, 2).map((experience, index) => (
              <View key={index} style={[styles.tag, styles.experienceTag]}>
                <Text style={[styles.tagText, styles.experienceTagText]}>{experience}</Text>
              </View>
            ))}
            {match.sharedExperiences.length > 2 && (
              <Text style={styles.moreText}>+{match.sharedExperiences.length - 2} more</Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.matchActions}>
        <TouchableOpacity
          style={styles.connectButton}
          onPress={() => sendChatRequest(match.id)}
        >
          <Ionicons name="chatbubble" size={16} color="white" />
          <Text style={styles.connectButtonText}>Connect</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => reportUser(match.id, match.display_name)}
        >
          <Ionicons name="flag" size={16} color={theme.colors.gray[500]} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPairingCard = (pairing) => (
    <View key={pairing.id} style={styles.pairingCard}>
      <View style={styles.pairingHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {pairing.otherUser?.avatar ? (
              <Image source={{ uri: pairing.otherUser.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={24} color={theme.colors.gray[500]} />
              </View>
            )}
            {pairing.otherUser?.isAnonymous && (
              <View style={styles.anonymousBadge}>
                <Ionicons name="shield-checkmark" size={12} color="white" />
              </View>
            )}
          </View>
          
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{pairing.otherUser?.name || 'Unknown User'}</Text>
            <Text style={styles.pairingStatus}>
              {pairing.status === 'pending' ? 'Pending response' : 'Active chat'}
            </Text>
          </View>
        </View>

        <View style={[
          styles.statusBadge,
          pairing.status === 'active' ? styles.activeBadge : styles.pendingBadge
        ]}>
          <Text style={[
            styles.statusText,
            pairing.status === 'active' ? styles.activeText : styles.pendingText
          ]}>
            {pairing.status}
          </Text>
        </View>
      </View>

      <View style={styles.pairingActions}>
        {pairing.status === 'pending' && pairing.user2_id === user.id && (
          <>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => acceptPairing(pairing.id)}
            >
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => declinePairing(pairing.id)}
            >
              <Ionicons name="close" size={16} color={theme.colors.danger[500]} />
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </>
        )}

        {pairing.status === 'active' && pairing.room && (
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => navigation.navigate('ChatRoom', { room: pairing.room })}
          >
            <Ionicons name="chatbubble" size={16} color="white" />
            <Text style={styles.chatButtonText}>Open Chat</Text>
          </TouchableOpacity>
        )}

        {pairing.status === 'pending' && pairing.user1_id === user.id && (
          <Text style={styles.waitingText}>Waiting for response...</Text>
        )}
      </View>
    </View>
  );

  const renderMatches = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionDescription}>
        Find peers with similar experiences and interests for mutual support
      </Text>
      
      {matches.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={theme.colors.gray[400]} />
          <Text style={styles.emptyStateTitle}>No matches found</Text>
          <Text style={styles.emptyStateText}>
            Complete your profile to find compatible peers for support
          </Text>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.profileButtonText}>Update Profile</Text>
          </TouchableOpacity>
        </View>
      ) : (
        matches.map(renderMatchCard)
      )}
    </View>
  );

  const renderPairings = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionDescription}>
        Manage your peer support connections and chat requests
      </Text>
      
      {pairings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.gray[400]} />
          <Text style={styles.emptyStateTitle}>No connections yet</Text>
          <Text style={styles.emptyStateText}>
            Send connection requests to start peer support conversations
          </Text>
        </View>
      ) : (
        pairings.map(renderPairingCard)
      )}
    </View>
  );

  if (loading) {
    return <LoadingSpinner text="Finding your matches..." />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Peer Matching</Text>
          <Text style={styles.headerSubtitle}>Connect with supportive peers</Text>
        </View>
      </LinearGradient>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'matches' && styles.activeTab]}
          onPress={() => setActiveTab('matches')}
        >
          <Text style={[styles.tabText, activeTab === 'matches' && styles.activeTabText]}>
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pairings' && styles.activeTab]}
          onPress={() => setActiveTab('pairings')}
        >
          <Text style={[styles.tabText, activeTab === 'pairings' && styles.activeTabText]}>
            My Connections
          </Text>
          {pairings.filter(p => p.status === 'pending' && p.user2_id === user.id).length > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>
                {pairings.filter(p => p.status === 'pending' && p.user2_id === user.id).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'matches' ? renderMatches() : renderPairings()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary[500],
  },
  tabText: {
    fontSize: 16,
    color: theme.colors.gray[600],
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.colors.primary[600],
    fontWeight: '600',
  },
  notificationBadge: {
    backgroundColor: theme.colors.danger[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  notificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  sectionDescription: {
    fontSize: 16,
    color: theme.colors.gray[600],
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  matchCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonymousBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: theme.colors.primary[500],
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  lastActive: {
    fontSize: 14,
    color: theme.colors.gray[500],
  },
  compatibilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  compatibilityText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  sharedSection: {
    marginBottom: 12,
  },
  sharedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gray[700],
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: theme.colors.calm[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: theme.colors.calm[600],
    fontWeight: '500',
  },
  experienceTag: {
    backgroundColor: theme.colors.anxiety[100],
  },
  experienceTagText: {
    color: theme.colors.anxiety[600],
  },
  moreText: {
    fontSize: 12,
    color: theme.colors.gray[500],
    fontStyle: 'italic',
  },
  matchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    marginRight: 12,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  reportButton: {
    padding: 10,
  },
  pairingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  pairingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pairingStatus: {
    fontSize: 14,
    color: theme.colors.gray[500],
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: theme.colors.success[100],
  },
  pendingBadge: {
    backgroundColor: theme.colors.warning[100],
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  activeText: {
    color: theme.colors.success[700],
  },
  pendingText: {
    color: theme.colors.warning[700],
  },
  pairingActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success[500],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 12,
  },
  acceptButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: theme.colors.danger[100],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  declineButtonText: {
    color: theme.colors.danger[500],
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
  },
  chatButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  waitingText: {
    fontSize: 14,
    color: theme.colors.gray[500],
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.gray[500],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  profileButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  profileButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});