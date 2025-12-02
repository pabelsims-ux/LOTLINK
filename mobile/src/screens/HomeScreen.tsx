/**
 * LotoLink Mobile - Home Screen
 * Main landing page with lottery results, wallet, and quick actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useColorScheme,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Colors, DEMO_USER, LOTTERIES as LOTTERY_LIST, UPCOMING_DRAWS } from '../data/mockData';
import { getLiveResults, getLotteries, LotteryResult } from '../services/api';

const { width } = Dimensions.get('window');

const QUICK_ACTIONS = [
  { id: 1, icon: '🎲', label: 'Jugar Ahora', screen: 'Play' },
  { id: 2, icon: '📍', label: 'Bancas', screen: 'Bancas' },
  { id: 3, icon: '📊', label: 'Resultados', screen: 'Results' },
  { id: 4, icon: '💳', label: 'Cartera', screen: 'Wallet' },
];

export default function HomeScreen({ navigation }: any) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance] = useState(DEMO_USER.balance);
  const [liveResults, setLiveResults] = useState<LotteryResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const response = await getLiveResults();
      if (response.success) {
        setLiveResults(response.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

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
        <TouchableOpacity 
          style={styles.balanceContainer}
          onPress={() => navigation.navigate('Wallet')}
        >
          <Text style={styles.balanceLabel}>Balance disponible</Text>
          <Text style={styles.balanceAmount}>RD$ {balance.toLocaleString()}</Text>
          <Text style={styles.balanceTap}>Toca para recargar →</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Draws */}
      <View style={styles.upcomingSection}>
        <Text style={[styles.upcomingTitle, { color: colors.text }]}>
          ⏰ Próximos Sorteos
        </Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.upcomingScroll}
        >
          {UPCOMING_DRAWS.map((draw, idx) => {
            const lottery = LOTTERY_LIST.find(l => l.name === draw.lottery || l.name.includes(draw.lottery));
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.upcomingCard, { backgroundColor: lottery?.color || colors.primary }]}
                onPress={() => navigation.navigate('Play', { lottery })}
              >
                <Text style={styles.upcomingLottery}>{draw.lottery}</Text>
                <Text style={styles.upcomingTime}>{draw.time}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
            🔴 Resultados en Vivo
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Results')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : liveResults.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No hay resultados en vivo ahora
            </Text>
          </View>
        ) : (
          liveResults.slice(0, 4).map((result) => (
            <View
              key={result.id}
              style={[styles.lotteryCard, { backgroundColor: colors.card }]}
            >
              <View style={styles.lotteryHeader}>
                <View style={styles.lotteryInfo}>
                  <View style={[styles.lotteryBadge, { backgroundColor: result.color }]}>
                    <Text style={styles.lotteryName}>{result.lotteryName}</Text>
                  </View>
                  {result.isLive && (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveIndicator} />
                      <Text style={styles.liveText}>EN VIVO</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.lotteryTime, { color: colors.textSecondary }]}>
                  {result.time}
                </Text>
              </View>
              <View style={styles.numbersContainer}>
                {result.numbers.map((num, idx) => (
                  <View key={idx} style={[styles.numberBall, { backgroundColor: result.color }]}>
                    <Text style={styles.numberText}>{num}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
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
  balanceTap: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  upcomingSection: {
    marginTop: -10,
    paddingVertical: 16,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  upcomingScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  upcomingCard: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginRight: 10,
    alignItems: 'center',
  },
  upcomingLottery: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  upcomingTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
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
  lotteryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  liveText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
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
    height: 100,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyCard: {
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
  },
});
