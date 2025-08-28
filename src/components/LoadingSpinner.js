import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export default function LoadingSpinner({ 
  size = 'large', 
  color = '#6366f1', 
  text = 'Loading...',
  style = {},
  ...props
}) {
  return (
    <View style={[styles.container, style]} {...props}>
      <ActivityIndicator 
        size={size} 
        color={color} 
        testID="activity-indicator"
      />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});