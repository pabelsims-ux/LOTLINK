/**
 * LotoLink Mobile App - Main Application Component
 * React Native App for iOS and Android
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import HomeScreen from './screens/HomeScreen';
import BancasScreen from './screens/BancasScreen';
import LoteriasScreen from './screens/LoteriasScreen';
import ProfileScreen from './screens/ProfileScreen';
import PlayScreen from './screens/PlayScreen';
import LoginScreen from './screens/LoginScreen';

// Services
import { AuthProvider, useAuth } from './services/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Theme colors matching web app
const Colors = {
  light: {
    primary: '#0071e3',
    background: '#f5f5f7',
    card: '#ffffff',
    text: '#1d1d1f',
    textSecondary: '#86868b',
    border: '#e8e8ed',
    success: '#34c759',
    warning: '#ff9f0a',
    danger: '#ff3b30',
  },
  dark: {
    primary: '#0077ED',
    background: '#000000',
    card: '#1c1c1e',
    text: '#f5f5f7',
    textSecondary: '#a1a1a6',
    border: '#38383a',
    success: '#30d158',
    warning: '#ffd60a',
    danger: '#ff453a',
  },
};

// Main Tab Navigator
function MainTabs() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 85,
        },
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Bancas"
        component={BancasScreen}
        options={{
          title: 'Bancas',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="location" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Play"
        component={PlayScreen}
        options={{
          title: 'Jugar',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="play" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Loterias"
        component={LoteriasScreen}
        options={{
          title: 'Loterías',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="ticket" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="user" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Simple Tab Icon Component
function TabIcon({ name, color, size }) {
  const icons = {
    home: '🏠',
    location: '📍',
    play: '🎲',
    ticket: '🎰',
    user: '👤',
  };
  
  return (
    <React.Text style={{ fontSize: size, color }}>
      {icons[name] || '●'}
    </React.Text>
  );
}

// Auth Navigator
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
}

// Root Navigator
function RootNavigator() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

// Main App Component
function App(): React.JSX.Element {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <AuthProvider>
      <NavigationContainer>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <StatusBar
            barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
            backgroundColor={colors.background}
          />
          <RootNavigator />
        </SafeAreaView>
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
