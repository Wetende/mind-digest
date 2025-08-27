import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../theme';

export default function AnonymousSetupScreen({ navigation }) {
  const { signInAnonymously } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const toggleInterest = (interestId) => {
    setSelectedInterests(prev => {
      if (prev.includes(interestId)) {
        return prev.filter(id => id !== interestId);
      } else {
        return [...prev, interestId];
      }
    });
  };

  const handleContinueAnonymously = async () => {
    if (selectedInterests.length === 0) {
      Alert.alert(
        'Select Interests',
        'Please select at least one area you\'d like support with.'
      );
      return;
    }

    setLoading(true);
    try {
      const result = await signInAnonymously(selectedInterests);
      
      if (result.success) {
        // Navigation will be handled automatically by AuthContext
        console.log('Anonymous user created with interests:', selectedInterests);
      } else {
        Alert.alert('Error', 'Failed to create anonymous session. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          
          <LinearGradient
            colors={['#8b5cf6', '#6366f1']}
            style={styles.headerGradient}
          >
            <Text style={styles.headerIcon}>🕶️</Text>
            <Text style={styles.title}>Anonymous Mode</Text>
            <Text style={styles.subtitle}>
              Your privacy is protected. No personal information required.
            </Text>
          </LinearGradient>
        </View>

        {/* Privacy Benefits */}
        <View style={styles.privacySection}>
          <Text style={styles.sectionTitle}>What Anonymous Mode Offers:</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>🔒</Text>
              <Text style={styles.benefitText}>Complete privacy protection</Text>
            </View>
            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>🤝</Text>
              <Text style={styles.benefitText}>Connect with peers safely</Text>
            </View>
            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>📝</Text>
              <Text style={styles.benefitText}>Journal without identity concerns</Text>
            </View>
            <View style={styles.benefit}>
              <Text style={styles.benefitIcon}>🛠️</Text>
              <Text style={styles.benefitText}>Access all wellness tools</Text>
            </View>
          </View>
        </View>

        {/* Interest Selection */}
        <View style={styles.interestsSection}>
          <Text style={styles.sectionTitle}>
            What areas would you like support with?
          </Text>
          <Text style={styles.sectionSubtitle}>
            This helps us personalize your experience (select all that apply)
          </Text>
          
          <View style={styles.interestsGrid}>
            {mentalHealthInterests.map((interest) => (
              <TouchableOpacity
                key={interest.id}
                style={[
                  styles.interestCard,
                  selectedInterests.includes(interest.id) && styles.interestCardSelected
                ]}
                onPress={() => toggleInterest(interest.id)}
              >
                <Text style={styles.interestIcon}>{interest.icon}</Text>
                <Text style={[
                  styles.interestLabel,
                  selectedInterests.includes(interest.id) && styles.interestLabelSelected
                ]}>
                  {interest.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Continue Button */}
        <View style={styles.actionSection}>
          <Button
            title={`Continue Anonymously (${selectedInterests.length} selected)`}
            onPress={handleContinueAnonymously}
            variant="primary"
            size="large"
            disabled={selectedInterests.length === 0 || loading}
            style={styles.continueButton}
          />
          
          <TouchableOpacity
            style={styles.createAccountLink}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.createAccountText}>
              Want to save your progress? <Text style={styles.linkText}>Create Account</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Text style={styles.privacyNoteText}>
            🔒 In anonymous mode, your data is stored locally and not linked to any personal information. 
            You can upgrade to a full account anytime to sync across devices.
          </Text>
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
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.primary[500],
  },
  headerGradient: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  privacySection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  benefitsList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    ...theme.shadow.base,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  benefitText: {
    fontSize: 16,
    color: theme.colors.text.primary,
    flex: 1,
  },
  interestsSection: {
    marginBottom: 32,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  interestCard: {
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
  interestCardSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  interestIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  interestLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  interestLabelSelected: {
    color: theme.colors.primary[600],
  },
  actionSection: {
    marginBottom: 24,
  },
  continueButton: {
    marginBottom: 16,
  },
  createAccountLink: {
    alignItems: 'center',
  },
  createAccountText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  linkText: {
    color: theme.colors.primary[500],
    fontWeight: '500',
  },
  privacyNote: {
    backgroundColor: theme.colors.primary[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 40,
  },
  privacyNoteText: {
    fontSize: 12,
    color: theme.colors.primary[700],
    lineHeight: 16,
    textAlign: 'center',
  },
});