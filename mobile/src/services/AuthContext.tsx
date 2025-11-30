/**
 * LotoLink Mobile - Authentication Context
 * Manages user authentication state across the app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  memberSince: string;
  balance: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const USER_STORAGE_KEY = '@lotolink_user';
const TOKEN_STORAGE_KEY = '@lotolink_token';

// API Base URL (configure for production)
const API_BASE_URL = 'https://api.lotolink.com';

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user on app start
  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // In production, this would call the actual API
      // const response = await fetch(`${API_BASE_URL}/auth/login`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password }),
      // });
      // const data = await response.json();
      
      // For demo purposes, simulate successful login
      const mockUser: User = {
        id: 'user_' + Date.now(),
        email: email,
        name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()),
        memberSince: new Date().toLocaleDateString('es-DO', { month: 'long', year: 'numeric' }),
        balance: 1500,
      };

      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, 'mock_jwt_token_' + Date.now());
      setUser(mockUser);
    } catch (error) {
      throw new Error('Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      // In production, this would call the actual API
      // const response = await fetch(`${API_BASE_URL}/auth/register`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password, name }),
      // });
      // const data = await response.json();
      
      // For demo purposes, simulate successful registration
      const mockUser: User = {
        id: 'user_' + Date.now(),
        email: email,
        name: name,
        memberSince: new Date().toLocaleDateString('es-DO', { month: 'long', year: 'numeric' }),
        balance: 0,
      };

      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, 'mock_jwt_token_' + Date.now());
      setUser(mockUser);
    } catch (error) {
      throw new Error('Error al crear la cuenta. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
