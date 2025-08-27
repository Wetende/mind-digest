import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { moodService } from '../services';
import { LoadingSpinner } from '../components';
import { getMoodIcon } from '../utils/formatUtils';

const { width } = Dimensions.get('window');

export default function MoodHistoryScreen({ navigation }) {
  const { user, isAnonymous } = useAuth();
  const [moodEntries, setMoodEntries] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const periods = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
  ];

  useEffect(() => {
    if (user && !isAnonymous) {
      loadMoodData();
    } else {
      setLoading(false);
    }
  }, [user, isAnonymous, selectedPeriod]);

  const loadMoodData = async () => {
    setLoading(true);
    try {
      const [entriesResult, analyticsResult] = await Promise.all([
        moodService.getMoodEntries(user.id, selectedPeriod),
        moodService.getMoodAnalytics(user.id, selectedPeriod)
      ]);

      if (entriesResult.success) {
        setMoodEntries(entriesResult.data);
      }

      if (analyticsResult.success) {
        setAnalytics(analyticsResult.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load mood data');
    } finally {
      setLoading(false);
    }
  };

  const renderMoodChart = () => {
    if (!analytics || analytics.moodHistory.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Ionicons name="bar-chart-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyChartText}>No mood data available</Text>
        </View>
      );
    }

    const maxMood = 5;
    const chartHeight = 150;
    const chartWidth = width - 64;
    const pointWidth = chartWidth / Math.max(analytics.moodHistory.length - 1, 1);

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Mood Trend</Text>
        <View style={[styles.chart, { height: chartHeight, width: chartWidth }]}>
          {analytics.moodHistory.map((entry, index) => {
            const x = index * pointWidth;
            const y = chartHeight - (entry.mood / maxMood) * chartHeight;
            const moodIcon = getMoodIcon(entry.mood);
            
            return (
              <View
                key={index}
                style={[
                  styles.chartPoint,
                  {
                    left: x - 8,
                    top: y - 8,
                    backgroundColor: moodIcon.color,
                  }
                ]}
              >
                <Ionicons name={moodIcon.name} size={12} color="white" />
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderAnalytics = () => {
    if (!analytics) return null;

    const getTrendIcon = () => {
      switch (analytics.moodTrend) {
        case 'improving':
          return { name: 'trending-up', color: '#10b981' };
        case 'declining':
          return { name: 'trending-down', color: '#ef4444' };
        default:
          return { name: 'remove', color: '#6b7280' };
      }
    };

    const trendIcon = getTrendIcon();

    return (
      <View style={styles.analyticsContainer}>
        <Text style={styles.sectionTitle}>Analytics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.averageMood.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Average Mood</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.trendContainer}>
              <Ionicons name={trendIcon.name} size={20} color={trendIcon.color} />
              <Text style={[styles.trendText, { color: trendIcon.color }]}>
                {analytics.moodTrend}
              </Text>
            </View>
            <Text style={styles.statLabel}>Trend</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{analytics.totalEntries}</Text>
            <Text style={styles.statLabel}>Total Entries</Text>
          </View>
        </View>

        {analytics.commonEmotions.length > 0 && (
          <View style={styles.emotionsSection}>
            <Text style={styles.subsectionTitle}>Common Emotions</Text>
            <View style={styles.emotionsList}>
              {analytics.commonEmotions.map((emotion, index) => (
                <View key={index} style={styles.emotionTag}>
                  <Text style={styles.emotionText}>{emotion.emotion}</Text>
                  <Text style={styles.emotionCount}>{emotion.count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {analytics.frequentTriggers.length > 0 && (
          <View style={styles.triggersSection}>
            <Text style={styles.subsectionTitle}>Common Triggers</Text>
            <View style={styles.triggersList}>
              {analytics.frequentTriggers.map((trigger, index) => (
                <View key={index} style={styles.triggerTag}>
                  <Text style={styles.triggerText}>{trigger.trigger}</Text>
                  <Text style={styles.triggerCount}>{trigger.count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderMoodEntries = () => {
    if (moodEntries.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyStateText}>No mood entries yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start tracking your mood from the home screen
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.entriesContainer}>
        <Text style={styles.sectionTitle}>Recent Entries</Text>
        {moodEntries.slice(0, 10).map((entry) => {
          const moodIcon = getMoodIcon(entry.mood);
          const date = new Date(entry.created_at);
          
          return (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <View style={styles.entryMood}>
                  <Ionicons name={moodIcon.name} size={20} color={moodIcon.color} />
                  <Text style={styles.entryMoodText}>
                    {['', 'Anxious', 'Low', 'Okay', 'Good', 'Great'][entry.mood]}
                  </Text>
                </View>
                <Text style={styles.entryDate}>
                  {date.toLocaleDateString()}
                </Text>
              </View>
              
              {entry.emotions && entry.emotions.length > 0 && (
                <View style={styles.entryEmotions}>
                  {entry.emotions.map((emotion, index) => (
                    <Text key={index} style={styles.emotionChip}>
                      {emotion}
                    </Text>
                  ))}
                </View>
              )}
              
              {entry.notes && (
                <Text style={styles.entryNotes} numberOfLines={2}>
                  {entry.notes}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  if (isAnonymous) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Mood History</Text>
        </View>
        
        <View style={styles.anonymousMessage}>
          <Ionicons name="shield-checkmark" size={48} color="#6366f1" />
          <Text style={styles.anonymousTitle}>Anonymous Mode</Text>
          <Text style={styles.anonymousText}>
            Mood history is not available in anonymous mode. Create an account to track your mood over time.
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return <LoadingSpinner text="Loading mood history..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Mood History</Text>
      </View>

      <View style={styles.periodSelector}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.value}
            style={[
              styles.periodButton,
              selectedPeriod === period.value && styles.selectedPeriod
            ]}
            onPress={() => setSelectedPeriod(period.value)}
          >
            <Text style={[
              styles.periodText,
              selectedPeriod === period.value && styles.selectedPeriodText
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {renderMoodChart()}
        {renderAnalytics()}
        {renderMoodEntries()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f3f4f6',
  },
  selectedPeriod: {
    backgroundColor: '#6366f1',
  },
  periodText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedPeriodText: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  chartContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  chart: {
    position: 'relative',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  chartPoint: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChartText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  analyticsContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  emotionsSection: {
    marginBottom: 20,
  },
  emotionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  emotionText: {
    fontSize: 14,
    color: '#1e40af',
    marginRight: 4,
  },
  emotionCount: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  triggersSection: {
    marginBottom: 20,
  },
  triggersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  triggerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  triggerText: {
    fontSize: 14,
    color: '#92400e',
    marginRight: 4,
  },
  triggerCount: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
  },
  entriesContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entryCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryMood: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryMoodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  entryDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  entryEmotions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  emotionChip: {
    fontSize: 12,
    color: '#6366f1',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  entryNotes: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  anonymousMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  anonymousTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  anonymousText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});