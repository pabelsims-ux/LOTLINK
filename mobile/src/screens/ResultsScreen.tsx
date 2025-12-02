/**
 * LotoLink Mobile - Results Screen
 * Display live and historical lottery results
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Colors, LOTTERIES } from '../data/mockData';
import { getLotteryResults, getLiveResults, LotteryResult } from '../services/api';

export default function ResultsScreen({ navigation }: any) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [selectedLottery, setSelectedLottery] = useState<string | null>(null);
  const [results, setResults] = useState<LotteryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const response = activeTab === 'live'
        ? await getLiveResults()
        : await getLotteryResults(selectedLottery || undefined);
      
      if (response.success) {
        setResults(response.data);
      }
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedLottery]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadResults();
    setRefreshing(false);
  };

  const renderLotteryFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      <TouchableOpacity
        style={[
          styles.filterButton,
          { backgroundColor: !selectedLottery ? colors.primary : colors.card },
        ]}
        onPress={() => setSelectedLottery(null)}
      >
        <Text style={[
          styles.filterText,
          { color: !selectedLottery ? '#fff' : colors.text },
        ]}>
          Todas
        </Text>
      </TouchableOpacity>
      {LOTTERIES.map((lottery) => (
        <TouchableOpacity
          key={lottery.id}
          style={[
            styles.filterButton,
            { 
              backgroundColor: selectedLottery === lottery.id 
                ? lottery.color 
                : colors.card,
            },
          ]}
          onPress={() => setSelectedLottery(lottery.id)}
        >
          <Text style={[
            styles.filterText,
            { color: selectedLottery === lottery.id ? '#fff' : colors.text },
          ]}>
            {lottery.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderResultCard = (result: LotteryResult) => (
    <View
      key={result.id}
      style={[styles.resultCard, { backgroundColor: colors.card }]}
    >
      <View style={styles.resultHeader}>
        <View style={styles.resultInfo}>
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
        <View style={styles.resultMeta}>
          <Text style={[styles.resultTime, { color: colors.textSecondary }]}>
            {result.time}
          </Text>
          <Text style={[styles.resultDate, { color: colors.textSecondary }]}>
            {result.date}
          </Text>
        </View>
      </View>
      
      <View style={styles.numbersContainer}>
        {result.numbers.map((num, idx) => (
          <View
            key={idx}
            style={[styles.numberBall, { backgroundColor: result.color }]}
          >
            <Text style={styles.numberText}>{num}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.prizeInfo}>
        <View style={styles.prizeRow}>
          <Text style={[styles.prizeLabel, { color: colors.textSecondary }]}>
            1er Premio
          </Text>
          <Text style={[styles.prizeValue, { color: colors.text }]}>
            {result.numbers[0]}
          </Text>
        </View>
        {result.numbers.length > 1 && (
          <View style={styles.prizeRow}>
            <Text style={[styles.prizeLabel, { color: colors.textSecondary }]}>
              2do Premio
            </Text>
            <Text style={[styles.prizeValue, { color: colors.text }]}>
              {result.numbers[1]}
            </Text>
          </View>
        )}
        {result.numbers.length > 2 && (
          <View style={styles.prizeRow}>
            <Text style={[styles.prizeLabel, { color: colors.textSecondary }]}>
              3er Premio
            </Text>
            <Text style={[styles.prizeValue, { color: colors.text }]}>
              {result.numbers[2]}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>📊 Resultados</Text>
        <Text style={styles.headerSubtitle}>
          {activeTab === 'live' ? 'Resultados en vivo' : 'Historial de sorteos'}
        </Text>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'live' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveTab('live')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'live' ? '#fff' : colors.text },
          ]}>
            🔴 En Vivo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'history' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'history' ? '#fff' : colors.text },
          ]}>
            📜 Historial
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lottery Filter */}
      {activeTab === 'history' && renderLotteryFilter()}

      {/* Results List */}
      <ScrollView
        style={styles.resultsList}
        contentContainerStyle={styles.resultsContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Cargando resultados...
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No hay resultados
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {activeTab === 'live' 
                ? 'No hay sorteos en vivo en este momento'
                : 'Selecciona otra lotería o intenta más tarde'}
            </Text>
          </View>
        ) : (
          results.map(renderResultCard)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  tabContainer: {
    flexDirection: 'row',
    margin: 16,
    padding: 4,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  filterContent: {
    paddingRight: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsList: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  resultCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  resultInfo: {
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
    borderRadius: 12,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  liveText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  resultMeta: {
    alignItems: 'flex-end',
  },
  resultTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultDate: {
    fontSize: 12,
    marginTop: 2,
  },
  numbersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  numberBall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  numberText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  prizeInfo: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  prizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  prizeLabel: {
    fontSize: 14,
  },
  prizeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
