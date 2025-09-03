import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { moodTrackingService, socialSharingService } from '../services';
import { LoadingSpinner, SocialShareButton } from '../components';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

const MOOD_EMOJIS = ['😢', '😟', '😐', '🙂', '😊', '😄', '🤩', '🥳', '😍', '🌟'];
const ENERGY_LEVELS = ['💤', '😴', '😑', '🙂', '😊', '💪', '⚡', '🔥', '🚀', '⭐'];

export default function MoodTrackingScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todaysEntry, setTodaysEntry] = useState(null);
  const [moodData, setMoodData] = useState({
    moodScore: 5,
    energyLevel: 5,
    anxietyLevel: 5,
    stressLevel: 5,
    sleepQuality: 5,
    socialInteractions: 0,
    exerciseMinutes: 0,
    symptoms: [],
    triggers: [],
    activities: [],
    notes: ''
  });

  const commonSymptoms = [
    'Headache', 'Fatigue', 'Restlessness', 'Difficulty concentrating',
    'Muscle tension', 'Sleep issues', 'Appetite changes', 'Irritability',
    'Racing thoughts', 'Social withdrawal'
  ];

  const commonTriggers = [
    'Work stress', 'Relationship issues', 'Financial concerns', 'Health worries',
    'Social situations', 'Weather changes', 'Lack of sleep', 'Caffeine',
    'Social media', 'News/current events'
  ];

  const helpfulActivities = [
    'Deep breathing', 'Meditation', 'Exercise', 'Talking to friends',
    'Journaling', 'Music', 'Nature walk', 'Reading', 'Creative activities',
    'Relaxation techniques'
  ];

  useEffect(() => {
    loadTodaysEntry();
  }, []);

  const loadTodaysEntry = async () => {
    setLoading(true);
    try {
      const result = await moodTrackingService.getTodaysMoodEntry(user.id);
      if (result.success && result.data) {
        setTodaysEntry(result.data);
        setMoodData({
          moodScore: result.data.mood_score || 5,
          energyLevel: result.data.energy_level || 5,
          anxietyLevel: result.data.anxiety_level || 5,
          stressLevel: result.data.stress_level || 5,
          sleepQuality: result.data.sleep_quality || 5,
          socialInteractions: result.data.social_interactions || 0,
          exerciseMinutes: result.data.exercise_minutes || 0,
          symptoms: result.data.symptoms || [],
          triggers: result.data.triggers || [],
          activities: result.data.activities || [],
          notes: result.data.notes || ''
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load today\'s mood entry');
    } finally {
      setLoading(false);
    }
  };

  const saveMoodEntry = async () => {
    setSaving(true);
    try {
      let result;
      if (todaysEntry) {
        result = await moodTrackingService.updateMoodEntry(todaysEntry.id, user.id, moodData);
      } else {
        result = await moodTrackingService.logMoodEntry(user.id, moodData);
      }

      if (result.success) {
        Alert.alert(
          'Mood Logged!',
          'Your mood entry has been saved successfully.',
          [
            { text: 'View History', onPress: () => navigation.navigate('MoodHistory') },
            { text: 'OK', style: 'default' }
          ]
        );
        setTodaysEntry(result.data);
      } else {
        Alert.alert('Error', 'Failed to save mood entry');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong saving your mood entry');
    } finally {
      setSaving(false);
    }
  };

  const renderSlider = (label, value, setValue, min = 1, max = 10, emojis = null) => (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <View style={styles.scoreContainer}>
          {emojis && <Text style={styles.emoji}>{emojis[value - 1]}</Text>}
          <Text style={styles.scoreText}>{value}/10</Text>
        </View>
      </View>
      
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${(value / max) * 100}%` }]} />
        <View style={styles.sliderDots}>
          {Array.from({ length: max }, (_, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.sliderDot,
                i + 1 <= value && styles.sliderDotActive
              ]}
              onPress={() => setValue(i + 1)}
            />
          ))}
        </View>
      </View>
    </View>
  );

  const renderMultiSelect = (title, options, selected, onToggle) => (
    <View style={styles.multiSelectContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.optionsGrid}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionChip,
              selected.includes(option) && styles.optionChipSelected
            ]}
            onPress={() => onToggle(option)}
          >
            <Text style={[
              styles.optionText,
              selected.includes(option) && styles.optionTextSelected
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const toggleOption = (option, field) => {
    setMoodData(prev => ({
      ...prev,
      [field]: prev[field].includes(option)
        ? prev[field].filter(item => item !== option)
        : [...prev[field], option]
    }));
  };

  if (loading) {
    return <LoadingSpinner text="Loading mood tracker..." />;
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
          <Text style={styles.headerTitle}>Daily Mood Check-in</Text>
          <Text style={styles.headerSubtitle}>
            {todaysEntry ? 'Update today\'s entry' : 'How are you feeling today?'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate('MoodHistory')}
        >
          <Ionicons name="analytics" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall Mood</Text>
          {renderSlider(
            'How would you rate your overall mood?',
            moodData.moodScore,
            (value) => setMoodData(prev => ({ ...prev, moodScore: value })),
            1, 10, MOOD_EMOJIS
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Energy & Physical State</Text>
          {renderSlider(
            'Energy Level',
            moodData.energyLevel,
            (value) => setMoodData(prev => ({ ...prev, energyLevel: value })),
            1, 10, ENERGY_LEVELS
          )}
          {renderSlider(
            'Sleep Quality (last night)',
            moodData.sleepQuality,
            (value) => setMoodData(prev => ({ ...prev, sleepQuality: value }))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mental State</Text>
          {renderSlider(
            'Anxiety Level',
            moodData.anxietyLevel,
            (value) => setMoodData(prev => ({ ...prev, anxietyLevel: value }))
          )}
          {renderSlider(
            'Stress Level',
            moodData.stressLevel,
            (value) => setMoodData(prev => ({ ...prev, stressLevel: value }))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activities & Social</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Social Interactions</Text>
              <TextInput
                style={styles.numberInput}
                value={moodData.socialInteractions.toString()}
                onChangeText={(text) => setMoodData(prev => ({ 
                  ...prev, 
                  socialInteractions: parseInt(text) || 0 
                }))}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Exercise (minutes)</Text>
              <TextInput
                style={styles.numberInput}
                value={moodData.exerciseMinutes.toString()}
                onChangeText={(text) => setMoodData(prev => ({ 
                  ...prev, 
                  exerciseMinutes: parseInt(text) || 0 
                }))}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
        </View>

        {renderMultiSelect(
          'Symptoms Experienced',
          commonSymptoms,
          moodData.symptoms,
          (option) => toggleOption(option, 'symptoms')
        )}

        {renderMultiSelect(
          'Potential Triggers',
          commonTriggers,
          moodData.triggers,
          (option) => toggleOption(option, 'triggers')
        )}

        {renderMultiSelect(
          'Helpful Activities',
          helpfulActivities,
          moodData.activities,
          (option) => toggleOption(option, 'activities')
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={moodData.notes}
            onChangeText={(text) => setMoodData(prev => ({ ...prev, notes: text }))}
            placeholder="Any additional thoughts, observations, or context about your day..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveMoodEntry}
          disabled={saving}
        >
          {saving ? (
            <LoadingSpinner size="small" color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <Text style={styles.saveButtonText}>
                {todaysEntry ? 'Update Entry' : 'Save Entry'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Social Sharing Section */}
        {todaysEntry && (
          <View style={styles.shareSection}>
            <View style={styles.shareHeader}>
              <Ionicons name="share-social" size={20} color={theme.colors.primary[600]} />
              <Text style={styles.shareTitle}>Share Your Progress</Text>
            </View>
            <Text style={styles.shareDescription}>
              Help others on their mental health journey by sharing your experience.
              Your data will be anonymized to protect your privacy.
            </Text>
            <SocialShareButton
              data={{
                mood: moodData.moodScore,
                emotion: MOOD_EMOJIS[moodData.moodScore - 1],
                energy: ENERGY_LEVELS[moodData.energyLevel - 1],
                note: moodData.notes,
                stress: moodData.stressLevel,
                anxiety: moodData.anxietyLevel,
                activities: moodData.activities.length,
                socialInteractions: moodData.socialInteractions,
                exerciseMinutes: moodData.exerciseMinutes
              }}
              templateType="mood"
              anonymous={true}
              userPreferences={{ anonymousOnly: false }}
              showText={true}
            />
          </View>
        )}

        <View style={styles.bottomPadding} />
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
  historyButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  sliderTrack: {
    height: 40,
    backgroundColor: theme.colors.gray[100],
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: theme.colors.primary[500],
    borderRadius: 20,
  },
  sliderDots: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  sliderDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.gray[300],
  },
  sliderDotActive: {
    backgroundColor: 'white',
    borderColor: 'white',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  numberInput: {
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  multiSelectContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  optionChip: {
    backgroundColor: theme.colors.gray[100],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  optionChipSelected: {
    backgroundColor: theme.colors.primary[100],
    borderColor: theme.colors.primary[500],
  },
  optionText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  optionTextSelected: {
    color: theme.colors.primary[700],
    fontWeight: '500',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: theme.colors.gray[50],
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 20,
    shadowColor: theme.colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.gray[400],
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  // Social Sharing Styles
  shareSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary[500],
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shareTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary[700],
    marginLeft: 8,
  },
  shareDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  bottomPadding: {
    height: 20,
  },
});
