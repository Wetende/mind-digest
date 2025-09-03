import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { ENV } from '../config/env';

const PrivacyPolicyComponent = ({ onAccept, onDecline, showButtons = true }) => {
  const [consentGiven, setConsentGiven] = useState(false);

  const handleAccept = () => {
    setConsentGiven(true);
    if (onAccept) {
      onAccept();
    }
    Alert.alert(
      'Privacy Policy Accepted',
      'Thank you for reviewing our privacy policy. Your privacy is important to us.',
      [{ text: 'Continue' }]
    );
  };

  const handleDecline = () => {
    Alert.alert(
      'Privacy Policy Required',
      'You must accept our privacy policy to use this mental health app safely and effectively.',
      [
        { text: 'Review Again', style: 'cancel' },
        { text: 'Accept', onPress: handleAccept }
      ]
    );
    if (onDecline) {
      onDecline();
    }
  };

  const rawLastUpdated = '2025-08-30';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
        <Text style={styles.title}>Privacy Policy & Data Usage</Text>
        <Text style={styles.lastUpdated}>Last updated: {rawLastUpdated}</Text>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={true}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Commitment to Your Privacy</Text>
          <Text style={styles.paragraph}>
            Your mental health and privacy are our top priorities. This app is designed
            with privacy-first principles, using client-side processing whenever possible
            and requiring explicit consent for any data sharing.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Data We Collect</Text>
          <Text style={styles.subSectionTitle}>Required for App Functionality:</Text>
          <Text style={styles.bulletPoint}>• User authentication details (email, if provided)</Text>
          <Text style={styles.bulletPoint}>• Mood tracking entries and habit data</Text>
          <Text style={styles.bulletPoint}>• Journal entries (stored securely and encrypted)</Text>
          <Text style={styles.bulletPoint}>• Basic usage analytics (anonymous)</Text>

          <Text style={styles.subSectionTitle}>Optional & With Explicit Consent:</Text>
          <Text style={styles.bulletPoint}>• Social media sharing content (anonymized)</Text>
          <Text style={styles.bulletPoint}>• Peer support chat messages</Text>
          <Text style={styles.bulletPoint}>• Crisis detection processing</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 How We Protect Your Data</Text>
          <Text style={styles.bulletPoint}>• End-to-end encryption for sensitive journal entries</Text>
          <Text style={styles.bulletPoint}>• All data is stored in secure Supabase databases</Text>
          <Text style={styles.bulletPoint}>• Row Level Security (RLS) policies prevent unauthorized access</Text>
          <Text style={styles.bulletPoint}>• Anonymous mode available for full privacy</Text>
          <Text style={styles.bulletPoint}>• Optional local storage for offline access</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 AI Processing & Mental Health Support</Text>
          <Text style={styles.paragraph}>
            We use AI to analyze mood patterns and provide insights, but your mental health
            content is processed carefully:
          </Text>
          <Text style={styles.bulletPoint}>• Journal analysis happens locally when possible</Text>
          <Text style={styles.bulletPoint}>• AI processing uses secure HuggingFace models</Text>
          <Text style={styles.bulletPoint}>• Crisis detection is automated but always includes human-like disclaimers</Text>
          <Text style={styles.bulletPoint}>• Results are stored for your personal use only</Text>
          <Text style={styles.noteBox}>
            ⚠️ <Text style={styles.noteText}>
              IMPORTANT: This app provides mental health support tools but is NOT a substitute
              for professional medical care. Always consult healthcare providers for medical decisions.
            </Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚨 Crisis Support Integration</Text>
          <Text style={styles.bulletPoint}>• Integration with 988 Suicide & Crisis Lifeline</Text>
          <Text style={styles.bulletPoint}>• Emergency contact information (911)</Text>
          <Text style={styles.bulletPoint}>• Local crisis resources display</Text>
          <Text style={styles.bulletPoint}>• All crisis contacts are immediate and free</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 App Crash Reporting & Analytics</Text>
          <Text style={styles.paragraph}>
            To improve the app and ensure reliability:
          </Text>
          <Text style={styles.bulletPoint}>• Anonymous crash reports using Sentry</Text>
          <Text style={styles.bulletPoint}>• No personal information included in crash logs</Text>
          <Text style={styles.bulletPoint}>• Usage analytics are anonymized and aggregated</Text>
          <Text style={styles.bulletPoint}>• All analytics can be disabled in settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚖️ Your Rights & Control</Text>
          <Text style={styles.bulletPoint}>• Full access to your personal data via app settings</Text>
          <Text style={styles.bulletPoint}>• Export all your data at any time</Text>
          <Text style={styles.bulletPoint}>• Delete your account and all associated data</Text>
          <Text style={styles.bulletPoint}>• Opt-out of analytics and crash reporting</Text>
          <Text style={styles.bulletPoint}>• Toggle anonymous mode anytime</Text>
          <Text style={styles.bulletPoint}>• Control social sharing privacy settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📢 Disclaimer - Medical Not Therapy</Text>
          <Text style={styles.paragraph}>
            This mental health app provides tools and insights to support your well-being journey,
            but it is not medical advice or therapy. Our AI analysis and recommendations are
            supplemental support tools only.
          </Text>
          <Text style={styles.noteBox}>
            🏥 <Text style={styles.noteText}>
              Always consult qualified healthcare professionals for mental health concerns,
              diagnosis, or treatment. In case of emergency, contact 911 or the Suicide & Crisis Lifeline at 988.
            </Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Contact & Support</Text>
          <Text style={styles.bulletPoint}>• In-app support available in Settings > Help & Support</Text>
          <Text style={styles.bulletPoint}>• Email support for privacy-related questions</Text>
          <Text style={styles.bulletPoint}>• Medical or crisis support: Immediate 988 access</Text>
          <Text style={styles.bulletPoint}>• Data privacy concerns: Direct access to settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ App Mission</Text>
          <Text style={styles.paragraph}>
            Mind-digest is committed to making mental health support accessible,
            private, and effective. We believe technology can help but never replace
            human connection and professional care.
          </Text>
        </View>

        <Text style={styles.footerNote}>
          By using Mind-digest, you acknowledge reading and understanding this privacy policy.
          You can review your privacy settings at any time in the app.
        </Text>
      </ScrollView>

      {showButtons && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
            <Text style={styles.declineButtonText}>Review Later</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
            <Text style={styles.acceptButtonText}>I Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  lastUpdated: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  scrollContent: {
    flex: 1,
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.primary,
    marginBottom: spacing.sm,
    fontWeight: 'bold',
  },
  subSectionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  paragraph: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  bulletPoint: {
    ...typography.body,
    color: colors.textPrimary,
    marginLeft: spacing.md,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  noteBox: {
    backgroundColor: colors.warning + '20',
    padding: spacing.sm,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  noteText: {
    ...typography.caption,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  footerNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: spacing.lg,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  declineButton: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  declineButtonText: {
    ...typography.body,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  acceptButtonText: {
    ...typography.body,
    color: colors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default PrivacyPolicyComponent;
