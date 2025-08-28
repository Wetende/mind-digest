import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import wellnessPlanService from '../services/wellnessPlanService';

export default function WellnessTaskCard({ task, onTaskUpdate }) {
  const [loading, setLoading] = useState(false);

  const handleCompleteTask = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const result = await wellnessPlanService.completeTask(task.id);
      if (result.success) {
        onTaskUpdate && onTaskUpdate(task.id, 'completed');
      } else {
        Alert.alert('Error', 'Failed to complete task');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipTask = () => {
    Alert.alert(
      'Skip Task',
      'Are you sure you want to skip this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            const result = await wellnessPlanService.skipTask(task.id, 'User skipped');
            if (result.success) {
              onTaskUpdate && onTaskUpdate(task.id, 'skipped');
            }
          }
        }
      ]
    );
  };

  const getCategoryIcon = (category) => {
    const icons = {
      mindfulness: 'leaf-outline',
      exercise: 'fitness-outline',
      social: 'people-outline',
      journaling: 'journal-outline',
      breathing: 'heart-outline',
      self_care: 'flower-outline',
      learning: 'book-outline',
      creative: 'color-palette-outline'
    };
    return icons[category] || 'checkmark-circle-outline';
  };

  const getCategoryColor = (category) => {
    const colors = {
      mindfulness: '#4CAF50',
      exercise: '#FF9800',
      social: '#2196F3',
      journaling: '#9C27B0',
      breathing: '#F44336',
      self_care: '#E91E63',
      learning: '#3F51B5',
      creative: '#FF5722'
    };
    return colors[category] || '#007AFF';
  };

  if (task.status === 'completed') {
    return (
      <View style={[styles.container, styles.completedContainer]}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons 
                name={getCategoryIcon(task.category)} 
                size={20} 
                color={getCategoryColor(task.category)} 
              />
              <Text style={[styles.title, styles.completedTitle]}>{task.title}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={24} color="#28a745" />
          </View>
          
          <Text style={[styles.description, styles.completedDescription]}>
            {task.description}
          </Text>
          
          <View style={styles.footer}>
            <Text style={styles.completedText}>Completed!</Text>
            <Text style={styles.points}>+{task.points} points</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons 
              name={getCategoryIcon(task.category)} 
              size={20} 
              color={getCategoryColor(task.category)} 
            />
            <Text style={styles.title}>{task.title}</Text>
          </View>
          <View style={styles.duration}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.durationText}>{task.duration_minutes}min</Text>
          </View>
        </View>
        
        <Text style={styles.description}>{task.description}</Text>
        
        <View style={styles.footer}>
          <View style={styles.category}>
            <Text style={[styles.categoryText, { color: getCategoryColor(task.category) }]}>
              {task.category?.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.points}>+{task.points} points</Text>
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipTask}
            disabled={loading}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.completeButton, loading && styles.disabledButton]}
            onPress={handleCompleteTask}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.completeButtonText}>Completing...</Text>
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.completeButtonText}>Complete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  completedContainer: {
    backgroundColor: '#f8f9fa',
    opacity: 0.8,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  completedDescription: {
    textDecorationLine: 'line-through',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  category: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  points: {
    fontSize: 12,
    fontWeight: '600',
    color: '#28a745',
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  completeButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});