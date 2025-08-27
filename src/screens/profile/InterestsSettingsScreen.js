import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, LoadingSpinner } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../theme';

export default function InterestsSettingsScreen({ navigation }) {
  const { user, updateProfile } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [loading, setLoading] = useState(false);

  const mentalHealthInterests = [
    { id: 'social-anxiety', label: 'Social Anxiety', icon: '😰', description: 'Managing social situations and interactions' },
    { id: 'general-anxiety', label: 'General Anxiety', icon: '😟', description: 'Coping with everyday worries and stress' },
    { id: 'depression', label: 'Depression', icon: '😔', description: 'Support for mood and emotional wellness' },
    { id: 'stress-management', label: 'Stress Management', icon: '😤', description: 'Techniques for handling daily stress' },
    { id: 'mindfulness', label: 'Mindfulness', icon: '🧘', description: 'Present-moment awareness and meditation' },
    { id: 'self-care', label: 'Self Care', icon: '💆', description: 'Personal wellness and self-compassion' },
    { id: 'relationships', label: 'Relationships', icon: '💕', description: 'Building and maintaining healthy connections' },
    { id: 'work-life-balance', label: 'Work-Life Balance', icon: '⚖️', description: 'Managing professional and personal life' },
    { id: 'sleep-issues', label: 'Sleep Issues', icon: '😴', description: 'Improving sleep quality and habits' },
    { id: 'confidence', label: 'Building Confidence', icon: '💪', description: 'Developing self-esteem and assertiveness' },
    { id: 'trauma-recovery', label: 'Trauma Recovery', icon: '🌱', description: 'Healing from past experiences' },
    { id: 'addiction-recovery', label: 'Addiction Recovery', icon: '🔄', description: 'Support for substance and behavioral addictions' },
    { id: 'eating-disorders', label: 'Eating Disorders', icon: '🍎', description: 'Body image and relationship with food' },
    { id: 'grief-loss', label: 'Grief & Loss', icon: '💔', description: 'Processing loss and bereavement' },
    { id: 'anger-management', label: 'Anger Management', icon: '😡', description: 'Healthy expression and control of anger' },
    { id: 'perfectionism', label: 'Perfectionism', icon: '🎯', description: 'Overcoming unrealistic standards' },
  ];

  useEffect(() => {
    // Load current interests from user profile
    if (user?.user_metadata?.interests) {
      setSelectedInterests(user.user_metadata.interests);
    }
  }, [user]);

  const toggleInterest = (interestId) => {
    setSelectedInterests(prev => {
      if (prev.includes(interestId)) {
        return prev.filter(id => id !== interestId);
      } else {
        return [...prev, interestId];
      }
    });
  };

  const handleSave = async () => {
    if (selectedInterests.length === 0) {
      Alert.alert(
        'Select Interests',
        'Please select at least one area you\'d like support with.'
      );
      return;
    }

    setLoading(true);
    try {
      const result = await updateProfile({ interests: selectedInterests });

      if (result.success) {
        Alert.alert(
          'Interests Updated',
          'Your mental health interests have been updated successfully.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Update Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Updating interests..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mental Health Interests</Text>
        <Text style={styles.subtitle}>
          Select areas you'd like support with. This helps us personalize your experience.
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Selected Count */}
        <View style={styles.countSection}>
          <Text style={styles.countText}>
            {selectedInterests.length} interest{selectedInterests.length !== 1 ? 's' : ''} selected
          </Text>
        </View>

        {/* Interests Grid */}
        <View style={styles.interestsContainer}>
          {mentalHealthInterests.map((interest) => {
            const isSelected = selectedInterests.includes(interest.id);
            return (
              <TouchableOpacity
                key={interest.id}
                style={[
                  styles.interestCard,
                  isSelected && styles.interestCardSelected
                ]}
                onPress={() => toggleInterest(interest.id)}
              >
                <Text style={styles.interestIcon}>{interest.icon}</Text>
                <Text style={[
                  styles.interestLabel,
                  isSelected && styles.interestLabelSelected
                ]}>
                  {interest.label}
                </Text>
                <Text style={[
                  styles.interestDescription,
                  isSelected && styles.interestDescriptionSelected
                ]}>
                  {interest.description}
                </Text>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔒 Privacy Note</Text>
          <Text style={styles.infoText}>
            Your interests help us show you relevant content and connect you with 
            peers who share similar experiences. This information is kept private 
            and secure.
          </Text>
        </View>

        {/* Save Button */}
        <Button
          title={`Save Interests (${selectedInterests.length} selected)`}
          onPress={handleSave}
          variant="primary"
          size="large"
          style={styles.saveButton}
          disabled={selectedInterests.length === 0}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.primary[500],
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  countSection: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  countText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.primary[600],
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  interestCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.gray[200],
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  interestCardSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  interestIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  interestLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  interestLabelSelected: {
    color: theme.colors.primary[700],
  },
  interestDescription: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },
  interestDescriptionSelected: {
    color: theme.colors.primary[600],
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: theme.colors.primary[50],
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary[500],
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary[700],
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.primary[600],
    lineHeight: 20,
  },
  saveButton: {
    marginBottom: 40,
  },
});