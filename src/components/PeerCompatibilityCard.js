import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';
import Button from './Button';
import { matchingService } from '../services';
import behaviorLearningService from '../services/behaviorLearningService';

const PeerCompatibilityCard = ({
  peer,
  onConnect,
  onDismiss,
  onViewProfile,
  showCompatibilityDetails = true,
  compact = false
}) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Track interaction
      await behaviorLearningService.trackInteraction(
        'peer_connection_attempt',
        {
          peerId: peer.id,
          compatibilityScore: peer.compatibilityScore,
          behavioralSimilarity: peer.behavioralSimilarity,
          connectionType: peer.suggestedInteraction || 'general_connection'
        }
      );

      if (onConnect) {
        await onConnect(peer);
      }
    } catch (error) {
      console.error('Failed to connect with peer:', error);
      Alert.alert('Error', 'Failed to send connection request. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDismiss = async () => {
    try {
      // Track dismissal for learning
      await behaviorLearningService.trackInteraction(
        'peer_suggestion_dismissed',
        {
          peerId: peer.id,
          compatibilityScore: peer.compatibilityScore,
          reason: 'user_dismissed'
        }
      );

      if (onDismiss) {
        onDismiss(peer);
      }
    } catch (error) {
      console.error('Failed to dismiss peer suggestion:', error);
    }
  };

  const getCompatibilityColor = (score) => {
    if (score >= 0.8) return '#10b981'; // High compatibility - green
    if (score >= 0.6) return '#3b82f6'; // Good compatibility - blue
    if (score >= 0.4) return '#f59e0b'; // Medium compatibility - orange
    return '#6b7280'; // Low compatibility - gray
  };

  const getCompatibilityLabel = (score) => {
    if (score >= 0.8) return 'Excellent Match';
    if (score >= 0.6) return 'Good Match';
    if (score >= 0.4) return 'Potential Match';
    return 'Low Match';
  };

  const getConnectionTypeIcon = (type) => {
    switch (type) {
      case 'collaborative_support':
        return 'people';
      case 'peer_mentoring':
        return 'school';
      case 'activity_partnership':
        return 'fitness';
      case 'general_connection':
        return 'chatbubbles';
      default:
        return 'person-add';
    }
  };

  const getConnectionTypeLabel = (type) => {
    switch (type) {
      case 'collaborative_support':
        return 'Mutual Support';
      case 'peer_mentoring':
        return 'Mentoring';
      case 'activity_partnership':
        return 'Activity Partner';
      case 'general_connection':
        return 'General Chat';
      default:
        return 'Connect';
    }
  };

  const renderSharedInterests = () => {
    if (!peer.sharedInterests || peer.sharedInterests.length === 0) return null;

    return (
      <View style={styles.sharedInterestsContainer}>
        <Text style={styles.sharedInterestsLabel}>Shared Interests:</Text>
        <View style={styles.interestTags}>
          {peer.sharedInterests.slice(0, 3).map((interest, index) => (
            <View key={index} style={styles.interestTag}>
              <Text style={styles.interestTagText}>{interest}</Text>
            </View>
          ))}
          {peer.sharedInterests.length > 3 && (
            <Text style={styles.moreInterests}>
              +{peer.sharedInterests.length - 3} more
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderCompatibilityMetrics = () => {
    if (!showCompatibilityDetails) return null;

    return (
      <View style={styles.compatibilityMetrics}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Overall</Text>
          <View style={styles.metricBar}>
            <View
              style={[
                styles.metricFill,
                {
                  width: `${(peer.compatibilityScore || 0) * 100}%`,
                  backgroundColor: getCompatibilityColor(peer.compatibilityScore || 0)
                }
              ]}
            />
          </View>
          <Text style={styles.metricValue}>
            {Math.round((peer.compatibilityScore || 0) * 100)}%
          </Text>
        </View>

        {peer.behavioralSimilarity !== undefined && (
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Behavioral</Text>
            <View style={styles.metricBar}>
              <View
                style={[
                  styles.metricFill,
                  {
                    width: `${peer.behavioralSimilarity * 100}%`,
                    backgroundColor: getCompatibilityColor(peer.behavioralSimilarity)
                  }
                ]}
              />
            </View>
            <Text style={styles.metricValue}>
              {Math.round(peer.behavioralSimilarity * 100)}%
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderAIInsights = () => {
    if (!peer.aiInsights || !peer.aiInsights.insights) return null;

    return (
      <View style={styles.aiInsightsContainer}>
        <View style={styles.aiInsightsHeader}>
          <Ionicons name="sparkles" size={14} color="#6366f1" />
          <Text style={styles.aiInsightsLabel}>AI Insights</Text>
        </View>
        <Text style={styles.aiInsightsText}>
          {peer.aiInsights.insights.slice(0, 100)}
          {peer.aiInsights.insights.length > 100 ? '...' : ''}
        </Text>
      </View>
    );
  };

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactContainer} onPress={onViewProfile}>
        <Card style={styles.compactCard}>
          <View style={styles.compactContent}>
            <View style={styles.compactAvatar}>
              {peer.avatar_url ? (
                <Image source={{ uri: peer.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={20} color="#6b7280" />
              )}
            </View>
            <View style={styles.compactInfo}>
              <Text style={styles.compactName} numberOfLines={1}>
                {peer.display_name || 'Anonymous User'}
              </Text>
              <Text style={styles.compactCompatibility}>
                {getCompatibilityLabel(peer.compatibilityScore || 0)}
              </Text>
            </View>
            <TouchableOpacity onPress={handleConnect} style={styles.compactConnectButton}>
              <Ionicons name="add" size={20} color="#6366f1" />
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            {peer.avatar_url ? (
              <Image source={{ uri: peer.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={24} color="#6b7280" />
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.displayName}>
              {peer.display_name || 'Anonymous User'}
            </Text>
            <Text style={[
              styles.compatibilityLabel,
              { color: getCompatibilityColor(peer.compatibilityScore || 0) }
            ]}>
              {getCompatibilityLabel(peer.compatibilityScore || 0)}
            </Text>
            {peer.last_active && (
              <Text style={styles.lastActive}>
                Active {new Date(peer.last_active).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
          <Ionicons name="close" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {renderCompatibilityMetrics()}
      {renderSharedInterests()}
      {renderAIInsights()}

      {peer.suggestedInteraction && (
        <View style={styles.suggestionContainer}>
          <Ionicons
            name={getConnectionTypeIcon(peer.suggestedInteraction)}
            size={16}
            color="#6366f1"
          />
          <Text style={styles.suggestionText}>
            Suggested: {getConnectionTypeLabel(peer.suggestedInteraction)}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <Button
          title={isConnecting ? 'Connecting...' : 'Send Request'}
          onPress={handleConnect}
          disabled={isConnecting}
          style={styles.connectButton}
        />
        <Button
          title="View Profile"
          onPress={() => onViewProfile && onViewProfile(peer)}
          variant="outline"
          style={styles.profileButton}
        />
      </View>

      {peer.aiEnhanced && (
        <View style={styles.aiEnhancedBadge}>
          <Ionicons name="sparkles" size={12} color="#6366f1" />
          <Text style={styles.aiEnhancedText}>AI Enhanced</Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    marginHorizontal: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userDetails: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: 4,
  },
  compatibilityLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  lastActive: {
    fontSize: 12,
    color: '#6b7280',
  },
  dismissButton: {
    padding: 4,
  },
  compatibilityMetrics: {
    marginBottom: 16,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    width: 60,
  },
  metricBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  metricFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricValue: {
    fontSize: 12,
    color: '#374151',
    width: 35,
    textAlign: 'right',
  },
  sharedInterestsContainer: {
    marginBottom: 16,
  },
  sharedInterestsLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  interestTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  interestTagText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
  moreInterests: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  aiInsightsContainer: {
    backgroundColor: '#f8f9ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  aiInsightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiInsightsLabel: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
    marginLeft: 4,
  },
  aiInsightsText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 16,
  },
  suggestionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 16,
  },
  suggestionText: {
    fontSize: 13,
    color: '#0369a1',
    marginLeft: 6,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  connectButton: {
    flex: 2,
  },
  profileButton: {
    flex: 1,
  },
  aiEnhancedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  aiEnhancedText: {
    fontSize: 11,
    color: '#6366f1',
    marginLeft: 4,
    fontWeight: '500',
  },
  // Compact styles
  compactContainer: {
    marginVertical: 4,
    marginHorizontal: 16,
  },
  compactCard: {
    padding: 12,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d3436',
  },
  compactCompatibility: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  compactConnectButton: {
    padding: 8,
  },
});

export default PeerCompatibilityCard;