import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useAuth } from '../contexts/AuthContext';
import socialProgressService from '../services/socialProgressService';
import { LoadingSpinner } from '../components';

const { width } = Dimensions.get('window');

export default function SocialProgressScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [recentProgress, setRecentProgress] = useState([]);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [statsData, achievementsData, progressData] = await Promise.all([
        socialProgressService.getProgressStats(user.id),
        socialProgressService.getAchievements(user.id),
        socialProgressService.getUserProgress(user.id)
      ]);

      setStats(statsData);
      setAchievements(achievementsData);
      setRecentProgress(progressData.slice(0, 10));
    } catch (error) {
      console.error('Error loading progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImprovementIcon = (trend) => {
    switch (trend) {
      case 'improving': return 'trending-up';
      case 'declining': return 'trending-down';
      case 'stable': return 'remove';
      default: return 'help';
    }
  };

  const getImprovementColor = (trend) => {
    switch (trend) {
      case 'improving': return '#10b981';
      case 'declining': return '#ef4444';
      case 'stable': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const renderStatsCard = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsCard}>
        <Text style={styles.cardTitle}>Your Progress Overview</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.rolePlaySessions}</Text>
            <Text style={styles.statLabel}>Role-Play</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.scenarioPlannerSessions}</Text>
            <Text style={styles.statLabel}>Scenario Plans</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.averageRolePlayScore}%</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
        </View>

        <View style={styles.trendContainer}>
          <Ionicons 
            name={getImprovementIcon(stats.improvementTrend)} 
            size={20} 
            color={getImprovementColor(stats.improvementTrend)} 
          />
          <Text style={[styles.trendText, { color: getImprovementColor(stats.improvementTrend) }]}>
            {stats.improvementTrend === 'improving' && 'Your skills are improving!'}
            