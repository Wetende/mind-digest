import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PrivacyPolicyComponent from '../components/PrivacyPolicyComponent';
import Button from '../components/Button';
import { spacing } from '../theme';

const PrivacyPolicyScreen = () => {
  const navigation = useNavigation();

  const handleAccept = () => {
    // Handle privacy policy acceptance
    // This could set a flag in AsyncStorage or navigate back
    console.log('Privacy policy accepted');
    navigation.goBack();
  };

  const handleDecline = () => {
    // Handle declining the policy (could show a warning)
    console.log('Privacy policy declined/review later');
  };

  return (
    <SafeAreaView style={styles.container}>
      <PrivacyPolicyComponent
        onAccept={handleAccept}
        onDecline={handleDecline}
        showButtons={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default PrivacyPolicyScreen;
