import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';

export default function CrisisResourcesScreen({ navigation }) {
  const crisisResources = [
    {
      name: 'National Suicide Prevention Lifeline',
      phone: '988',
      description: '24/7 crisis support for suicidal thoughts',
      available: '24/7',
    },
    {
      name: 'Crisis Text Line',
      phone: 'Text HOME to 741741',
      description: 'Free, 24/7 crisis support via text',
      available: '24/7',
    },
    {
      name: 'NAMI Helpline',
      phone: '1-800-950-6264',
      description: 'Mental health information and support',
      available: 'Mon-Fri 10am-10pm ET',
    },
    {
      name: 'SAMHSA National Helpline',
      phone: '1-800-662-4357',
      description: 'Treatment referral and information service',
      available: '24/7',
    },
  ];

  const handleCall = (phone) => {
    const phoneNumber = phone.replace(/[^0-9]/g, '');
    if (phoneNumber.length >= 3) {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('Crisis Text Line', 'Text HOME to 741741 for crisis support');
    }
  };

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
        <Text style={styles.title}>Crisis Resources</Text>
        <Text style={styles.subtitle}>
          Immediate help is available. You are not alone.
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Emergency Notice */}
        <View style={styles.emergencyBox}>
          <Text style={styles.emergencyTitle}>🚨 Emergency</Text>
          <Text style={styles.emergencyText}>
            If you are in immediate danger, call 911 or go to your nearest emergency room.
          </Text>
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={() => Linking.openURL('tel:911')}
          >
            <Text style={styles.emergencyButtonText}>Call 911</Text>
          </TouchableOpacity>
        </View>

        {/* Crisis Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crisis Support</Text>
          {crisisResources.map((resource, index) => (
            <TouchableOpacity
              key={index}
              style={styles.resourceCard}
              onPress={() => handleCall(resource.phone)}
            >
              <View style={styles.resourceInfo}>
                <Text style={styles.resourceName}>{resource.name}</Text>
                <Text style={styles.resourcePhone}>{resource.phone}</Text>
                <Text style={styles.resourceDescription}>{resource.description}</Text>
                <Text style={styles.resourceAvailable}>Available: {resource.available}</Text>
              </View>
              <Text style={styles.callIcon}>📞</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Safety Planning */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Planning</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Create a Safety Plan</Text>
            <Text style={styles.infoText}>
              A safety plan is a personalized plan that helps you stay safe during a crisis. 
              It includes warning signs, coping strategies, and people to contact.
            </Text>
            <TouchableOpacity style={styles.infoButton}>
              <Text style={styles.infoButtonText}>Coming Soon</Text>
            </TouchableOpacity>
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
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emergencyBox: {
    backgroundColor: theme.colors.danger[50],
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.danger[500],
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.danger[700],
    marginBottom: 8,
  },
  emergencyText: {
    fontSize: 16,
    color: theme.colors.danger[600],
    marginBottom: 16,
    lineHeight: 22,
  },
  emergencyButton: {
    backgroundColor: theme.colors.danger[500],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  resourceCard: {
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
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  resourcePhone: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary[600],
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  resourceAvailable: {
    fontSize: 12,
    color: theme.colors.success[600],
    fontWeight: '500',
  },
  callIcon: {
    fontSize: 24,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
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
  infoButton: {
    backgroundColor: theme.colors.gray[200],
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  infoButtonText: {
    color: theme.colors.gray[600],
    fontSize: 14,
    fontWeight: '500',
  },
});