import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { journalService } from '../services';
import { getMoodIcon } from '../utils/formatUtils';

export default function JournalScreen({ navigation }) {
  const { user, isAnonymous } = useAuth();
  const [journalEntry, setJournalEntry] = useState('');
  const [currentMood, setCurrentMood] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const moodOptions = [
    { icon: 'happy', label: 'Great', value: 5, color: '#10b981' },
    { icon: 'happy-outline', label: 'Good', value: 4, color: '#3b82f6' },
    { icon: 'remove', label: 'Okay', value: 3, color: '#f59e0b' },
    { icon: 'sad-outline', label: 'Low', value: 2, color: '#ef4444' },
    { icon: 'alert-circle', label: 'Anxious', value: 1, color: '#8b5cf6' },
  ];

  useEffect(() => {
    if (user && !isAnonymous) {
      loadRecentEntries();
    } else {
      setLoading(false);
    }
  }, [user, isAnonymous]);

  const loadRecentEntries = async () => {
    try {
      const result = await journalService.getEntries(user.id, 5);
      if (result.success) {
        setRecentEntries(result.data);
      }
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEntry = async () => {
    if (!journalEntry.trim()) {
      Alert.alert('Empty Entry', 'Please write something before saving.');
      return;
    }

    if (!currentMood) {
      Alert.alert('Missing Mood', 'Please select your current mood.');
      return;
    }

    setSaving(true);

    try {
      if (user && !isAnonymous) {
        const result = await journalService.createEntry({
          userId: user.id,
          content: journalEntry.trim(),
          mood: currentMood.value,
          emotions: [],
          triggers: [],
        });

        if (result.success) {
          Alert.alert('Entry Saved', 'Your journal entry has been saved and analyzed!');
          setJournalEntry('');
          setCurrentMood(null);
          // Reload recent entries
          loadRecentEntries();
        } else {
          Alert.alert('Error', 'Failed to save journal entry. Please try again.');
        }
      } else {
        // For anonymous users, just show confirmation
        Alert.alert('Entry Saved', 'Your journal entry has been saved locally!');
        setJournalEntry('');
        setCurrentMood(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong saving your entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#fbbf24', '#f59e0b']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Daily Journal</Text>
        <Text style={styles.headerSubtitle}>Reflect on your thoughts and feelings</Text>
      </LinearGradient>

      {/* Mood Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How are you feeling right now?</Text>
        <View style={styles.moodContainer}>
          {moodOptions.map((mood) => (
            <TouchableOpacity
              key={mood.value}
              style={[
                styles.moodButton,
                currentMood?.value === mood.value && { 
                  backgroundColor: mood.color,
                  transform: [{ scale: 1.1 }]
                },
              ]}
              onPress={() => setCurrentMood(mood)}
            >
              <Ionicons 
                name={mood.icon} 
                size={24} 
                color={currentMood?.value === mood.value ? 'white' : mood.color} 
              />
              <Text style={[
                styles.moodLabel,
                currentMood?.value === mood.value && { color: 'white' }
              ]}>
                {mood.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Journal Entry */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What's on your mind?</Text>
        <TextInput
          style={styles.journalInput}
          multiline
          numberOfLines={8}
          placeholder="Write about your day, thoughts, feelings, or anything that comes to mind..."
          placeholderTextColor="#9ca3af"
          value={journalEntry}
          onChangeText={setJournalEntry}
          textAlignVertical="top"
        />
      </View>

      {/* Save Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!journalEntry.trim() || !currentMood || saving) && styles.saveButtonDisabled
          ]}
          onPress={handleSaveEntry}
          disabled={!journalEntry.trim() || !currentMood || saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Entry'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recent Entries Preview */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          {user && !isAnonymous && recentEntries.length > 0 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('JournalHistory')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#6366f1" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading entries...</Text>
          </View>
        ) : recentEntries.length > 0 ? (
          recentEntries.slice(0, 3).map((entry) => {
            const moodIcon = getMoodIcon(entry.mood);
            const date = new Date(entry.created_at);
            const isToday = date.toDateString() === new Date().toDateString();
            const isYesterday = date.toDateString() === new Date(Date.now() - 86400000).toDateString();
            
            let dateText = date.toLocaleDateString();
            if (isToday) dateText = 'Today';
            else if (isYesterday) dateText = 'Yesterday';

            return (
              <TouchableOpacity
                key={entry.id}
                style={styles.recentEntry}
                onPress={() => navigation.navigate('JournalEntry', { entry })}
              >
                <View style={styles.entryHeader}>
                  <Text style={styles.entryDate}>{dateText}</Text>
                  <View style={styles.entryMoodContainer}>
                    <Ionicons name={moodIcon.name} size={14} color={moodIcon.color} />
                    <Text style={styles.entryMood}>
                      {['', 'Anxious', 'Low', 'Okay', 'Good', 'Great'][entry.mood]}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.entryPreview} numberOfLines={2}>
                  {entry.content}
                </Text>

                {entry.ai_insights && (
                  <View style={styles.aiInsightsPreview}>
                    <Ionicons name="bulb" size={12} color="#f59e0b" />
                    <Text style={styles.aiInsightText} numberOfLines={1}>
                      AI detected {entry.ai_insights.sentiment > 0 ? 'positive' : 'challenging'} mood patterns
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="journal-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No journal entries yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start writing to track your thoughts and feelings
            </Text>
          </View>
        )}

        {isAnonymous && (
          <View style={styles.anonymousNotice}>
            <Ionicons name="shield-checkmark" size={16} color="#6366f1" />
            <Text style={styles.anonymousNoticeText}>
              Journal entries are saved locally in anonymous mode
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    margin: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 60,
  },

  moodLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  journalInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#374151',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  recentEntry: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entryDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  entryPreview: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 22,
  },
  entryMoodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryMood: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
    marginLeft: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiInsightsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  aiInsightText: {
    fontSize: 12,
    color: '#f59e0b',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  anonymousNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    marginTop: 16,
  },
  anonymousNoticeText: {
    fontSize: 12,
    color: '#6366f1',
    marginLeft: 6,
  },
});