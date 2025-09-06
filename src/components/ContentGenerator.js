import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import shareableContentService from '../services/shareableContentService';
import dailyPromptService from '../services/dailyPromptService';

const ContentGenerator = ({ userId, onContentGenerated, initialType = 'mood_update' }) => {
  const [contentType, setContentType] = useState(initialType);
  const [message, setMessage] = useState('');
  const [mood, setMood] = useState(5);
  const [achievement, setAchievement] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['instagram', 'x']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [todaysPrompt, setTodaysPrompt] = useState(null);

  const contentTypes = [
    { key: 'mood_update', label: 'Mood Update', icon: 'happy-outline' },
    { key: 'achievement', label: 'Achievement', icon: 'trophy-outline' },
    { key: 'tip', label: 'Wellness Tip', icon: 'bulb-outline' },
    { key: 'quote', label: 'Quote', icon: 'chatbubble-outline' },
    { key: 'prompt_response', label: 'Daily Reflection', icon: 'journal-outline' },
    { key: 'milestone', label: 'Milestone', icon: 'flag-outline' }
  ];

  const platforms = [
    { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
    { key: 'tiktok', label: 'TikTok', icon: 'musical-notes-outline', color: '#000000' },
    { key: 'x', label: 'X (Twitter)', icon: 'logo-twitter', color: '#1DA1F2' },
    { key: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: '#1877F2' }
  ];

  useEffect(() => {
    loadTodaysPrompt();
  }, []);

  const loadTodaysPrompt = async () => {
    try {
      const prompt = await dailyPromptService.getTodaysPrompt(userId);
      setTodaysPrompt(prompt);
    } catch (error) {
      console.error('Error loading today\'s prompt:', error);
    }
  };

  const handleGenerateContent = async () => {
    if (!message.trim() && contentType !== 'tip' && contentType !== 'quote') {
      Alert.alert('Missing Content', 'Please enter some content to share.');
      return;
    }

    if (selectedPlatforms.length === 0) {
      Alert.alert('No Platforms', 'Please select at least one platform to share to.');
      return;
    }

    setIsGenerating(true);

    try {
      const contentData = {
        type: contentType,
        message: message.trim(),
        mood: contentType === 'mood_update' ? mood : undefined,
        achievement: contentType === 'achievement' || contentType === 'milestone' ? achievement : undefined,
        promptResponse: contentType === 'prompt_response' ? message.trim() : undefined,
        platforms: selectedPlatforms
      };

      const generatedContent = await shareableContentService.generateShareableContent(
        contentData,
        userId,
        isAnonymous
      );

      onContentGenerated(generatedContent);
      
      // Reset form
      setMessage('');
      setAchievement('');
      setMood(5);

      Alert.alert('Success', 'Content generated successfully! You can now share it to your selected platforms.');

    } catch (error) {
      console.error('Error generating content:', error);
      Alert.alert('Error', 'Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlatform = (platformKey) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platformKey)) {
        return prev.filter(p => p !== platformKey);
      } else {
        return [...prev, platformKey];
      }
    });
  };

  const renderMoodSlider = () => {
    if (contentType !== 'mood_update') return null;

    return (
      <View style={styles.moodContainer}>
        <Text style={styles.label}>Current Mood (1-10)</Text>
        <View style={styles.moodSlider}>
          <Text style={styles.moodValue}>{mood}</Text>
          <View style={styles.moodButtons}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.moodButton,
                  mood === value && styles.moodButtonActive
                ]}
                onPress={() => setMood(value)}
              >
                <Text style={[
                  styles.moodButtonText,
                  mood === value && styles.moodButtonTextActive
                ]}>
                  {value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderPromptSection = () => {
    if (contentType !== 'prompt_response' || !todaysPrompt) return null;

    return (
      <View style={styles.promptContainer}>
        <Text style={styles.promptLabel}>Today's Prompt:</Text>
        <Text style={styles.promptText}>{todaysPrompt.promptText}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Create Shareable Content</Text>

      {/* Content Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Content Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
          {contentTypes.map(type => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.typeButton,
                contentType === type.key && styles.typeButtonActive
              ]}
              onPress={() => setContentType(type.key)}
            >
              <Ionicons
                name={type.icon}
                size={20}
                color={contentType === type.key ? '#FFFFFF' : '#666666'}
              />
              <Text style={[
                styles.typeButtonText,
                contentType === type.key && styles.typeButtonTextActive
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Prompt Section */}
      {renderPromptSection()}

      {/* Content Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {contentType === 'tip' || contentType === 'quote' 
            ? 'Custom Message (Optional)' 
            : 'Your Message'
          }
        </Text>
        <TextInput
          style={styles.textInput}
          placeholder={
            contentType === 'mood_update' ? "How are you feeling today?" :
            contentType === 'achievement' ? "What did you accomplish?" :
            contentType === 'tip' ? "Share a wellness tip..." :
            contentType === 'quote' ? "Share an inspiring quote..." :
            contentType === 'prompt_response' ? "Your response to today's prompt..." :
            "What milestone did you reach?"
          }
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Achievement Input */}
      {(contentType === 'achievement' || contentType === 'milestone') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievement/Milestone</Text>
          <TextInput
            style={styles.input}
            placeholder="Describe your achievement..."
            value={achievement}
            onChangeText={setAchievement}
          />
        </View>
      )}

      {/* Mood Slider */}
      {renderMoodSlider()}

      {/* Platform Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Share To</Text>
        <View style={styles.platformGrid}>
          {platforms.map(platform => (
            <TouchableOpacity
              key={platform.key}
              style={[
                styles.platformButton,
                selectedPlatforms.includes(platform.key) && styles.platformButtonActive
              ]}
              onPress={() => togglePlatform(platform.key)}
            >
              <Ionicons
                name={platform.icon}
                size={24}
                color={selectedPlatforms.includes(platform.key) ? '#FFFFFF' : platform.color}
              />
              <Text style={[
                styles.platformButtonText,
                selectedPlatforms.includes(platform.key) && styles.platformButtonTextActive
              ]}>
                {platform.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Privacy Settings */}
      <View style={styles.section}>
        <View style={styles.privacyRow}>
          <View style={styles.privacyInfo}>
            <Text style={styles.sectionTitle}>Anonymous Sharing</Text>
            <Text style={styles.privacyDescription}>
              Remove personal information to protect your privacy
            </Text>
          </View>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
            thumbColor={isAnonymous ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
        onPress={handleGenerateContent}
        disabled={isGenerating}
      >
        <Ionicons
          name={isGenerating ? 'hourglass-outline' : 'create-outline'}
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.generateButtonText}>
          {isGenerating ? 'Generating...' : 'Generate Content'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 20,
    textAlign: 'center'
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12
  },
  typeScroll: {
    flexDirection: 'row'
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  typeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666666'
  },
  typeButtonTextActive: {
    color: '#FFFFFF'
  },
  promptContainer: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24
  },
  promptLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8
  },
  promptText: {
    fontSize: 16,
    color: '#2C3E50',
    fontStyle: 'italic'
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    color: '#2C3E50'
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C3E50'
  },
  moodContainer: {
    marginBottom: 24
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12
  },
  moodSlider: {
    alignItems: 'center'
  },
  moodValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 12
  },
  moodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  moodButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4
  },
  moodButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  moodButtonText: {
    fontSize: 14,
    color: '#666666'
  },
  moodButtonTextActive: {
    color: '#FFFFFF'
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  platformButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  platformButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },
  platformButtonText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666666',
    flex: 1
  },
  platformButtonTextActive: {
    color: '#FFFFFF'
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  privacyInfo: {
    flex: 1
  },
  privacyDescription: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32
  },
  generateButtonDisabled: {
    backgroundColor: '#CCCCCC'
  },
  generateButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  }
});

export default ContentGenerator;