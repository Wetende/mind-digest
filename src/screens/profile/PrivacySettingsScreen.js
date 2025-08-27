import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, LoadingSpinner } from '../../components';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../theme';

export default function PrivacySettingsScreen({ navigation }) {
  const { user, isAnonymous, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    profileVisibility: true,
    shareProgress: false,
    allowPeerMessages: true,
    shareJournalInsights: false,
    dataCollection: true,
    marketingEmails: false,
    pushNotifications: true,
    anonymousMode: false,
  });

  useEffect(() => {
    // Load current privacy settings from user profile
    if (user?.user_metadata?.privacy_settings) {
      setSettings(prev => ({
        ...prev,
        ...user.user_metadata.privacy_settings,
      }));
    }
    setSettings(prev => ({
      ...prev,
      anonymousMode: isAnonymous,
    }));
  }, [user, isAnonymous]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const result = await updateProfile({ 
        privacy_settings: settings,
        anonymous_mode: settings.anonymousMode,
      });

      if (result.success) {
        Alert.alert(
          'Privacy Settings Updated',
          'Your privacy preferences have been saved successfully.',
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Account Deletion',
              'Account deletion feature will be available soon. For now, please contact support if you need to delete your account.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Personal Data',
      'We will prepare a download of all your personal data. This may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export Data',
          onPress: () => {
            Alert.alert(
              'Data Export',
              'Data export feature will be available soon. You will receive an email when your data is ready for download.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingSpinner text="Updating privacy settings..." />;
  }

  const privacySettings = [
    {
      section: 'Profile & Visibility',
      items: [
        {
          key: 'profileVisibility',
          title: 'Profile Visibility',
          subtitle: 'Allow other users to see your profile',
          value: settings.profileVisibility,
        },
        {
          key: 'shareProgress',
          title: 'Share Progress',
          subtitle: 'Allow sharing your wellness progress with peers',
          value: settings.shareProgress,
        },
        {
          key: 'anonymousMode',
          title: 'Anonymous Mode',
          subtitle: 'Hide your identity in all interactions',
          value: settings.anonymousMode,
          disabled: isAnonymous, // Can't change if already anonymous
        },
      ],
    },
    {
      section: 'Communication',
      items: [
        {
          key: 'allowPeerMessages',
          title: 'Peer Messages',
          subtitle: 'Allow other users to send you direct messages',
          value: settings.allowPeerMessages,
        },
        {
          key: 'pushNotifications',
          title: 'Push Notifications',
          subtitle: 'Receive notifications for messages and updates',
          value: settings.pushNotifications,
        },
        {
          key: 'marketingEmails',
          title: 'Marketing Emails',
          subtitle: 'Receive emails about new features and tips',
          value: settings.marketingEmails,
        },
      ],
    },
    {
      section: 'Data & Analytics',
      items: [
        {
          key: 'shareJournalInsights',
          title: 'Share Journal Insights',
          subtitle: 'Allow anonymized insights to help improve the app',
          value: settings.shareJournalInsights,
        },
        {
          key: 'dataCollection',
          title: 'Analytics Data',
          subtitle: 'Help improve the app with usage analytics',
          value: settings.dataCollection,
        },
      ],
    },
  ];

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
        <Text style={styles.title}>Privacy Settings</Text>
        <Text style={styles.subtitle}>
          Control how your data is used and shared
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Privacy Settings Sections */}
        {privacySettings.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            {section.items.map((item, itemIndex) => (
              <View key={item.key} style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                </View>
                <Switch
                  value={item.value}
                  onValueChange={(value) => handleSettingChange(item.key, value)}
                  trackColor={{ false: '#d1d5db', true: theme.colors.primary[500] }}
                  thumbColor={item.value ? '#ffffff' : '#f3f4f6'}
                  disabled={item.disabled}
                />
              </View>
            ))}
          </View>
        ))}

        {/* Anonymous Mode Info */}
        {isAnonymous && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>🔒 Anonymous Mode Active</Text>
            <Text style={styles.infoText}>
              You're using Mind-digest anonymously. Your personal information 
              is not stored on our servers, and your identity is protected in 
              all interactions.
            </Text>
          </View>
        )}

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
            <Text style={styles.actionIcon}>📊</Text>
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Export My Data</Text>
              <Text style={styles.actionSubtitle}>Download all your personal data</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton]} 
            onPress={handleDeleteAccount}
          >
            <Text style={styles.actionIcon}>🗑️</Text>
            <View style={styles.actionInfo}>
              <Text style={[styles.actionTitle, styles.dangerText]}>Delete Account</Text>
              <Text style={styles.actionSubtitle}>Permanently remove your account</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Policy Link */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>📋 Read our Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>📜 Terms of Service</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <Button
          title="Save Privacy Settings"
          onPress={handleSave}
          variant="primary"
          size="large"
          style={styles.saveButton}
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
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  dangerButton: {
    borderWidth: 1,
    borderColor: theme.colors.danger[200],
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  dangerText: {
    color: theme.colors.danger[600],
  },
  actionSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  actionArrow: {
    fontSize: 20,
    color: theme.colors.gray[400],
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
  linkButton: {
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 16,
    color: theme.colors.primary[500],
    textDecorationLine: 'underline',
  },
  saveButton: {
    marginBottom: 40,
  },
});