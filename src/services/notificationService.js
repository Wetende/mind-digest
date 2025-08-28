import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

// Platform-specific imports
let Notifications = null;
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (error) {
    console.warn('Notifications not available on this platform');
  }
}

class NotificationService {
  constructor() {
    this.isInitialized = false;
  }

  // Initialize notification permissions and setup
  async initialize() {
    if (Platform.OS === 'web' || !Notifications) {
      console.log('Notifications not supported on web platform');
      this.isInitialized = false;
      return false;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  // Schedule daily wellness task reminders
  async scheduleDailyTaskReminders(userId, preferences = {}) {
    if (Platform.OS === 'web' || !Notifications) {
      console.log('Notifications not supported on web platform');
      return { success: false, error: 'Not supported on web' };
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Cancel existing reminders for this user
      await this.cancelUserReminders(userId);

      const reminderTimes = preferences.reminderTimes || [
        { hour: 9, minute: 0, label: 'Morning' },
        { hour: 14, minute: 0, label: 'Afternoon' },
        { hour: 19, minute: 0, label: 'Evening' }
      ];

      const scheduledNotifications = [];

      for (const time of reminderTimes) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `${time.label} Wellness Check 🌟`,
            body: 'Time for your daily wellness tasks! Small steps lead to big changes.',
            data: {
              type: 'daily_reminder',
              userId,
              time: time.label.toLowerCase()
            },
          },
          trigger: {
            hour: time.hour,
            minute: time.minute,
            repeats: true,
          },
        });

        scheduledNotifications.push({
          id: notificationId,
          time,
          userId
        });
      }

      // Store notification IDs in database for management
      await this.storeNotificationIds(userId, scheduledNotifications);

      return { success: true, scheduled: scheduledNotifications.length };
    } catch (error) {
      console.error('Error scheduling reminders:', error);
      return { success: false, error: error.message };
    }
  }

  // Schedule milestone celebration notification
  async scheduleMilestoneCelebration(userId, milestone, delay = 0) {
    if (Platform.OS === 'web' || !Notifications) {
      return { success: false, error: 'Not supported on web' };
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Milestone Achieved!',
          body: `Congratulations! You've reached: ${milestone.title}`,
          data: {
            type: 'milestone_celebration',
            userId,
            milestone
          },
        },
        trigger: {
          seconds: delay,
        },
      });

      return { success: true, notificationId };
    } catch (error) {
      console.error('Error scheduling milestone notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Schedule engagement recovery notification
  async scheduleEngagementRecovery(userId, message, delayHours = 24) {
    if (Platform.OS === 'web' || !Notifications) {
      return { success: false, error: 'Not supported on web' };
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'We miss you! 💙',
          body: message || 'Your wellness journey is important. Ready to take a small step today?',
          data: {
            type: 'engagement_recovery',
            userId
          },
        },
        trigger: {
          seconds: delayHours * 3600, // Convert hours to seconds
        },
      });

      return { success: true, notificationId };
    } catch (error) {
      console.error('Error scheduling engagement recovery:', error);
      return { success: false, error: error.message };
    }
  }

  // Send immediate notification for crisis support
  async sendCrisisNotification(userId, message) {
    if (Platform.OS === 'web' || !Notifications) {
      return { success: false, error: 'Not supported on web' };
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🆘 Crisis Support Available',
          body: message || 'Immediate support resources are available. You are not alone.',
          data: {
            type: 'crisis_support',
            userId,
            priority: 'high'
          },
        },
        trigger: null, // Send immediately
      });

      return { success: true, notificationId };
    } catch (error) {
      console.error('Error sending crisis notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Cancel all reminders for a user
  async cancelUserReminders(userId) {
    if (Platform.OS === 'web' || !Notifications) {
      return { success: true }; // No-op on web
    }

    try {
      // Get stored notification IDs for this user
      const { data: storedNotifications, error } = await supabase
        .from('user_notifications')
        .select('notification_ids')
        .eq('user_id', userId)
        .single();

      if (!error && storedNotifications?.notification_ids) {
        // Cancel each notification
        for (const notificationId of storedNotifications.notification_ids) {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
        }

        // Clear from database
        await supabase
          .from('user_notifications')
          .delete()
          .eq('user_id', userId);
      }

      return { success: true };
    } catch (error) {
      console.error('Error canceling user reminders:', error);
      return { success: false, error: error.message };
    }
  }

  // Store notification IDs in database for management
  async storeNotificationIds(userId, notifications) {
    try {
      const notificationIds = notifications.map(n => n.id);
      
      const { error } = await supabase
        .from('user_notifications')
        .upsert([{
          user_id: userId,
          notification_ids: notificationIds,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error storing notification IDs:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's notification preferences
  async getUserNotificationPreferences(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const notificationPrefs = data?.preferences?.notifications || {
        dailyReminders: true,
        milestones: true,
        engagementRecovery: true,
        crisisSupport: true,
        reminderTimes: [
          { hour: 9, minute: 0, label: 'Morning' },
          { hour: 19, minute: 0, label: 'Evening' }
        ]
      };

      return { success: true, data: notificationPrefs };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Update user's notification preferences
  async updateNotificationPreferences(userId, preferences) {
    try {
      const { data: currentUser, error: fetchError } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const updatedPreferences = {
        ...currentUser.preferences,
        notifications: preferences
      };

      const { error } = await supabase
        .from('users')
        .update({ preferences: updatedPreferences })
        .eq('id', userId);

      if (error) throw error;

      // Reschedule reminders with new preferences
      if (preferences.dailyReminders) {
        await this.scheduleDailyTaskReminders(userId, preferences);
      } else {
        await this.cancelUserReminders(userId);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Handle notification response (when user taps notification)
  async handleNotificationResponse(response) {
    const { data } = response.notification.request.content;
    
    try {
      switch (data.type) {
        case 'daily_reminder':
          // Navigate to home screen or wellness tasks
          return { action: 'navigate', screen: 'Home' };
          
        case 'milestone_celebration':
          // Show milestone celebration modal
          return { 
            action: 'show_modal', 
            modal: 'milestone_celebration',
            data: data.milestone 
          };
          
        case 'engagement_recovery':
          // Navigate to wellness plan or show encouragement
          return { action: 'navigate', screen: 'WellnessPlan' };
          
        case 'crisis_support':
          // Navigate to crisis resources
          return { action: 'navigate', screen: 'CrisisSupport' };
          
        default:
          return { action: 'navigate', screen: 'Home' };
      }
    } catch (error) {
      console.error('Error handling notification response:', error);
      return { action: 'navigate', screen: 'Home' };
    }
  }

  // Get all scheduled notifications for debugging
  async getAllScheduledNotifications() {
    if (Platform.OS === 'web' || !Notifications) {
      return { success: false, error: 'Not supported on web' };
    }

    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return { success: true, data: notifications };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Clear all notifications
  async clearAllNotifications() {
    if (Platform.OS === 'web' || !Notifications) {
      return { success: true }; // No-op on web
    }

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new NotificationService();