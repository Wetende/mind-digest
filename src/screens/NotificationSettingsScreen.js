import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';
import notificationService from '../services/notificationService';
import { Card, LoadingSpinner } from '../components';

export default function NotificationSettingsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    dailyReminders: true,
    milestones: true,
    engagementRecovery: true,
    crisisSupport: true,
    reminderTimes: [
      { hour: 9, minute: 0, label: 'Morning', enabled: true },
      { hour: 14, minute: 0, label: 'Afternoon', enabled: false },
      { hour: 19, minute: 0, label: 'Evening', enabled: true }
    ]
  });

  useEffect(() => {
    loadNotificationPreferences();
  }, []);

  const loadNotificationPreferences = async () => {
    try {
      const result = await notificationService.getUserNotificationPreferences(user.id);
      if (result.success) {
        setPreferences(result.data);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    try {
      const result = await notificationService.updateNotificationPreferences(user.id, preferences);
      if (result.success) {
        Alert.alert('Settings Saved', 'Your notification preferences have been updated.');
      } else {
        Alert.alert('Error', 'Failed to save notification preferences.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleReminderTime = (index) => {
    setPreferences(prev => ({
      ...prev,
      reminderTimes: prev.reminderTimes.map((time, i) => 
        i === index ? { ...time, enabled: !time.enabled } : time
      )
    }));
  };

  const updateReminderTime = (index, hour, minute) => {
    setPreferences(prev => ({
      ...prev,
      reminderTimes: prev.reminderTimes.map((time, i) => 
        i === index ? { ...time, hour, minute } : time
      )
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading notification settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSavePreferences}
          disabled={saving}
        >
          <Text style={[styles.saveButtonText, saving && styles.disabledText]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* General Notifications */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>General Notifications</Text>
          <Text style={styles.sectionDescription}>
            Control which types of notifications you receive
          </Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={24} color="#007AFF" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Daily Reminders</Text>
                <Text style={styles.settingSubtitle}>
                  Get reminded to complete your wellness tasks
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.dailyReminders}
              onValueChange={() => togglePreference('dailyReminders')}
              trackColor={{ false: '#e1e5e9', true: '#007AFF' }}
              thumbColor={preferences.dailyReminders ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="trophy-outline" size={24} color="#FFD700" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Milestone Celebrations</Text>
                <Text style={styles.settingSubtitle}>
                  Get notified when you achieve milestones
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.milestones}
              onValueChange={() => togglePreference('milestones')}
              trackColor={{ false: '#e1e5e9', true: '#007AFF' }}
              thumbColor={preferences.milestones ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="heart-outline" size={24} color="#FF6B6B" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Engagement Recovery</Text>
                <Text style={styles.settingSubtitle}>
                  Gentle reminders when you've been away
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.engagementRecovery}
              onValueChange={() => togglePreference('engagementRecovery')}
              trackColor={{ false: '#e1e5e9', true: '#007AFF' }}
              thumbColor={preferences.engagementRecovery ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="medical-outline" size={24} color="#DC2626" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Crisis Support</Text>
                <Text style={styles.settingSubtitle}>
                  Important notifications for crisis resources
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.crisisSupport}
              onValueChange={() => togglePreference('crisisSupport')}
              trackColor={{ false: '#e1e5e9', true: '#007AFF' }}
              thumbColor={preferences.crisisSupport ? '#fff' : '#f4f3f4'}
            />
          </View>
        </Card>

        {/* Reminder Times */}
        {preferences.dailyReminders && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder Times</Text>
            <Text style={styles.sectionDescription}>
              Choose when you'd like to receive daily reminders
            </Text>

            {preferences.reminderTimes.map((time, index) => (
              <View key={index} style={styles.timeItem}>
                <View style={styles.timeInfo}>
                  <Ionicons 
                    name={time.label === 'Morning' ? 'sunny-outline' : 
                          time.label === 'Afternoon' ? 'partly-sunny-outline' : 'moon-outline'} 
                    size={20} 
                    color="#666" 
                  />
                  <View style={styles.timeText}>
                    <Text style={styles.timeLabel}>{time.label}</Text>
                    <Text style={styles.timeValue}>
                      {String(time.hour).padStart(2, '0')}:{String(time.minute).padStart(2, '0')}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={time.enabled}
                  onValueChange={() => toggleReminderTime(index)}
                  trackColor={{ false: '#e1e5e9', true: '#007AFF' }}
                  thumbColor={time.enabled ? '#fff' : '#f4f3f4'}
                />
              </View>
            ))}

            <TouchableOpacity style={styles.customizeButton}>
              <Ionicons name="time-outline" size={20} color="#007AFF" />
              <Text style={styles.customizeButtonText}>Customize Times</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Notification Info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About Notifications</Text>
          <View style={styles.infoItem}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              Notifications help you stay consistent with your wellness journey. 
              You can always adjust these settings later.
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#28a745" />
            <Text style={styles.infoText}>
              Your notification preferences are private and stored securely.
            </Text>
          </View>
        </Card>

        {/* Test Notification */}
        <Card style={styles.section}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={async () => {
              const result = await notificationService.scheduleEngagementRecovery(
                user.id,
                'This is a test notification from Mind-digest! 🌟',
                0.01 // 36 seconds delay
              );
              if (result.success) {
                Alert.alert('Test Sent', 'You should receive a test notification shortly.');
              }
            }}
          >
            <Ionicons name="send-outline" size={20} color="#007AFF" />
            <Text style={styles.testButtonText}>Send Test Notification</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
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
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  disabledText: {
    color: '#ccc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeText: {
    marginLeft: 12,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  timeValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    gap: 8,
  },
  customizeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    flex: 1,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    gap: 8,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
});