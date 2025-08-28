import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function Card({ children, style = {}, padding = 16, ...props }) {
  return (
    <View 
      style={[styles.card, { padding }, style]} 
      testID="card"
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});