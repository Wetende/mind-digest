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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';


export default function ProfileScreen({ navigation }) {
  const { user, isAnonymous, signOut, updateProfile } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [shareProgress, setShareProgress] = useState(false);
  const [anonymousMode, setAnonymousMode] = useState(isAnonymous);

  useEffect(() => {
    setAnonymousMode(isAnonymous);
  }, [isAnonymous]);

  const handleAnonymousModeToggle = async (value) => {
    setAnonymousMode(value);
    try {
      await updateProfile({ anonymous_mode: value });
    } catch (error) {
      Alert.alert('Error', 'Failed to update anonymous mode setting');
      setAnonymousMode(!value); // Revert on error
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const result = await signOut();
            if (!result.success) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'This feature will allow you to download all your data in a portable format. Coming soon!',
      [{ text: 'OK' }]
    );
  };

  const getDisplayName = () => {
    if (isAnonymous) return 'Anonymous User';
    return user?.user_metadata?.display_name || user?.email || 'Mind-digest User';
  };

  const getJoinDate = () => {
    if (user?.created_at) {
      const date = new Date(user.created_at);
      return `Member since ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }
    return 'Member since January 2025';
  };

  const profileStats = [
    { label: 'Days Active', value: '7', color: '#10b981' },
    { label: 'Journal Entries', value: '12', color: '#3b82f6' },
    { label: 'Peer Connections', value: '5', color: '#f59e0b' },
    { label: 'Toolkit Uses', value: '23', color: '#8b5cf6' },
  ];

  const menuItems = [
    {
      title: 'Edit Profile',
      subtitle: 'Update your information',
      icon: '✏️',
      action: () => navigation.navigate('EditProfile'),
    },
    {
      title: 'Mental Health Interests',
      subtitle: 'Customize your experience',
      icon: '🎯',
      action: () => navigation.navigate('InterestsSettings'),
    },
    {
      title: 'Privacy Settings',
      subtitle: 'Control your data',
      icon: '🔒',
      action: () => navigation.navigate('PrivacySettings'),
    },
    {
      title: 'Crisis Resources',
      subtitle: 'Emergency support',
      icon: '🆘',
      action: () => navigation.navigate('CrisisResources'),
    },
    {
      title: 'Export Data',
      subtitle: 'Download your information',
      icon: '📊',
      action: () => handleExportData(),
    },
    {
      title: 'Help & Support',
      subtitle: 'Get assistance',
      icon: '❓',
      action: () => navigation.navigate('HelpSupport'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <LinearGradient
        colors={['#8b5cf6', '#6366f1']}
        style={styles.profileHeader}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        <Text style={styles.displayName}>
          {getDisplayName()}
        </Text>
        <Text style={styles.joinDate}>{getJoinDate()}</Text>
      </LinearGradient>

      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Progress</Text>
        <View style={styles.statsContainer}>
          {profileStats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={[styles.statValue, { color: stat.color }]}>
                {stat.value}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Anonymous Mode</Text>
            <Text style={styles.settingSubtitle}>Hide your identity in peer support</Text>
          </View>
          <Switch
            value={anonymousMode}
            onValueChange={handleAnonymousModeToggle}
            trackColor={{ false: '#d1d5db', true: '#6366f1' }}
            thumbColor={anonymousMode ? '#ffffff' : '#f3f4f6'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Push Notifications</Text>
            <Text style={styles.settingSubtitle}>Daily reminders and updates</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#d1d5db', true: '#6366f1' }}
            thumbColor={notifications ? '#ffffff' : '#f3f4f6'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Share Progress</Text>
            <Text style={styles.settingSubtitle}>Allow progress sharing with peers</Text>
          </View>
          <Switch
            value={shareProgress}
            onValueChange={setShareProgress}
            trackColor={{ false: '#d1d5db', true: '#6366f1' }}
            thumbColor={shareProgress ? '#ffffff' : '#f3f4f6'}
          />
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.action}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    margin: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    color: 'white',
  },
  displayName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
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
    color: '#1f2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  menuItem: {
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
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  menuArrow: {
    fontSize: 20,
    color: '#9ca3af',
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});