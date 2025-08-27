import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';

export default function HelpSupportScreen({ navigation }) {
  const helpSections = [
    {
      title: 'Getting Started',
      items: [
        'How to create your profile',
        'Setting up your mental health interests',
        'Understanding privacy settings',
        'Using anonymous mode',
      ],
    },
    {
      title: 'Peer Support',
      items: [
        'Joining support communities',
        'Sending and receiving messages',
        'Finding the right peer connections',
        'Community guidelines and safety',
      ],
    },
    {
      title: 'Social Ease Toolkit',
      items: [
        'Using conversation starters',
        'Practicing with role-play scenarios',
        'Planning social situations',
        'Building confidence gradually',
      ],
    },
    {
      title: 'Journaling & Tracking',
      items: [
        'Writing effective journal entries',
        'Understanding mood tracking',
        'Interpreting AI insights',
        'Exporting your data',
      ],
    },
  ];

  const contactOptions = [
    {
      title: 'Email Support',
      subtitle: 'Get help via email',
      icon: '📧',
      action: () => Linking.openURL('mailto:support@minddigest.app'),
    },
    {
      title: 'FAQ',
      subtitle: 'Frequently asked questions',
      icon: '❓',
      action: () => navigation.navigate('FAQ'),
    },
    {
      title: 'Community Guidelines',
      subtitle: 'Learn about our community rules',
      icon: '📋',
      action: () => navigation.navigate('CommunityGuidelines'),
    },
    {
      title: 'Report a Problem',
      subtitle: 'Report bugs or inappropriate content',
      icon: '🚨',
      action: () => navigation.navigate('ReportProblem'),
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
        <Text style={styles.title}>Help & Support</Text>
        <Text style={styles.subtitle}>
          Get help using Mind-digest and find answers to common questions
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Quick Help */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Help</Text>
          {contactOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionCard}
              onPress={option.action}
            >
              <Text style={styles.optionIcon}>{option.icon}</Text>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              </View>
              <Text style={styles.optionArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Help Topics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help Topics</Text>
          {helpSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.topicSection}>
              <Text style={styles.topicTitle}>{section.title}</Text>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity key={itemIndex} style={styles.topicItem}>
                  <Text style={styles.topicItemText}>{item}</Text>
                  <Text style={styles.topicArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Mind-digest v1.0.0</Text>
            <Text style={styles.infoText}>
              A mental health and wellness companion app focused on peer support, 
              social anxiety tools, and personal growth.
            </Text>
            <View style={styles.infoLinks}>
              <TouchableOpacity style={styles.linkButton}>
                <Text style={styles.linkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkButton}>
                <Text style={styles.linkText}>Terms of Service</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkButton}>
                <Text style={styles.linkText}>Open Source Licenses</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  optionCard: {
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
  optionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  optionArrow: {
    fontSize: 20,
    color: theme.colors.gray[400],
  },
  topicSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  topicItemText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text.primary,
  },
  topicArrow: {
    fontSize: 16,
    color: theme.colors.gray[400],
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  infoLinks: {
    gap: 8,
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    color: theme.colors.primary[500],
    textDecorationLine: 'underline',
  },
});