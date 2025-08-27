import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components';
import { theme } from '../../theme';

export default function ProfileSetupScreen({ navigation }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [profileData, setProfileData] = useState({
    interests: [],
    goals: [],
    privacyLevel: 'friends',
    shareProgress: false,
    notifications: true,
  });

  const mentalHealthInterests = [
    { id: 'social-anxiety', label: 'Social Anxiety', icon: '😰' },
    { id: 'general-anxiety', label: 'General Anxiety', icon: '😟' },
    { id: 'depression', label: 'Depression', icon: '😔' },
    { id: 'stress-management', label: 'Stress Management', icon: '😤' },
    { id: 'mindfulness', label: 'Mindfulness', icon: '🧘' },
    { id: 'self-care', label: 'Self Care', icon: '💆' },
    { id: 'relationships', label: 'Relationships', icon: '💕' },
    { id: 'work-life-balance', label: 'Work-Life Balance', icon: '⚖️' },
    { id: 'sleep-issues', label: 'Sleep Issues', icon: '😴' },
    { id: 'confidence', label: 'Building Confidence', icon: '💪' },
  ];

  const wellnessGoals = [
    { id: 'reduce-anxiety', label: 'Reduce Anxiety', icon: '🎯' },
    { id: 'improve-mood', label: 'Improve Mood', icon: '😊' },
    { id: 'better-sleep', label: 'Better Sleep', icon: '😴' },
    { id: 'social-skills', label: 'Social Skills', icon: '🗣️' },
    { id: 'stress-relief', label: 'Stress Relief', icon: '😌' },
    { id: 'self-confidence', label: 'Self Confidence', icon: '💪' },
    { id: 'emotional-regulation', label: 'Emotional Balance', icon: '⚖️' },
    { id: 'mindful-living', label: 'Mindful Living', icon: '🧘' },
  ];

  const toggleSelection = (field, itemId) => {
    setProfileData(prev => ({
      ...prev,
      [field]: prev[field].includes(itemId)
        ? prev[field].filter(id => id !== itemId)
        : [...prev[field], itemId]
    }));
  };

  const handleNext = () => {
    if (currentStep === 1 && profileData.interests.length === 0) {
      Alert.alert('Select Interests', 'Please select at least one area of interest.');
      return;
    }
    if (currentStep === 2 && profileData.goals.length === 0) {
      Alert.alert('Select Goals', 'Please select at least one wellness goal.');
      return;
    }
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      // TODO: Save profile data to Supabase
      console.log('Profile setup completed:', profileData);
      
      Alert.alert(
        'Profile Complete!',
        'Welcome to Mind-digest. Your personalized experience is ready.',
        [
          {
            text: 'Get Started',
            onPress: () => navigation.reset({
              index: 0,
              routes: [{ name: 'MainApp' }],
            }),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive
          ]}>
            <Text style={[
              styles.stepNumber,
              currentStep >= step && styles.stepNumberActive
            ]}>
              {step}
            </Text>
          </View>
          {step < 3 && (
            <View style={[
              styles.stepLine,
              currentStep > step && styles.stepLineActive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What brings you here?</Text>
      <Text style={styles.stepSubtitle}>
        Select the areas where you'd like support (choose all that apply)
      </Text>
      
      <View style={styles.optionsGrid}>
        {mentalHealthInterests.map((interest) => (
          <TouchableOpacity
            key={interest.id}
            style={[
              styles.optionCard,
              profileData.interests.includes(interest.id) && styles.optionCardSelected
            ]}
            onPress={() => toggleSelection('interests', interest.id)}
          >
            <Text style={styles.optionIcon}>{interest.icon}</Text>
            <Text style={[
              styles.optionLabel,
              profileData.interests.includes(interest.id) && styles.optionLabelSelected
            ]}>
              {interest.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What are your wellness goals?</Text>
      <Text style={styles.stepSubtitle}>
        Help us personalize your Mind-digest experience
      </Text>
      
      <View style={styles.optionsGrid}>
        {wellnessGoals.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[
              styles.optionCard,
              profileData.goals.includes(goal.id) && styles.optionCardSelected
            ]}
            onPress={() => toggleSelection('goals', goal.id)}
          >
            <Text style={styles.optionIcon}>{goal.icon}</Text>
            <Text style={[
              styles.optionLabel,
              profileData.goals.includes(goal.id) && styles.optionLabelSelected
            ]}>
              {goal.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Privacy & Preferences</Text>
      <Text style={styles.stepSubtitle}>
        Customize how you want to use Mind-digest
      </Text>
      
      <View style={styles.preferencesContainer}>
        <View style={styles.preferenceSection}>
          <Text style={styles.preferenceTitle}>Privacy Level</Text>
          <View style={styles.privacyOptions}>
            {[
              { id: 'private', label: 'Private', desc: 'Only you can see your activity' },
              { id: 'friends', label: 'Friends', desc: 'Share with connected peers' },
              { id: 'public', label: 'Community', desc: 'Visible to Mind-digest community' },
            ].map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.privacyOption,
                  profileData.privacyLevel === option.id && styles.privacyOptionSelected
                ]}
                onPress={() => setProfileData(prev => ({ ...prev, privacyLevel: option.id }))}
              >
                <View style={styles.privacyOptionContent}>
                  <Text style={styles.privacyOptionLabel}>{option.label}</Text>
                  <Text style={styles.privacyOptionDesc}>{option.desc}</Text>
                </View>
                <View style={[
                  styles.radioButton,
                  profileData.privacyLevel === option.id && styles.radioButtonSelected
                ]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.preferenceSection}>
          <View style={styles.switchPreference}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Share Progress</Text>
              <Text style={styles.switchDesc}>Allow sharing achievements with peers</Text>
            </View>
            <Switch
              value={profileData.shareProgress}
              onValueChange={(value) => setProfileData(prev => ({ ...prev, shareProgress: value }))}
              trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary[500] }}
              thumbColor={profileData.shareProgress ? 'white' : theme.colors.gray[400]}
            />
          </View>

          <View style={styles.switchPreference}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchLabel}>Notifications</Text>
              <Text style={styles.switchDesc}>Daily reminders and wellness tips</Text>
            </View>
            <Switch
              value={profileData.notifications}
              onValueChange={(value) => setProfileData(prev => ({ ...prev, notifications: value }))}
              trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary[500] }}
              thumbColor={profileData.notifications ? 'white' : theme.colors.gray[400]}
            />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Complete Your Profile</Text>
          <Text style={styles.headerSubtitle}>
            Step {currentStep} of 3
          </Text>
          {renderStepIndicator()}
        </LinearGradient>

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        {/* Navigation */}
        <View style={styles.navigation}>
          {currentStep > 1 && (
            <Button
              title="Back"
              onPress={() => setCurrentStep(currentStep - 1)}
              variant="secondary"
              size="medium"
              style={styles.backButton}
            />
          )}
          
          <Button
            title={currentStep === 3 ? 'Complete Setup' : 'Next'}
            onPress={handleNext}
            variant="primary"
            size="large"
            style={styles.nextButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 40,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: 'white',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  stepNumberActive: {
    color: theme.colors.primary[500],
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: 'white',
  },
  stepContent: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    ...theme.shadow.sm,
  },
  optionCardSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  optionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: theme.colors.primary[600],
  },
  preferencesContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    ...theme.shadow.base,
  },
  preferenceSection: {
    marginBottom: 24,
  },
  preferenceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  privacyOptions: {
    gap: 12,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
  },
  privacyOptionSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  privacyOptionContent: {
    flex: 1,
  },
  privacyOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  privacyOptionDesc: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.gray[400],
  },
  radioButtonSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[500],
  },
  switchPreference: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  switchDesc: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
});