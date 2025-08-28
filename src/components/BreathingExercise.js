import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';
import { meditationService } from '../services';

export default function BreathingExercise({ visible, onClose }) {
  const { user, isAnonymous } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState('inhale'); // 'inhale', 'hold', 'exhale'
  const [count, setCount] = useState(4);
  const [cycle, setCycle] = useState(0);
  const [exerciseType, setExerciseType] = useState('box'); // 'box', '478', 'simple'
  const [sessionId, setSessionId] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [sound, setSound] = useState(null);
  
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  // Get exercises from meditation service
  const exercises = {
    box: meditationService.getExerciseById('box'),
    '478': meditationService.getExerciseById('478'),
    simple: meditationService.getExerciseById('simple'),
  };

  const currentExercise = exercises[exerciseType];
  const currentPhaseIndex = useRef(0);

  useEffect(() => {
    let interval;
    
    if (isActive) {
      interval = setInterval(() => {
        setCount((prevCount) => {
          if (prevCount <= 1) {
            // Move to next phase
            const nextPhaseIndex = (currentPhaseIndex.current + 1) % currentExercise.phases.length;
            currentPhaseIndex.current = nextPhaseIndex;
            
            const nextPhase = currentExercise.phases[nextPhaseIndex];
            setPhase(nextPhase.name);
            
            // If we completed a full cycle
            if (nextPhaseIndex === 0) {
              setCycle(prev => prev + 1);
            }
            
            return nextPhase.duration;
          }
          return prevCount - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isActive, exerciseType]);

  useEffect(() => {
    // Animate the breathing circle
    if (isActive) {
      if (phase === 'inhale') {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: currentExercise.phases.find(p => p.name === 'inhale').duration * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.8,
            duration: currentExercise.phases.find(p => p.name === 'inhale').duration * 1000,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (phase === 'exhale') {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.5,
            duration: currentExercise.phases.find(p => p.name === 'exhale').duration * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: currentExercise.phases.find(p => p.name === 'exhale').duration * 1000,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [phase, isActive]);

  const startExercise = async () => {
    setIsActive(true);
    setCycle(0);
    currentPhaseIndex.current = 0;
    setPhase(currentExercise.phases[0].name);
    setCount(currentExercise.phases[0].duration);
    setSessionStartTime(Date.now());

    // Start session tracking for authenticated users
    if (user && !isAnonymous) {
      try {
        const result = await meditationService.startSession(user.id, exerciseType, 'breathing');
        if (result.success) {
          setSessionId(result.data.id);
        }
      } catch (error) {
        console.error('Error starting session:', error);
      }
    }

    // Play start sound if audio is enabled
    if (audioEnabled) {
      playSound('start');
    }
  };

  const stopExercise = async () => {
    setIsActive(false);
    const sessionDuration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
    
    // Complete session tracking for authenticated users
    if (sessionId && user && !isAnonymous) {
      try {
        await meditationService.completeSession(sessionId, sessionDuration, cycle);
        
        // Show completion message and ask for effectiveness rating
        if (sessionDuration > 30) { // Only ask for rating if session was longer than 30 seconds
          Alert.alert(
            'Session Complete!',
            `Great job! You completed ${cycle} cycles in ${Math.floor(sessionDuration / 60)} minutes.`,
            [
              {
                text: 'Rate Effectiveness',
                onPress: () => showEffectivenessRating(),
              },
              {
                text: 'Done',
                style: 'default',
              },
            ]
          );
        }
      } catch (error) {
        console.error('Error completing session:', error);
      }
    }

    // Reset state
    setCount(4);
    setCycle(0);
    currentPhaseIndex.current = 0;
    setPhase('inhale');
    setSessionId(null);
    setSessionStartTime(null);
    
    // Reset animations
    scaleAnim.setValue(0.5);
    opacityAnim.setValue(0.3);

    // Play completion sound if audio is enabled
    if (audioEnabled) {
      playSound('complete');
    }
  };

  const getCurrentInstruction = () => {
    return currentExercise.phases.find(p => p.name === phase)?.instruction || 'Breathe';
  };

  // Audio functionality
  const playSound = async (type) => {
    try {
      // For now, we'll use system sounds or simple audio cues
      // In a full implementation, you would load actual audio files
      if (type === 'inhale') {
        // Play inhale sound
      } else if (type === 'exhale') {
        // Play exhale sound
      } else if (type === 'start') {
        // Play session start sound
      } else if (type === 'complete') {
        // Play completion sound
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  // Show effectiveness rating dialog
  const showEffectivenessRating = () => {
    Alert.alert(
      'How effective was this session?',
      'Your feedback helps us provide better recommendations.',
      [
        { text: '⭐ Not helpful', onPress: () => rateSession(1) },
        { text: '⭐⭐ Somewhat helpful', onPress: () => rateSession(2) },
        { text: '⭐⭐⭐ Helpful', onPress: () => rateSession(3) },
        { text: '⭐⭐⭐⭐ Very helpful', onPress: () => rateSession(4) },
        { text: '⭐⭐⭐⭐⭐ Extremely helpful', onPress: () => rateSession(5) },
        { text: 'Skip', style: 'cancel' },
      ]
    );
  };

  // Rate session effectiveness
  const rateSession = async (rating) => {
    if (sessionId) {
      try {
        await meditationService.rateSessionEffectiveness(sessionId, rating);
        Alert.alert('Thank you!', 'Your feedback has been recorded.');
      } catch (error) {
        console.error('Error rating session:', error);
      }
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={['#1e3a8a', '#3730a3', '#581c87']}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{currentExercise.name}</Text>
            <Text style={styles.description}>{currentExercise.description}</Text>
          </View>

          {/* Exercise Type Selector */}
          {!isActive && (
            <View style={styles.exerciseSelector}>
              {Object.keys(exercises).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.exerciseButton,
                    exerciseType === key && styles.selectedExercise,
                  ]}
                  onPress={() => setExerciseType(key)}
                >
                  <Text style={[
                    styles.exerciseButtonText,
                    exerciseType === key && styles.selectedExerciseText,
                  ]}>
                    {exercises[key].name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Breathing Circle */}
          <View style={styles.breathingContainer}>
            <Animated.View
              style={[
                styles.breathingCircle,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                style={styles.circleGradient}
              >
                <Text style={styles.countText}>{count}</Text>
              </LinearGradient>
            </Animated.View>
            
            <Text style={styles.instructionText}>{getCurrentInstruction()}</Text>
            
            {isActive && (
              <Text style={styles.cycleText}>Cycle {cycle + 1}</Text>
            )}
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {!isActive ? (
              <TouchableOpacity style={styles.startButton} onPress={startExercise}>
                <Text style={styles.startButtonText}>Start Breathing</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.stopButton} onPress={stopExercise}>
                <Text style={styles.stopButtonText}>Stop</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tips */}
          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Tips:</Text>
            <Text style={styles.tipsText}>• Find a comfortable position</Text>
            <Text style={styles.tipsText}>• Focus on the circle and count</Text>
            <Text style={styles.tipsText}>• Breathe naturally, don't force it</Text>
            <Text style={styles.tipsText}>• Practice for 3-5 minutes daily</Text>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  closeButton: {
    position: 'absolute',
    top: -20,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  exerciseSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  exerciseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedExercise: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  exerciseButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedExerciseText: {
    color: 'white',
  },
  breathingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  circleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  countText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  instructionText: {
    fontSize: 24,
    color: 'white',
    fontWeight: '500',
    marginBottom: 10,
  },
  cycleText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  controls: {
    alignItems: 'center',
    marginVertical: 20,
  },
  startButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  stopButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  tips: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  tipsTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
});