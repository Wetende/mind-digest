import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, Linking } from 'react-native';

export default function EmergencyButton({ style = {} }) {
  const handleEmergencyPress = () => {
    Alert.alert(
      'Crisis Support',
      'If you are in immediate danger, please call emergency services (911). For mental health crisis support, would you like to call the crisis hotline?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 911', onPress: () => Linking.openURL('tel:911') },
        { 
          text: 'Crisis Hotline', 
          onPress: () => Linking.openURL('tel:988') // Suicide & Crisis Lifeline
        },
      ]
    );
  };

  return (
    <TouchableOpacity 
      style={[styles.emergencyButton, style]} 
      onPress={handleEmergencyPress}
    >
      <Text style={styles.emergencyText}>🆘 Crisis Support</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  emergencyButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  emergencyText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});