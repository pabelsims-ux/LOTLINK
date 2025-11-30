/**
 * LotoLink Mobile - Home Screen
 * Main landing page with lottery results and quick actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  useColorScheme,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

// Theme colors
const Colors = {
  light: {
    primary: '#0071e3',
    background: '#f5f5f7',
    card: '#ffffff',
    text: '#1d1d1f',
    textSecondary: '#86868b',
    border: '#e8e8ed',
    success: '#34c759',
  },
  dark: {
    primary: '#0077ED',
    background: '#000000',
    card: '#1c1c1e',
    text: '#f5f5f7',
    textSecondary: '#a1a1a6',
    border: '#38383a',
    success: '#30d158',
  },
};

// Sample lottery data
const LOTTERIES = [
  { id: 1, name: 'Nacional', time: '12:30 PM', numbers: ['23', '45', '67'], color: '#ff6b6b' },
  { id: 2, name: 'Leidsa', time: '8:55 PM', numbers: ['12', '34', '56'], color: '#4ecdc4' },
  { id: 3, name: 'Real', time: '12:55 PM', numbers: ['78', '90', '11'], color: '#45b7d1' },
  { id: 4, name: 'Loteka', time: '7:55 PM', numbers: ['22', '33', '44'], color: '#96ceb4' },
];

const QUICK_ACTIONS = [
  { id: 1, icon: '🎲', label: 'Jugar Ahora', screen: 'Play' },
  { id: 2, icon: '📍', label: 'Bancas', screen: 'Bancas' },
  { id: 3, icon: '📊', label: 'Resultados', screen: 'Results' },
  { id: 4, icon: '🏆', label: 'Premios', screen: 'Prizes' },
];

export default function HomeScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(1500);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Banner */}
      <View style={[styles.banner, { backgroundColor: colors.primary }]}>
        <Text style={styles.bannerTitle}>¡Bienvenido a LotoLink!</Text>
        <Text style={styles.bannerSubtitle}>Tu suerte empieza aquí</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance disponible</Text>
          <Text style={styles.balanceAmount}>RD$ {balance.toLocaleString()}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Acciones Rápidas
        </Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionCard, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate(action.screen)}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={[styles.actionLabel, { color: colors.text }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Live Results */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Resultados en Vivo
          </Text>
          <TouchableOpacity>
            <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        
        {LOTTERIES.map((lottery) => (
          <View
            key={lottery.id}
            style={[styles.lotteryCard, { backgroundColor: colors.card }]}
          >
            <View style={styles.lotteryHeader}>
              <View style={[styles.lotteryBadge, { backgroundColor: lottery.color }]}>
                <Text style={styles.lotteryName}>{lottery.name}</Text>
              </View>
              <Text style={[styles.lotteryTime, { color: colors.textSecondary }]}>
                {lottery.time}
              </Text>
            </View>
            <View style={styles.numbersContainer}>
              {lottery.numbers.map((num, idx) => (
                <View key={idx} style={[styles.numberBall, { backgroundColor: lottery.color }]}>
                  <Text style={styles.numberText}>{num}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* CTA Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Play')}
        >
          <Text style={styles.ctaIcon}>🎰</Text>
          <Text style={styles.ctaText}>¡Juega Ahora y Gana!</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    padding: 24,
    paddingTop: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
  },
  balanceContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 48) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  lotteryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lotteryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lotteryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lotteryName: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  lotteryTime: {
    fontSize: 14,
  },
  numbersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  numberBall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  ctaIcon: {
    fontSize: 28,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
