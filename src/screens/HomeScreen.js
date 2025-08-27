import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { moodService } from '../services';

export default function HomeScreen({ navigation }) {
  const { user, isAnonymous } = useAuth();
  const [currentMood, setCurrentMood] = useState(null);
  const [todaysMood, setTodaysMood] = useState(null);
  const [moodStreak, setMoodStreak] = useState(0);
  const [loadingMood, setLoadingMood] = useState(true);
  const [dailyQuote, setDailyQuote] = useState("Today is a new opportunity to take care of yourself.");
  const [dailyHabits, setDailyHabits] = useState([
    { id: 1, name: 'Morning mood check', completed: false, points: 10 },
    { id: 2, name: 'Breathing exercise', completed: false, points: 15 },
    { id: 3, name: 'Journal entry', completed: false, points: 20 },
    { id: 4, name: 'Connect with peers', completed: false, points: 25 },
  ]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [streak, setStreak] = useState(3);

  useEffect(() => {
    if (user && !isAnonymous) {
      loadTodaysMood();
      loadMoodStreak();
    } else {
      setLoadingMood(false);
    }
  }, [user, isAnonymous]);

  const moodOptions = [
    { icon: 'happy', label: 'Great', value: 5, color: '#10b981' },
    { icon: 'happy-outline', label: 'Good', value: 4, color: '#3b82f6' },
    { icon: 'remove', label: 'Okay', value: 3, color: '#f59e0b' },
    { icon: 'sad-outline', label: 'Low', value: 2, color: '#ef4444' },
    { icon: 'alert-circle', label: 'Anxious', value: 1, color: '#8b5cf6' },
  ];

  const quickActions = [
    {
      title: 'Breathing Exercise',
      subtitle: '5 min calm',
      color: ['#60a5fa', '#3b82f6'],
      action: () => {
        navigation.navigate('Toolkit');
        completeHabit(2);
      },
    },
    {
      title: 'Connect with Peers',
      subtitle: 'Find support',
      color: ['#34d399', '#10b981'],
      action: () => {
        navigation.navigate('Peer Support');
        completeHabit(4);
      },
    },
    {
      title: 'Journal Entry',
      subtitle: 'Reflect & track',
      color: ['#fbbf24', '#f59e0b'],
      action: () => {
        navigation.navigate('Journal');
        completeHabit(3);
      },
    },
  ];

  const loadTodaysMood = async () => {
    try {
      const result = await moodService.getTodaysMood(user.id);
      if (result.success && result.data) {
        setTodaysMood(result.data);
        setCurrentMood(moodOptions.find(m => m.value === result.data.mood));
      }
    } catch (error) {
      console.error('Error loading today\'s mood:', error);
    } finally {
      setLoadingMood(false);
    }
  };

  const loadMoodStreak = async () => {
    try {
      const result = await moodService.getMoodStreak(user.id);
      if (result.success) {
        setMoodStreak(result.data);
      }
    } catch (error) {
      console.error('Error loading mood streak:', error);
    }
  };

  const handleMoodSelect = async (mood) => {
    setCurrentMood(mood);
    
    try {
      if (user && !isAnonymous) {
        // Save mood to database
        const result = await moodService.createMoodEntry({
          userId: user.id,
          mood: mood.value,
          emotions: [],
          triggers: [],
        });

        if (result.success) {
          setTodaysMood(result.data);
          // Update streak
          loadMoodStreak();
          Alert.alert('Mood Logged', `Thanks for sharing how you're feeling today! +10 points earned!`);
        } else {
          Alert.alert('Error', 'Failed to save mood. Please try again.');
        }
      } else {
        // For anonymous users, just show confirmation
        Alert.alert('Mood Logged', `Thanks for sharing how you're feeling today! +10 points earned!`);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong saving your mood.');
    }
    
    // Complete the mood check habit
    completeHabit(1);
  };

  const completeHabit = (habitId) => {
    setDailyHabits(prev => 
      prev.map(habit => {
        if (habit.id === habitId && !habit.completed) {
          setTotalPoints(prevPoints => prevPoints + habit.points);
          return { ...habit, completed: true };
        }
        return habit;
      })
    );
  };

  const handleEmergencySupport = () => {
    Alert.alert(
      'Crisis Support',
      'If you are in immediate danger, please call emergency services. For mental health crisis support, you can:',
      [
        {
          text: 'Call 988 (Crisis Lifeline)',
          onPress: () => Linking.openURL('tel:988'),
        },
        {
          text: 'Text HOME to 741741',
          onPress: () => Linking.openURL('sms:741741&body=HOME'),
        },
        {
          text: 'Find Local Resources',
          onPress: () => navigation.navigate('Profile', { screen: 'CrisisResources' }),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Emergency Support Button */}
      <TouchableOpacity
        style={styles.emergencyButton}
        onPress={handleEmergencySupport}
      >
        <Ionicons name="medical" size={20} color="white" />
        <Text style={styles.emergencyText}>Crisis Support</Text>
      </TouchableOpacity>

      {/* Welcome Section */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        style={styles.welcomeSection}
      >
        <Text style={styles.welcomeText}>Welcome back!</Text>
        <Text style={styles.quoteText}>{dailyQuote}</Text>
      </LinearGradient>

      {/* Mood Check-in */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How are you feeling today?</Text>
        <View style={styles.moodContainer}>
          {moodOptions.map((mood) => (
            <TouchableOpacity
              key={mood.value}
              style={[
                styles.moodButton,
                currentMood?.value === mood.value && styles.selectedMood,
              ]}
              onPress={() => handleMoodSelect(mood)}
            >
              <Ionicons 
                name={mood.icon} 
                size={24} 
                color={currentMood?.value === mood.value ? '#6366f1' : mood.color} 
              />
              <Text style={styles.moodLabel}>{mood.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        {quickActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionCard}
            onPress={action.action}
          >
            <LinearGradient
              colors={action.color}
              style={styles.actionGradient}
            >
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* Gamification Stats */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          {user && !isAnonymous && (
            <TouchableOpacity
              style={styles.viewHistoryButton}
              onPress={() => navigation.navigate('MoodHistory')}
            >
              <Text style={styles.viewHistoryText}>View History</Text>
              <Ionicons name="chevron-forward" size={16} color="#6366f1" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalPoints}</Text>
            <Text style={styles.statLabel}>Points Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{moodStreak}</Text>
            <Text style={styles.statLabel}>Mood Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{dailyHabits.filter(h => h.completed).length}/{dailyHabits.length}</Text>
            <Text style={styles.statLabel}>Habits Done</Text>
          </View>
        </View>
      </View>

      {/* Daily Habits */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Habits</Text>
        <View style={styles.habitsContainer}>
          {dailyHabits.map((habit) => (
            <View key={habit.id} style={styles.habitCard}>
              <View style={styles.habitInfo}>
                <Text style={[
                  styles.habitName,
                  habit.completed && styles.completedHabit
                ]}>
                  <View style={styles.habitNameContainer}>
                    <Ionicons 
                      name={habit.completed ? 'checkmark-circle' : 'ellipse-outline'} 
                      size={16} 
                      color={habit.completed ? '#10b981' : '#6b7280'} 
                    />
                    <Text style={[
                      styles.habitNameText,
                      habit.completed && styles.completedHabit
                    ]}>
                      {habit.name}
                    </Text>
                  </View>
                </Text>
                <Text style={styles.habitPoints}>+{habit.points} points</Text>
              </View>
              {habit.completed && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedText}>Done!</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  emergencyText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  welcomeSection: {
    padding: 20,
    margin: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  quoteText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  viewHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewHistoryText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginRight: 4,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 60,
  },
  selectedMood: {
    backgroundColor: '#e0e7ff',
    borderWidth: 2,
    borderColor: '#6366f1',
  },

  moodLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  actionCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: 16,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  progressCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressText: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  habitsContainer: {
    gap: 12,
  },
  habitCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  habitInfo: {
    flex: 1,
  },
  habitNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  habitNameText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 8,
  },
  completedHabit: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  habitPoints: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  completedBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});