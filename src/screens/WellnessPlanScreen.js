import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';
import wellnessPlanService from '../services/wellnessPlanService';
import { Card, LoadingSpinner, Button } from '../components';

export default function WellnessPlanScreen({ navigation, route }) {
  const { user } = useContext(AuthContext);
  const { planId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plan, setPlan] = useState(null);
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);

  useEffect(() => {
    loadWellnessPlan();
  }, [planId]);

  const loadWellnessPlan = async () => {
    try {
      let result;
      if (planId) {
        // Load specific plan (implementation needed in service)
        result = await wellnessPlanService.getWellnessPlan(planId);
      } else {
        // Load active plan
        result = await wellnessPlanService.getActiveWellnessPlan(user.id);
      }

      if (result.success && result.data) {
        setPlan(result.data);
        processPlanData(result.data);
      } else {
        // No active plan, redirect to creation
        navigation.replace('WellnessPlanCreation');
      }
    } catch (error) {
      console.error('Error loading wellness plan:', error);
      Alert.alert('Error', 'Failed to load wellness plan');
    } finally {
      setLoading(false);
    }
  };

  const processPlanData = (planData) => {
    const today = new Date().toISOString().split('T')[0];
    const tasks = planData.wellness_tasks || [];
    
    const todayTasks = tasks.filter(task => task.scheduled_date === today);
    const completed = tasks.filter(task => task.status === 'completed').length;
    
    setTodaysTasks(todayTasks);
    setCompletedTasks(completed);
    setTotalTasks(tasks.length);
  };

  const handleTaskComplete = async (taskId) => {
    try {
      const result = await wellnessPlanService.completeTask(taskId);
      if (result.success) {
        // Refresh the plan data
        await loadWellnessPlan();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete task');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWellnessPlan();
    setRefreshing(false);
  };

  const renderProgressCard = () => (
    <Card style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Your Progress</Text>
        <Text style={styles.progressPercentage}>
          {Math.round((completedTasks / Math.max(totalTasks, 1)) * 100)}%
        </Text>
      </View>
      
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${(completedTasks / Math.max(totalTasks, 1)) * 100}%` }
          ]} 
        />
      </View>
      
      <View style={styles.progressStats}>
        <View style={styles.progressStat}>
          <Text style={styles.progressStatNumber}>{completedTasks}</Text>
          <Text style={styles.progressStatLabel}>Completed</Text>
        </View>
        <View style={styles.progressStat}>
          <Text style={styles.progressStatNumber}>{plan?.current_streak || 0}</Text>
          <Text style={styles.progressStatLabel}>Day Streak</Text>
        </View>
        <View style={styles.progressStat}>
          <Text style={styles.progressStatNumber}>{todaysTasks.length}</Text>
          <Text style={styles.progressStatLabel}>Today's Tasks</Text>
        </View>
      </View>
    </Card>
  );

  const renderTodaysTasks = () => (
    <Card style={styles.tasksCard}>
      <View style={styles.tasksHeader}>
        <Text style={styles.tasksTitle}>Today's Tasks</Text>
        <Text style={styles.tasksDate}>
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
          })}
        </Text>
      </View>

      {todaysTasks.length === 0 ? (
        <View style={styles.noTasksContainer}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#28a745" />
          <Text style={styles.noTasksText}>All tasks completed for today!</Text>
          <Text style={styles.noTasksSubtext}>Great job staying on track</Text>
        </View>
      ) : (
        todaysTasks.map(task => (
          <TouchableOpacity
            key={task.id}
            style={[
              styles.taskItem,
              task.status === 'completed' && styles.taskItemCompleted
            ]}
            onPress={() => task.status !== 'completed' && handleTaskComplete(task.id)}
          >
            <View style={styles.taskContent}>
              <View style={styles.taskHeader}>
                <Text style={[
                  styles.taskTitle,
                  task.status === 'completed' && styles.taskTitleCompleted
                ]}>
                  {task.title}
                </Text>
                <View style={styles.taskMeta}>
                  <Ionicons name="time-outline" size={14} color="#666" />
                  <Text style={styles.taskDuration}>{task.duration_minutes}min</Text>
                </View>
              </View>
              
              <Text style={[
                styles.taskDescription,
                task.status === 'completed' && styles.taskDescriptionCompleted
              ]}>
                {task.description}
              </Text>
              
              <View style={styles.taskFooter}>
                <View style={styles.taskCategory}>
                  <Text style={styles.taskCategoryText}>
                    {task.category?.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.taskPoints}>+{task.points} points</Text>
              </View>
            </View>
            
            <View style={styles.taskStatus}>
              {task.status === 'completed' ? (
                <Ionicons name="checkmark-circle" size={24} color="#28a745" />
              ) : (
                <View style={styles.taskCheckbox} />
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
    </Card>
  );

  const renderPlanOverview = () => (
    <Card style={styles.overviewCard}>
      <Text style={styles.overviewTitle}>{plan?.title}</Text>
      <Text style={styles.overviewDescription}>{plan?.description}</Text>
      
      <View style={styles.overviewStats}>
        <View style={styles.overviewStat}>
          <Ionicons name="calendar-outline" size={20} color="#007AFF" />
          <Text style={styles.overviewStatText}>
            {plan?.duration_weeks} weeks
          </Text>
        </View>
        <View style={styles.overviewStat}>
          <Ionicons name="list-outline" size={20} color="#007AFF" />
          <Text style={styles.overviewStatText}>
            {plan?.preferences?.tasksPerDay || 3} daily tasks
          </Text>
        </View>
        <View style={styles.overviewStat}>
          <Ionicons name="trending-up-outline" size={20} color="#007AFF" />
          <Text style={styles.overviewStatText}>
            {plan?.preferences?.difficulty || 'beginner'}
          </Text>
        </View>
      </View>
    </Card>
  );

  const renderMilestones = () => {
    if (!plan?.milestones || plan.milestones.length === 0) return null;

    return (
      <Card style={styles.milestonesCard}>
        <Text style={styles.milestonesTitle}>Upcoming Milestones</Text>
        {plan.milestones.slice(0, 3).map((milestone, index) => (
          <View key={index} style={styles.milestoneItem}>
            <View style={styles.milestoneIcon}>
              <Ionicons name="trophy-outline" size={20} color="#ffc107" />
            </View>
            <View style={styles.milestoneContent}>
              <Text style={styles.milestoneTitle}>{milestone.title}</Text>
              <Text style={styles.milestoneDescription}>{milestone.description}</Text>
              <Text style={styles.milestoneReward}>
                Reward: {milestone.reward?.points} points + {milestone.reward?.badge}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Loading your wellness plan...</Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="clipboard-outline" size={64} color="#ccc" />
        <Text style={styles.emptyTitle}>No Wellness Plan</Text>
        <Text style={styles.emptyDescription}>
          Create a personalized wellness plan to start your journey
        </Text>
        <Button
          title="Create Plan"
          onPress={() => navigation.navigate('WellnessPlanCreation')}
          style={styles.createPlanButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wellness Plan</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderProgressCard()}
        {renderTodaysTasks()}
        {renderPlanOverview()}
        {renderMilestones()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#f8f9fa',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  createPlanButton: {
    backgroundColor: '#007AFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  menuButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  progressCard: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e1e5e9',
    borderRadius: 4,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  progressStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tasksCard: {
    marginBottom: 20,
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tasksTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  tasksDate: {
    fontSize: 14,
    color: '#666',
  },
  noTasksContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noTasksText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#28a745',
    marginTop: 12,
  },
  noTasksSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  taskItemCompleted: {
    opacity: 0.6,
  },
  taskContent: {
    flex: 1,
    marginRight: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskDuration: {
    fontSize: 12,
    color: '#666',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  taskDescriptionCompleted: {
    textDecorationLine: 'line-through',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskCategory: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taskCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#007AFF',
  },
  taskPoints: {
    fontSize: 12,
    fontWeight: '600',
    color: '#28a745',
  },
  taskStatus: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  overviewCard: {
    marginBottom: 20,
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  overviewDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overviewStatText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  milestonesCard: {
    marginBottom: 20,
  },
  milestonesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  milestoneIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff8e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  milestoneDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  milestoneReward: {
    fontSize: 12,
    color: '#ffc107',
    fontWeight: '500',
  },
});