import { Platform } from 'react-native';
import { supabase } from '../config/supabase';
import wellnessPlanService from './wellnessPlanService';
import notificationService from './notificationService';

// Platform-specific imports
let BackgroundFetch = null;
let TaskManager = null;

if (Platform.OS !== 'web') {
  try {
    BackgroundFetch = require('expo-background-fetch');
    TaskManager = require('expo-task-manager');
  } catch (error) {
    console.warn('Background tasks not available on this platform');
  }
}

const BACKGROUND_FETCH_TASK = 'wellness-background-fetch';

// Define the background task (only on supported platforms)
if (TaskManager) {
  TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('Running wellness background tasks...');
    
    // Process missed tasks and send recovery notifications
    const missedTasksResult = await wellnessPlanService.processMissedTasks();
    console.log('Processed missed tasks:', missedTasksResult);

    // Identify users needing engagement recovery
    const engagementResult = await wellnessPlanService.identifyUsersNeedingEngagementRecovery();
    if (engagementResult.success && engagementResult.data.length > 0) {
      console.log(`Found ${engagementResult.data.length} users needing engagement recovery`);
      
      // Send recovery notifications
      for (const user of engagementResult.data) {
        await wellnessPlanService.sendEngagementRecoveryNotification(user.user_id, user.id);
      }
    }

    // Check for plans that need adaptation (run weekly)
    const today = new Date();
    if (today.getDay() === 0) { // Sunday
      await runWeeklyPlanAdaptations();
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background task error:', error);
    return BackgroundFetch?.BackgroundFetchResult?.Failed || 'failed';
  }
  });
}

// Run weekly plan adaptations
async function runWeeklyPlanAdaptations() {
  try {
    // Get all active plans
    const { data: activePlans, error } = await supabase
      .from('wellness_plans')
      .select('id, user_id')
      .eq('status', 'active');

    if (error) throw error;

    console.log(`Running adaptations for ${activePlans?.length || 0} active plans`);

    // Adapt each plan based on user behavior
    for (const plan of activePlans || []) {
      const adaptationResult = await wellnessPlanService.adaptPlanBasedOnBehavior(plan.id);
      
      if (adaptationResult.success && adaptationResult.adaptations.length > 0) {
        console.log(`Applied ${adaptationResult.adaptations.length} adaptations to plan ${plan.id}`);
        
        // Notify user about plan adaptations
        await notificationService.scheduleEngagementRecovery(
          plan.user_id,
          'We\'ve personalized your wellness plan based on your progress! Check out your updated tasks.',
          1 // 1 hour delay
        );
      }
    }
  } catch (error) {
    console.error('Error running weekly adaptations:', error);
  }
}

class BackgroundTaskService {
  constructor() {
    this.isRegistered = false;
  }

  // Register background fetch task
  async registerBackgroundFetch() {
    if (Platform.OS === 'web' || !BackgroundFetch) {
      console.log('Background fetch not supported on web platform');
      return false;
    }

    try {
      const status = await BackgroundFetch.getStatusAsync();
      
      if (status === BackgroundFetch.BackgroundFetchStatus.Restricted || 
          status === BackgroundFetch.BackgroundFetchStatus.Denied) {
        console.warn('Background fetch is disabled');
        return false;
      }

      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 60 * 60 * 6, // 6 hours
        stopOnTerminate: false,
        startOnBoot: true,
      });

      this.isRegistered = true;
      console.log('Background fetch registered successfully');
      return true;
    } catch (error) {
      console.error('Error registering background fetch:', error);
      return false;
    }
  }

  // Unregister background fetch task
  async unregisterBackgroundFetch() {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      this.isRegistered = false;
      console.log('Background fetch unregistered');
      return true;
    } catch (error) {
      console.error('Error unregistering background fetch:', error);
      return false;
    }
  }

  // Check if background fetch is available and registered
  async getStatus() {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      
      return {
        status,
        isRegistered: isTaskRegistered,
        isAvailable: status === BackgroundFetch.BackgroundFetchStatus.Available
      };
    } catch (error) {
      console.error('Error getting background fetch status:', error);
      return {
        status: 'unknown',
        isRegistered: false,
        isAvailable: false
      };
    }
  }

  // Manually trigger background tasks (for testing)
  async runManualBackgroundTasks() {
    try {
      console.log('Running manual background tasks...');
      
      // Process missed tasks
      const missedResult = await wellnessPlanService.processMissedTasks();
      console.log('Missed tasks result:', missedResult);

      // Check engagement recovery
      const engagementResult = await wellnessPlanService.identifyUsersNeedingEngagementRecovery();
      console.log('Engagement recovery result:', engagementResult);

      return {
        success: true,
        results: {
          missedTasks: missedResult,
          engagementRecovery: engagementResult
        }
      };
    } catch (error) {
      console.error('Error running manual background tasks:', error);
      return { success: false, error: error.message };
    }
  }

  // Schedule daily plan adaptations for a specific user
  async scheduleUserPlanAdaptation(userId, planId) {
    try {
      // Run adaptation analysis
      const result = await wellnessPlanService.adaptPlanBasedOnBehavior(planId);
      
      if (result.success) {
        console.log(`Plan adaptation completed for user ${userId}:`, result.adaptations);
        
        // If adaptations were made, notify the user
        if (result.adaptations.length > 0) {
          await notificationService.scheduleEngagementRecovery(
            userId,
            `We've updated your wellness plan to better fit your progress! ${result.adaptations.length} improvements made.`,
            2 // 2 hours delay
          );
        }
        
        return { success: true, adaptations: result.adaptations };
      }
      
      return result;
    } catch (error) {
      console.error('Error scheduling user plan adaptation:', error);
      return { success: false, error: error.message };
    }
  }

  // Initialize background services for a user
  async initializeForUser(userId) {
    try {
      // Register background fetch if not already registered
      if (!this.isRegistered) {
        await this.registerBackgroundFetch();
      }

      // Initialize notifications
      await notificationService.initialize();

      // Get user's notification preferences and schedule reminders
      const prefsResult = await notificationService.getUserNotificationPreferences(userId);
      if (prefsResult.success && prefsResult.data.dailyReminders) {
        await notificationService.scheduleDailyTaskReminders(userId, prefsResult.data);
      }

      console.log(`Background services initialized for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error initializing background services:', error);
      return { success: false, error: error.message };
    }
  }

  // Cleanup background services for a user (on logout)
  async cleanupForUser(userId) {
    try {
      // Cancel user's scheduled notifications
      await notificationService.cancelUserReminders(userId);
      
      console.log(`Background services cleaned up for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error cleaning up background services:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new BackgroundTaskService();