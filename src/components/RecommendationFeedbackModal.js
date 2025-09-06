import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import Card from './Card';
import behaviorLearningService from '../services/behaviorLearningService';
import recommendationAnalytics from '../services/recommendationAnalytics';

const RecommendationFeedbackModal = ({
  visible,
  onClose,
  recommendation,
  onFeedbackSubmitted
}) => {
  const [rating, setRating] = useState(0);
  const [feedbackType, setFeedbackType] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState([]);

  const feedbackTypes = [
    { id: 'helpful', label: 'Very Helpful', icon: 'thumbs-up', color: '#10b981' },
    { id: 'somewhat', label: 'Somewhat Helpful', icon: 'thumbs-up-outline', color: '#3b82f6' },
    { id: 'not_relevant', label: 'Not Relevant', icon: 'close-circle', color: '#f59e0b' },
    { id: 'not_helpful', label: 'Not Helpful', icon: 'thumbs-down', color: '#ef4444' }
  ];

  const feedbackReasons = {
    helpful: [
      'Perfect timing',
      'Exactly what I needed',
      'Easy to follow',
      'Effective for my situation',
      'Well personalized'
    ],
    somewhat: [
      'Partially useful',
      'Good but could be better',
      'Right direction but not perfect',
      'Needs more context'
    ],
    not_relevant: [
      'Not my current priority',
      'Already doing this',
      'Not interested in this topic',
      'Wrong timing'
    ],
    not_helpful: [
      'Too generic',
      'Confusing instructions',
      'Not suitable for my level',
      'Technical issues',
      'Poor quality content'
    ]
  };

  const resetForm = () => {
    setRating(0);
    setFeedbackType('');
    setComments('');
    setSelectedReasons([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFeedbackTypeSelect = (type) => {
    setFeedbackType(type);
    setSelectedReasons([]);
    
    // Auto-set rating based on feedback type
    switch (type) {
      case 'helpful':
        setRating(5);
        break;
      case 'somewhat':
        setRating(3);
        break;
      case 'not_relevant':
        setRating(2);
        break;
      case 'not_helpful':
        setRating(1);
        break;
    }
  };

  const handleReasonToggle = (reason) => {
    setSelectedReasons(prev => {
      if (prev.includes(reason)) {
        return prev.filter(r => r !== reason);
      } else {
        return [...prev, reason];
      }
    });
  };

  const handleSubmit = async () => {
    if (!feedbackType) {
      Alert.alert('Missing Information', 'Please select a feedback type.');
      return;
    }

    try {
      setIsSubmitting(true);

      const feedbackData = {
        rating,
        type: feedbackType,
        reasons: selectedReasons,
        comments: comments.trim(),
        timestamp: Date.now(),
        recommendationId: recommendation?.id,
        category: recommendation?.category
      };

      // Track feedback in behavior learning service
      await behaviorLearningService.trackInteraction(
        'recommendation_feedback_detailed',
        {
          ...feedbackData,
          recommendationType: recommendation?.type || 'general',
          priority: recommendation?.priority
        }
      );

      // Submit to parent component
      if (onFeedbackSubmitted) {
        await onFeedbackSubmitted(feedbackData);
      }

      handleClose();

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarRating = () => {
    return (
      <View style={styles.starRatingContainer}>
        <Text style={styles.ratingLabel}>Rate this recommendation:</Text>
        <View style={styles.starRating}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={24}
                color={star <= rating ? '#fbbf24' : '#d1d5db'}
              />
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && (
          <Text style={styles.ratingText}>
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </Text>
        )}
      </View>
    );
  };

  const renderFeedbackTypes = () => {
    return (
      <View style={styles.feedbackTypesContainer}>
        <Text style={styles.sectionLabel}>How was this recommendation?</Text>
        <View style={styles.feedbackTypes}>
          {feedbackTypes.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.feedbackTypeButton,
                feedbackType === type.id && styles.feedbackTypeButtonSelected,
                feedbackType === type.id && { borderColor: type.color }
              ]}
              onPress={() => handleFeedbackTypeSelect(type.id)}
            >
              <Ionicons
                name={type.icon}
                size={20}
                color={feedbackType === type.id ? type.color : '#6b7280'}
              />
              <Text style={[
                styles.feedbackTypeText,
                feedbackType === type.id && { color: type.color }
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderReasons = () => {
    if (!feedbackType || !feedbackReasons[feedbackType]) return null;

    return (
      <View style={styles.reasonsContainer}>
        <Text style={styles.sectionLabel}>
          Why? (Select all that apply)
        </Text>
        <View style={styles.reasons}>
          {feedbackReasons[feedbackType].map(reason => (
            <TouchableOpacity
              key={reason}
              style={[
                styles.reasonButton,
                selectedReasons.includes(reason) && styles.reasonButtonSelected
              ]}
              onPress={() => handleReasonToggle(reason)}
            >
              <Text style={[
                styles.reasonText,
                selectedReasons.includes(reason) && styles.reasonTextSelected
              ]}>
                {reason}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderComments = () => {
    return (
      <View style={styles.commentsContainer}>
        <Text style={styles.sectionLabel}>
          Additional comments (optional)
        </Text>
        <TextInput
          style={styles.commentsInput}
          placeholder="Tell us more about your experience..."
          value={comments}
          onChangeText={setComments}
          multiline
          numberOfLines={3}
          maxLength={500}
        />
        <Text style={styles.characterCount}>
          {comments.length}/500 characters
        </Text>
      </View>
    );
  };

  if (!visible || !recommendation) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Feedback</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.recommendationCard}>
            <Text style={styles.recommendationTitle}>
              {recommendation.title}
            </Text>
            {recommendation.description && (
              <Text style={styles.recommendationDescription}>
                {recommendation.description}
              </Text>
            )}
            <View style={styles.recommendationMeta}>
              <Text style={styles.recommendationCategory}>
                {recommendation.category?.toUpperCase() || 'GENERAL'}
              </Text>
              {recommendation.priority && (
                <Text style={[
                  styles.recommendationPriority,
                  { color: getPriorityColor(recommendation.priority) }
                ]}>
                  {recommendation.priority.toUpperCase()} PRIORITY
                </Text>
              )}
            </View>
          </Card>

          {renderStarRating()}
          {renderFeedbackTypes()}
          {renderReasons()}
          {renderComments()}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Cancel"
            onPress={handleClose}
            variant="outline"
            style={styles.cancelButton}
          />
          <Button
            title={isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            onPress={handleSubmit}
            disabled={isSubmitting || !feedbackType}
            style={styles.submitButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high':
      return '#ef4444';
    case 'medium':
      return '#f59e0b';
    case 'low':
      return '#10b981';
    default:
      return '#6b7280';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3436',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  recommendationCard: {
    padding: 16,
    marginBottom: 24,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: 8,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#636e72',
    lineHeight: 18,
    marginBottom: 12,
  },
  recommendationMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  recommendationCategory: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  recommendationPriority: {
    fontSize: 12,
    fontWeight: '600',
  },
  starRatingContainer: {
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2d3436',
    marginBottom: 12,
  },
  starRating: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  feedbackTypesContainer: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2d3436',
    marginBottom: 12,
  },
  feedbackTypes: {
    gap: 8,
  },
  feedbackTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    gap: 8,
  },
  feedbackTypeButtonSelected: {
    borderWidth: 2,
    backgroundColor: '#f8f9ff',
  },
  feedbackTypeText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  reasonsContainer: {
    marginBottom: 24,
  },
  reasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  reasonButtonSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#e0e7ff',
  },
  reasonText: {
    fontSize: 13,
    color: '#6b7280',
  },
  reasonTextSelected: {
    color: '#6366f1',
    fontWeight: '500',
  },
  commentsContainer: {
    marginBottom: 24,
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
    fontSize: 14,
    color: '#2d3436',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});

export default RecommendationFeedbackModal;