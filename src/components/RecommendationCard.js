import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Card from './Card';
import Button from './Button';

const RecommendationCard = ({
  recommendation,
  onAccept,
  onDismiss,
  onFeedback,
  showFeedback = true,
  compact = false
}) => {
  const handleAccept = () => {
    onAccept(recommendation);
  };

  const handleDismiss = () => {
    onDismiss(recommendation);
  };

  const handleFeedback = (feedback) => {
    onFeedback(recommendation, feedback);
  };

  const getRecommendationIcon = () => {
    switch (recommendation.category) {
      case 'wellness_task':
        return '🧘';
      case 'social_connection':
        return '🤝';
      case 'journal_prompt':
        return '📓';
      case 'breathing_exercise':
        return '🌬️';
      case 'peer_suggestion':
        return '👥';
      case 'mood_tracking':
        return '😊';
      case 'habit_challenge':
        return '🎯';
      default:
        return '💡';
    }
  };

  const getPriorityColor = () => {
    switch (recommendation.priority) {
      case 'high':
        return styles.highPriority;
      case 'medium':
        return styles.mediumPriority;
      case 'low':
        return styles.lowPriority;
      default:
        return styles.normalPriority;
    }
  };

  const formatTimeEstimate = (timeInMinutes) => {
    if (!timeInMinutes) return null;
    return timeInMinutes < 60 ? `${timeInMinutes}m` : `${Math.round(timeInMinutes / 60)}h`;
  };

  if (compact) {
    return (
      <TouchableOpacity onPress={handleAccept} style={styles.compactContainer}>
        <Card style={[styles.compactCard, getPriorityColor()]}>
          <View style={styles.compactContent}>
            <Text style={styles.compactIcon}>{getRecommendationIcon()}</Text>
            <View style={styles.compactTextContainer}>
              <Text style={styles.compactTitle} numberOfLines={1}>
                {recommendation.title}
              </Text>
              {recommendation.timeEstimate && (
                <Text style={styles.compactTime}>
                  {formatTimeEstimate(recommendation.timeEstimate)}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
              <Text style={styles.dismissIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card style={[styles.container, getPriorityColor()]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.icon}>{getRecommendationIcon()}</Text>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{recommendation.title}</Text>
            {recommendation.timeEstimate && (
              <Text style={styles.timeEstimate}>
                {formatTimeEstimate(recommendation.timeEstimate)}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>{recommendation.description}</Text>

      {recommendation.reasoning && (
        <View style={styles.reasoningContainer}>
          <Text style={styles.reasoningLabel}>Why this?</Text>
          <Text style={styles.reasoningText}>{recommendation.reasoning}</Text>
        </View>
      )}

      {recommendation.confidence && recommendation.confidence > 0.7 && (
        <Text style={styles.confidenceText}>
          🤖 Recommended with high confidence based on your patterns
        </Text>
      )}

      <View style={styles.actionsContainer}>
        <Button
          title="Try It"
          onPress={handleAccept}
          style={styles.primaryButton}
        />
        {showFeedback && (
          <Button
            title="Remind Later"
            onPress={() => handleFeedback('remind_later')}
            style={styles.secondaryButton}
            variant="outline"
          />
        )}
      </View>

      {recommendation.expectedOutcome && (
        <Text style={styles.outcomeText}>
          Expected outcome: {recommendation.expectedOutcome}
        </Text>
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
  highPriority: {
    borderLeftColor: '#ff6b6b',
    borderLeftWidth: 4,
  },
  mediumPriority: {
    borderLeftColor: '#ffa07a',
    borderLeftWidth: 4,
  },
  lowPriority: {
    borderLeftColor: '#48cae4',
    borderLeftWidth: 4,
  },
  normalPriority: {
    borderLeftColor: '#84a59d',
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
    alignSelf: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3436',
    lineHeight: 20,
  },
  timeEstimate: {
    fontSize: 12,
    color: '#636e72',
    marginTop: 4,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
  dismissIcon: {
    fontSize: 16,
    color: '#b2bec3',
  },
  description: {
    fontSize: 14,
    color: '#636e72',
    lineHeight: 18,
    marginBottom: 12,
  },
  reasoningContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  reasoningLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  reasoningText: {
    fontSize: 13,
    color: '#6c757d',
    lineHeight: 16,
  },
  confidenceText: {
    fontSize: 12,
    color: '#20c997',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
  },
  outcomeText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 8,
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
  compactIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  compactTextContainer: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d3436',
  },
  compactTime: {
    fontSize: 12,
    color: '#636e72',
    marginTop: 2,
  },
});

export default RecommendationCard;
