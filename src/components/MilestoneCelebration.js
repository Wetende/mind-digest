import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function MilestoneCelebration({ 
  visible, 
  milestone, 
  onClose 
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Start celebration animation
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      confettiAnim.setValue(0);
    }
  }, [visible]);

  if (!milestone) return null;

  const renderConfetti = () => {
    const confettiPieces = [];
    for (let i = 0; i < 20; i++) {
      const randomX = Math.random() * width;
      const randomDelay = Math.random() * 1000;
      const randomColor = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][
        Math.floor(Math.random() * 5)
      ];

      confettiPieces.push(
        <Animated.View
          key={i}
          style={[
            styles.confettiPiece,
            {
              left: randomX,
              backgroundColor: randomColor,
              transform: [
                {
                  translateY: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, height + 50],
                  }),
                },
                {
                  rotate: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      );
    }
    return confettiPieces;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {renderConfetti()}
        
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="trophy" size={48} color="#FFD700" />
            </View>
            <Text style={styles.title}>Milestone Achieved!</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.milestoneTitle}>{milestone.title}</Text>
            <Text style={styles.milestoneDescription}>
              {milestone.description}
            </Text>

            {milestone.reward && (
              <View style={styles.rewardContainer}>
                <Text style={styles.rewardTitle}>Your Reward:</Text>
                <View style={styles.rewardDetails}>
                  <View style={styles.rewardItem}>
                    <Ionicons name="star" size={20} color="#FFD700" />
                    <Text style={styles.rewardText}>
                      {milestone.reward.points} points
                    </Text>
                  </View>
                  <View style={styles.rewardItem}>
                    <Ionicons name="medal" size={20} color="#FF6B6B" />
                    <Text style={styles.rewardText}>
                      {milestone.reward.badge} badge
                    </Text>
                  </View>
                </View>
                <Text style={styles.rewardMessage}>
                  {milestone.reward.message}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiPiece: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    margin: 20,
    maxWidth: width * 0.9,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  milestoneTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  milestoneDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  rewardContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  rewardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 12,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  rewardMessage: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    minWidth: 120,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});