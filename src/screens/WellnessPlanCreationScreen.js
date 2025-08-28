import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';
import wellnessPlanService from '../services/wellnessPlanService';
import { Button, Card, LoadingSpinner } from '../components';

export default function WellnessPlanCreationScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    goals: [],
    preferences: {
      duration: 8,
      tasksPerDay: 3,
      difficulty: 'beginner',
      focusAreas: [],
      timeOfDay: 'morning'
    }
  });

  const goalOptions = [
    { id: 'anxiety', label: 'Manage Anxiety', icon: 'heart-outline' },
    { id: 'mood', label: 'Improve Mood', icon: 'happy-outline' },
    { id: 'social', label: 'Build Social Confidence', icon: 'people-outline' },
    { id: 'stress', label: 'Reduce Stress', icon: 'leaf-outline' },
    { id: 'habits', label: 'Build Healthy Habits', icon: 'checkmark-circle-outline' },
    { id: 'sleep', label: 'Better Sleep', icon: 'moon-outline' },
    { id: 'focus', label: 'Improve Focus', icon: 'eye-outline' },
    { id: 'relationships', label: 'Better Relationships', icon: 'heart-circle-outline' }
  ];

  const focusAreaOptions = [
    { id: 'mindfulness', label: 'Mindfulness & Meditation' },
    { id: 'exercise', label: 'Physical Activity' },
    { id: 'social', label: 'Social Skills' },
    { id: 'journaling', label: 'Journaling & Reflection' },
    { id: 'breathing', label: 'Breathing Exercises' },
    { id: 'self_care', label: 'Self-Care Activities' },
    { id: 'learning', label: 'Learning & Growth' },
    { id: 'creative', label: 'Creative Expression' }
  ];

  const handleGoalToggle = (goalId) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter(g => g !== goalId)
        : [...prev.goals, goalId]
    }));
  };

  const handleFocusAreaToggle = (areaId) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        focusAreas: prev.preferences.focusAreas.includes(areaId)
          ? prev.preferences.focusAreas.filter(a => a !== areaId)
          : [...prev.preferences.focusAreas, areaId]
      }
    }));
  };

  const handleCreatePlan = async () => {
    if (formData.goals.length === 0) {
      Alert.alert('Missing Goals', 'Please select at least one goal for your wellness plan.');
      return;
    }

    setLoading(true);
    try {
      const result = await wellnessPlanService.generateWellnessPlan(
        user.id,
        formData.goals,
        formData.preferences
      );

      if (result.success) {
        Alert.alert(
          'Plan Created!',
          'Your personalized wellness plan has been created successfully.',
          [
            {
              text: 'View Plan',
              onPress: () => navigation.navigate('WellnessPlan', { planId: result.data.id })
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create wellness plan');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What are your wellness goals?</Text>
      <Text style={styles.stepDescription}>
        Select the areas you'd like to focus on. You can choose multiple goals.
      </Text>
      
      <View style={styles.optionsGrid}>
        {goalOptions.map(goal => (
          <TouchableOpacity
            key={goal.id}
            style={[
              styles.optionCard,
              formData.goals.includes(goal.id) && styles.optionCardSelected
            ]}
            onPress={() => handleGoalToggle(goal.id)}
          >
            <Ionicons
              name={goal.icon}
              size={32}
              color={formData.goals.includes(goal.id) ? '#007AFF' : '#666'}
            />
            <Text style={[
              styles.optionLabel,
              formData.goals.includes(goal.id) && styles.optionLabelSelected
            ]}>
              {goal.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Customize your plan</Text>
      <Text style={styles.stepDescription}>
        Let's personalize your wellness plan to fit your lifestyle.
      </Text>

      <Card style={styles.preferenceCard}>
        <Text style={styles.preferenceLabel}>Plan Duration</Text>
        <View style={styles.durationOptions}>
          {[4, 6, 8, 12].map(weeks => (
            <TouchableOpacity
              key={weeks}
              style={[
                styles.durationOption,
                formData.preferences.duration === weeks && styles.durationOptionSelected
              ]}
              onPress={() => setFormData(prev => ({
                ...prev,
                preferences: { ...prev.preferences, duration: weeks }
              }))}
            >
              <Text style={[
                styles.durationText,
                formData.preferences.duration === weeks && styles.durationTextSelected
              ]}>
                {weeks} weeks
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.preferenceCard}>
        <Text style={styles.preferenceLabel}>Daily Tasks</Text>
        <View style={styles.durationOptions}>
          {[2, 3, 4, 5].map(tasks => (
            <TouchableOpacity
              key={tasks}
              style={[
                styles.durationOption,
                formData.preferences.tasksPerDay === tasks && styles.durationOptionSelected
              ]}
              onPress={() => setFormData(prev => ({
                ...prev,
                preferences: { ...prev.preferences, tasksPerDay: tasks }
              }))}
            >
              <Text style={[
                styles.durationText,
                formData.preferences.tasksPerDay === tasks && styles.durationTextSelected
              ]}>
                {tasks} tasks
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.preferenceCard}>
        <Text style={styles.preferenceLabel}>Difficulty Level</Text>
        <View style={styles.durationOptions}>
          {[
            { id: 'beginner', label: 'Beginner' },
            { id: 'intermediate', label: 'Intermediate' },
            { id: 'advanced', label: 'Advanced' }
          ].map(level => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.durationOption,
                formData.preferences.difficulty === level.id && styles.durationOptionSelected
              ]}
              onPress={() => setFormData(prev => ({
                ...prev,
                preferences: { ...prev.preferences, difficulty: level.id }
              }))}
            >
              <Text style={[
                styles.durationText,
                formData.preferences.difficulty === level.id && styles.durationTextSelected
              ]}>
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choose your focus areas</Text>
      <Text style={styles.stepDescription}>
        Select the types of activities you'd like to include in your plan.
      </Text>
      
      <View style={styles.focusAreasContainer}>
        {focusAreaOptions.map(area => (
          <TouchableOpacity
            key={area.id}
            style={[
              styles.focusAreaCard,
              formData.preferences.focusAreas.includes(area.id) && styles.focusAreaCardSelected
            ]}
            onPress={() => handleFocusAreaToggle(area.id)}
          >
            <Text style={[
              styles.focusAreaLabel,
              formData.preferences.focusAreas.includes(area.id) && styles.focusAreaLabelSelected
            ]}>
              {area.label}
            </Text>
            {formData.preferences.focusAreas.includes(area.id) && (
              <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Creating your personalized wellness plan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Wellness Plan</Text>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>{step}/3</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.footer}>
        {step < 3 ? (
          <Button
            title="Next"
            onPress={() => setStep(step + 1)}
            disabled={step === 1 && formData.goals.length === 0}
            style={styles.nextButton}
          />
        ) : (
          <Button
            title="Create My Plan"
            onPress={handleCreatePlan}
            disabled={loading}
            style={styles.createButton}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  stepIndicator: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  stepText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    paddingVertical: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e1e5e9',
  },
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  optionLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: '#007AFF',
  },
  preferenceCard: {
    marginBottom: 20,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  durationOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  durationTextSelected: {
    color: '#fff',
  },
  focusAreasContainer: {
    gap: 12,
  },
  focusAreaCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#e1e5e9',
  },
  focusAreaCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  focusAreaLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  focusAreaLabelSelected: {
    color: '#007AFF',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  nextButton: {
    backgroundColor: '#007AFF',
  },
  createButton: {
    backgroundColor: '#28a745',
  },
});