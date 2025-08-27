import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage utility functions for local data management

export const storeData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    return { success: true };
  } catch (error) {
    console.error('Error storing data:', error);
    return { success: false, error: error.message };
  }
};

export const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error getting data:', error);
    return null;
  }
};

export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    return { success: true };
  } catch (error) {
    console.error('Error removing data:', error);
    return { success: false, error: error.message };
  }
};

export const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
    return { success: true };
  } catch (error) {
    console.error('Error clearing data:', error);
    return { success: false, error: error.message };
  }
};

export const getAllKeys = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys;
  } catch (error) {
    console.error('Error getting keys:', error);
    return [];
  }
};

// Specific storage functions for Mind-digest

export const storeUserPreferences = async (preferences) => {
  return await storeData('user_preferences', preferences);
};

export const getUserPreferences = async () => {
  return await getData('user_preferences');
};

export const storeMoodHistory = async (moodHistory) => {
  return await storeData('mood_history', moodHistory);
};

export const getMoodHistory = async () => {
  return await getData('mood_history') || [];
};

export const storeJournalEntries = async (entries) => {
  return await storeData('journal_entries', entries);
};

export const getJournalEntries = async () => {
  return await getData('journal_entries') || [];
};

export const storeAnonymousSession = async (sessionData) => {
  return await storeData('anonymous_session', sessionData);
};

export const getAnonymousSession = async () => {
  return await getData('anonymous_session');
};

export const clearAnonymousSession = async () => {
  return await removeData('anonymous_session');
};

export const storeOfflineData = async (data) => {
  const timestamp = new Date().toISOString();
  const offlineData = { ...data, timestamp, synced: false };
  
  const existingData = await getData('offline_queue') || [];
  existingData.push(offlineData);
  
  return await storeData('offline_queue', existingData);
};

export const getOfflineQueue = async () => {
  return await getData('offline_queue') || [];
};

export const clearOfflineQueue = async () => {
  return await removeData('offline_queue');
};