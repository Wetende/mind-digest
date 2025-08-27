import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { journalService } from '../services';
import { LoadingSpinner } from '../components';
import { getMoodIcon } from '../utils/formatUtils';

export default function JournalHistoryScreen({ navigation }) {
  const { user, isAnonymous } = useAuth();
  const [entries, setEntries] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user && !isAnonymous) {
      loadJournalData();
    } else {
      setLoading(false);
    }
  }, [user, isAnonymous]);

  const loadJournalData = async () => {
    setLoading(true);
    try {
      const [entriesResult, insightsResult] = await Promise.all([
        journalService.getEntries(user.id, 50),
        journalService.getInsights(user.id, 30)
      ]);

      if (entriesResult.success) {
        setEntries(entriesResult.data);
      }

      if (insightsResult.success) {
        setInsights(insightsResult.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load journal data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadJournalData();
    setRefreshing(false);
  };

  const renderInsightsSummary = () => {
    if (!insights || insights.totalEntries === 0) return null;

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>Journal Insights</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{insights.totalEntries}</Text>
            <Text style={styles.statLabel}>Total Entries</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{insights.averageMood.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avg Mood</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.trendContainer}>
              <Ionicons 
                name={insights.moodTrend === 'improving' ? 'trending-up' : 
                      insights.moodTrend === 'declining' ? 'trending-down' : 'remove'} 
                size={16} 
                color={insights.moodTrend === 'improving' ? '#10b981' : 
                       insights.moodTrend === 'declining' ? '#ef4444' : '#6b7280'} 
              />
              <Text style={[
                styles.trendText,
                { color: insights.moodTrend === 'improving' ? '#10b981' : 
                         insights.moodTrend === 'declining' ? '#ef4444' : '#6b7280' }
              ]}>
                {insights.moodTrend}
              </Text>
            </View>
            <Text style={styles.statLabel}>Trend</Text>
          </View>
        </View>

        {insights.keyThemes.length > 0 && (
          <View style={styles.themesSection}>
            <Text style={styles.subsectionTitle}>Key Themes</Text>
            <View style={styles.themesList}>
              {insights.keyThemes.slice(0, 5).map((theme, index) => (
                <View key={index} style={styles.themeTag}>
                  <Text style={styles.themeText}>{theme.theme}</Text>
                  <Text style={styles.themeCount}>{theme.count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderJournalEntry = (entry) => {
    const moodIcon = getMoodIcon(entry.mood);
    const date = new Date(entry.created_at);
    const isToday = date.toDateString() === new Date().toDateString();
    const isYesterday = date.toDateString() === new Date(Date.now() - 86400000).toDateString();
    
    let dateText = date.toLocaleDateString();
    if (isToday) dateText = 'Today';
    else if (isYesterday) dateText = 'Yesterday';

    return (
      <TouchableOpacity
        key={entry.id}
        style={styles.entryCard}
        onPress={() => navigation.navigate('JournalEntry', { entry })}
      >
        <View style={styles.entryHeader}>
          <View style={styles.entryMeta}>
            <Text style={styles.entryDate}>{dateText}</Text>
            <Text style={styles.entryTime}>
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          
          <View style={styles.entryMood}>
            <Ionicons name={moodIcon.name} size={16} color={moodIcon.color} />
            <Text style={styles.entryMoodText}>
              {['', 'Anxious', 'Low', 'Okay', 'Good', 'Great'][entry.mood]}
            </Text>
          </View>
        </View>

        <Text style={styles.entryContent} numberOfLines={3}>
          {entry.content}
        </Text>

        {entry.ai_insights && (
          <View style={styles.aiInsights}>
            <View style={styles.aiInsightHeader}>
              <Ionicons name="bulb" size={14} color="#f59e0b" />
              <Text style={styles.aiInsightTitle}>AI Insights</Text>
            </View>
            
            <View style={styles.sentimentContainer}>
              <Text style={styles.sentimentLabel}>Sentiment:</Text>
              <View style={[
                styles.sentimentBadge,
                { backgroundColor: entry.ai_insights.sentiment > 0 ? '#dcfce7' : '#fef2f2' }
              ]}>
                <Text style={[
                  styles.sentimentText,
                  { color: entry.ai_insights.sentiment > 0 ? '#166534' : '#991b1b' }
                ]}>
                  {entry.ai_insights.sentiment > 0 ? 'Positive' : 'Challenging'}
                </Text>
              </View>
            </View>

            {entry.ai_insights.keyThemes && entry.ai_insights.keyThemes.length > 0 && (
              <View style={styles.themesContainer}>
                <Text style={styles.themesLabel}>Themes:</Text>
                <View style={styles.themeChips}>
                  {entry.ai_insights.keyThemes.slice(0, 3).map((theme, index) => (
                    <Text key={index} style={styles.themeChip}>
                      {theme}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {entry.ai_insights.recommendations && entry.ai_insights.recommendations.length > 0 && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationText} numberOfLines={2}>
                  💡 {entry.ai_insights.recommendations[0]}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
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
          <Text style={styles.title}>Journal History</Text>
        </View>
        
        <View style={styles.anonymousMessage}>
          <Ionicons name="shield-checkmark" size={48} color="#6366f1" />
          <Text style={styles.anonymousTitle}>Anonymous Mode</Text>
          <Text style={styles.anonymousText}>
            Journal history and AI insights are not available in anonymous mode. Create an account to access these features.
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return <LoadingSpinner text="Loading journal history..." />;
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
        <Text style={styles.title}>Journal History</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {renderInsightsSummary()}

        <View style={styles.entriesContainer}>
          <Text style={styles.entriesTitle}>All Entries</Text>
          
          {entries.length > 0 ? (
            entries.map(renderJournalEntry)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="journal-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyStateTitle}>No journal entries yet</Text>
              <Text style={styles.emptyStateText}>
                Start writing in your journal to see your entries and AI insights here
              </Text>
            </View>
          )}
        </View>
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
  content: {
    flex: 1,
  },
  insightsContainer: {
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
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    fontSize: 20,
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
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  themesSection: {
    marginTop: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  themesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  themeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  themeText: {
    fontSize: 12,
    color: '#3730a3',
    marginRight: 4,
  },
  themeCount: {
    fontSize: 10,
    color: '#3730a3',
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
  entriesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  entryCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryMeta: {
    flex: 1,
  },
  entryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  entryTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  entryMood: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryMoodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
    marginLeft: 6,
  },
  entryContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  aiInsights: {
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiInsightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginLeft: 6,
  },
  sentimentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sentimentLabel: {
    fontSize: 12,
    color: '#92400e',
    marginRight: 8,
  },
  sentimentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sentimentText: {
    fontSize: 11,
    fontWeight: '600',
  },
  themesContainer: {
    marginBottom: 8,
  },
  themesLabel: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 4,
  },
  themeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  themeChip: {
    fontSize: 10,
    color: '#92400e',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 2,
  },
  recommendationsContainer: {
    marginTop: 4,
  },
  recommendationText: {
    fontSize: 12,
    color: '#92400e',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
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