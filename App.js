import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { configValidator } from './src/utils/configValidator';
import { initSentry } from './src/utils/sentryConfig';
import { ENV } from './src/config/env';

// Import main screens
import HomeScreen from './src/screens/HomeScreen';
import PeerSupportScreen from './src/screens/PeerSupportScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';
import ToolkitScreen from './src/screens/ToolkitScreen';
import JournalScreen from './src/screens/JournalScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MoodHistoryScreen from './src/screens/MoodHistoryScreen';
import JournalHistoryScreen from './src/screens/JournalHistoryScreen';
import RolePlayScreen from './src/screens/RolePlayScreen';
import ScenarioPlannerScreen from './src/screens/ScenarioPlannerScreen';
import MoodTrackingScreen from './src/screens/MoodTrackingScreen';
import UserMatchingScreen from './src/screens/UserMatchingScreen';
import HabitTrackingScreen from './src/screens/HabitTrackingScreen';
import SocialAccountabilityScreen from './src/screens/SocialAccountabilityScreen';
import WellnessPlanCreationScreen from './src/screens/WellnessPlanCreationScreen';
import WellnessPlanScreen from './src/screens/WellnessPlanScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';

// Import auth screens
import {
  WelcomeScreen,
  SignUpScreen,
  SignInScreen,
  AnonymousSetupScreen,
  ProfileSetupScreen,
} from './src/screens/auth';

// Import profile screens
import {
  EditProfileScreen,
  InterestsSettingsScreen,
  PrivacySettingsScreen,
  CrisisResourcesScreen,
  HelpSupportScreen,
} from './src/screens/profile';

// Import context and components
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LoadingSpinner } from './src/components';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main app with bottom tabs
function MainApp() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        headerStyle: {
          backgroundColor: '#f8fafc',
        },
        headerTintColor: '#1f2937',
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          headerTitle: 'Mind-digest'
        }}
      />
      <Tab.Screen 
        name="Peer Support" 
        component={PeerSupportScreen}
        options={{
          tabBarLabel: 'Community',
        }}
      />
      <Tab.Screen 
        name="Toolkit" 
        component={ToolkitScreen}
        options={{
          tabBarLabel: 'Social Ease',
        }}
      />
      <Tab.Screen 
        name="Journal" 
        component={JournalScreen}
        options={{
          tabBarLabel: 'Journal',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

// Authentication stack
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="AnonymousSetup" component={AnonymousSetupScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </Stack.Navigator>
  );
}

// Main app stack with profile screens
function MainAppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={MainApp} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="InterestsSettings" 
        component={InterestsSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PrivacySettings" 
        component={PrivacySettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CrisisResources" 
        component={CrisisResourcesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="HelpSupport" 
        component={HelpSupportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ChatRoom" 
        component={ChatRoomScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="MoodHistory" 
        component={MoodHistoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="JournalHistory" 
        component={JournalHistoryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="RolePlay" 
        component={RolePlayScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ScenarioPlanner" 
        component={ScenarioPlannerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="MoodTracking" 
        component={MoodTrackingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="UserMatching" 
        component={UserMatchingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="HabitTracking" 
        component={HabitTrackingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SocialAccountability"
        component={SocialAccountabilityScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WellnessPlanCreation"
        component={WellnessPlanCreationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WellnessPlan"
        component={WellnessPlanScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// App navigator that handles auth state
function AppNavigator() {
  const { user, loading } = useAuth();

  console.log('AppNavigator - User:', user?.id, 'Loading:', loading);

  if (loading) {
    return <LoadingSpinner text="Loading Mind-digest..." />;
  }

  // Use a key to force re-render when user state changes
  const navigationKey = user ? `authenticated-${user.id}` : 'unauthenticated';

  return (
    <Stack.Navigator key={navigationKey} screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="MainApp" component={MainAppStack} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  // Initialize Sentry crash reporting early
  useEffect(() => {
    initSentry();
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <View style={styles.container}>
          <StatusBar style="auto" />
          <AppNavigator />
        </View>
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: 5,
    paddingTop: 5,
    height: 60,
  },
});
