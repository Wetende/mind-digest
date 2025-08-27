import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { Button } from '../../components';
import { theme } from '../../theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Decorative Elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />

        {/* Logo/Brand Section */}
        <View style={styles.brandSection}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#ff9a9e', '#fecfef']}
              style={styles.logoGradient}
            >
              <MaterialCommunityIcons 
                name="brain" 
                size={48} 
                color="white" 
              />
            </LinearGradient>
          </View>
          <Text style={styles.appName}>Mind-digest</Text>
          <Text style={styles.tagline}>
            Mental wellness made digestible
          </Text>
        </View>

        {/* Features Preview */}
        <View style={styles.featuresSection}>
          <View style={styles.feature}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="people" size={20} color="#667eea" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Peer Support</Text>
              <Text style={styles.featureText}>Connect with supportive community</Text>
            </View>
          </View>
          
          <View style={styles.feature}>
            <View style={styles.featureIconContainer}>
              <MaterialCommunityIcons name="toolbox" size={20} color="#667eea" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Social Toolkit</Text>
              <Text style={styles.featureText}>Build confidence in social situations</Text>
            </View>
          </View>
          
          <View style={styles.feature}>
            <View style={styles.featureIconContainer}>
              <Feather name="edit-3" size={20} color="#667eea" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>AI Journaling</Text>
              <Text style={styles.featureText}>Track mood with intelligent insights</Text>
            </View>
          </View>
          
          <View style={styles.feature}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="share-social" size={20} color="#667eea" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Social Sharing</Text>
              <Text style={styles.featureText}>Share progress across platforms</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('SignUp')}
          >
            <LinearGradient
              colors={['#ffffff', '#f8f9ff']}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#667eea" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.anonymousButton}
            onPress={() => navigation.navigate('AnonymousSetup')}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.anonymousText}>Continue anonymously</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Note */}
        <View style={styles.privacySection}>
          <Ionicons name="lock-closed" size={12} color="rgba(255, 255, 255, 0.6)" />
          <Text style={styles.privacyText}>
            Your privacy and safety are our top priorities
          </Text>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    position: 'relative',
  },
  // Decorative elements
  decorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    top: height * 0.3,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorativeCircle3: {
    position: 'absolute',
    bottom: height * 0.2,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  brandSection: {
    alignItems: 'center',
    marginTop: height * 0.08,
    marginBottom: 50,
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: 'white',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  featuresSection: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  featureText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
  },
  actionSection: {
    marginBottom: 20,
    paddingTop: 10,
  },
  primaryButton: {
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#667eea',
    marginRight: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 20,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  anonymousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  anonymousText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    fontWeight: '400',
    marginLeft: 6,
  },
  privacySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  privacyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 16,
    marginLeft: 6,
    fontWeight: '300',
  },
});