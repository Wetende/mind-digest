import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../theme';

const { width, height } = Dimensions.get('window');

const PointsAnimation = ({ 
  points, 
  visible, 
  onComplete, 
  position = { x: width / 2, y: height / 2 },
  type = 'points' // 'points', 'badge', 'level_up'
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.5);
      translateYAnim.setValue(0);

      // Start animation sequence
      Animated.sequence([
        // Fade in and scale up
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
        // Hold for a moment
        Animated.delay(800),
        // Float up and fade out
        Animated.parallel([
          Animated.timing(translateYAnim, {
            toValue: -100,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        if (onComplete) {
          onComplete();
        }
      });
    }
  }, [visible, fadeAnim, scaleAnim, translateYAnim, onComplete]);

  if (!visible) return null;

  const getAnimationContent = () => {
    switch (type) {
      case 'badge':
        return (
          <View style={styles.badgeContainer}>
            <Ionicons name="medal" size={40} color={colors.warning} />
            <Text style={styles.badgeText}>New Badge!</Text>
            <Text style={styles.pointsText}>+{points} pts</Text>
          </View>
        );
      case 'level_up':
        return (
          <View style={styles.levelUpContainer}>
            <Ionicons name="trending-up" size={40} color={colors.success} />
            <Text style={styles.levelUpText}>Level Up!</Text>
            <Text style={styles.pointsText}>Level {points}</Text>
          </View>
        );
      default:
        return (
          <View style={styles.pointsContainer}>
            <Ionicons name="add-circle" size={32} color={colors.primary} />
            <Text style={styles.pointsText}>+{points}</Text>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { left: position.x - 50, top: position.y - 50 }]}>
      <Animated.View
        style={[
          styles.animationContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
          },
        ]}
      >
        {getAnimationContent()}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  animationContainer: {
    backgroundColor: colors.surface,
    borderRadius: 50,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  pointsContainer: {
    alignItems: 'center',
  },
  pointsText: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: 4,
  },
  badgeContainer: {
    alignItems: 'center',
  },
  badgeText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: 'bold',
    marginTop: 4,
  },
  levelUpContainer: {
    alignItems: 'center',
  },
  levelUpText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: 'bold',
    marginTop: 4,
  },
});

export default PointsAnimation;