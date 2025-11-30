/**
 * LotoLink Mobile - Loterias Screen
 * Shows all available lotteries with schedules and results
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';

// Theme colors
const Colors = {
  light: {
    primary: '#0071e3',
    background: '#f5f5f7',
    card: '#ffffff',
    text: '#1d1d1f',
    textSecondary: '#86868b',
    border: '#e8e8ed',
  },
  dark: {
    primary: '#0077ED',
    background: '#000000',
    card: '#1c1c1e',
    text: '#f5f5f7',
    textSecondary: '#a1a1a6',
    border: '#38383a',
  },
};

// Lottery data
const LOTTERIES = [
  {
    id: 1,
    name: 'Lotería Nacional',
    logo: '🎰',
    schedule: [
      { day: 'Lunes - Sábado', times: ['12:30 PM', '6:00 PM'] },
      { day: 'Domingo', times: ['3:00 PM'] },
    ],
    color: '#e74c3c',
    modalities: ['Quiniela', 'Pale', 'Tripleta', 'Super Pale'],
  },
  {
    id: 2,
    name: 'Leidsa',
    logo: '🍀',
    schedule: [
      { day: 'Todos los días', times: ['8:55 PM'] },
    ],
    color: '#27ae60',
    modalities: ['Quiniela', 'Pale', 'Loto Pool', 'Pega 3 Más'],
  },
  {
    id: 3,
    name: 'Real',
    logo: '👑',
    schedule: [
      { day: 'Lunes - Sábado', times: ['12:55 PM', '7:30 PM'] },
    ],
    color: '#f39c12',
    modalities: ['Quiniela', 'Pale', 'Tripleta'],
  },
  {
    id: 4,
    name: 'Loteka',
    logo: '💎',
    schedule: [
      { day: 'Todos los días', times: ['7:55 PM'] },
    ],
    color: '#9b59b6',
    modalities: ['Quiniela', 'Pale', 'Mega Chances'],
  },
  {
    id: 5,
    name: 'Primera',
    logo: '🥇',
    schedule: [
      { day: 'Lunes - Sábado', times: ['12:00 PM', '8:00 PM'] },
    ],
    color: '#3498db',
    modalities: ['Quiniela', 'Pale', 'Tripleta'],
  },
  {
    id: 6,
    name: 'La Suerte',
    logo: '🌟',
    schedule: [
      { day: 'Lunes - Sábado', times: ['12:30 PM', '7:30 PM'] },
    ],
    color: '#1abc9c',
    modalities: ['Quiniela', 'Pale'],
  },
];

export default function LoteriasScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [selectedLottery, setSelectedLottery] = useState(null);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Loterías Disponibles</Text>
        <Text style={styles.headerSubtitle}>
          {LOTTERIES.length} loterías • Horarios actualizados
        </Text>
      </View>

      {/* Lottery List */}
      <View style={styles.listContainer}>
        {LOTTERIES.map((lottery) => (
          <TouchableOpacity
            key={lottery.id}
            style={[styles.lotteryCard, { backgroundColor: colors.card }]}
            onPress={() => setSelectedLottery(
              selectedLottery?.id === lottery.id ? null : lottery
            )}
          >
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={[styles.logoContainer, { backgroundColor: lottery.color }]}>
                <Text style={styles.logo}>{lottery.logo}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.lotteryName, { color: colors.text }]}>
                  {lottery.name}
                </Text>
                <View style={styles.modalitiesRow}>
                  {lottery.modalities.slice(0, 3).map((mod, idx) => (
                    <View key={idx} style={[styles.modalityTag, { backgroundColor: lottery.color + '20' }]}>
                      <Text style={[styles.modalityText, { color: lottery.color }]}>
                        {mod}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={styles.expandIcon}>
                {selectedLottery?.id === lottery.id ? '▲' : '▼'}
              </Text>
            </View>

            {/* Expanded Details */}
            {selectedLottery?.id === lottery.id && (
              <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                <Text style={[styles.scheduleTitle, { color: colors.text }]}>
                  📅 Horarios de Sorteo
                </Text>
                {lottery.schedule.map((sched, idx) => (
                  <View key={idx} style={styles.scheduleRow}>
                    <Text style={[styles.scheduleDay, { color: colors.textSecondary }]}>
                      {sched.day}
                    </Text>
                    <View style={styles.timesContainer}>
                      {sched.times.map((time, tIdx) => (
                        <View key={tIdx} style={[styles.timeTag, { backgroundColor: lottery.color }]}>
                          <Text style={styles.timeText}>{time}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}

                <Text style={[styles.modalitiesTitle, { color: colors.text }]}>
                  🎲 Modalidades
                </Text>
                <View style={styles.allModalities}>
                  {lottery.modalities.map((mod, idx) => (
                    <View key={idx} style={[styles.modalityTagLarge, { backgroundColor: lottery.color + '20' }]}>
                      <Text style={[styles.modalityTextLarge, { color: lottery.color }]}>
                        {mod}
                      </Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.playButton, { backgroundColor: lottery.color }]}
                  onPress={() => navigation.navigate('Play', { lottery })}
                >
                  <Text style={styles.playButtonText}>Jugar {lottery.name} 🎰</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  listContainer: {
    padding: 16,
  },
  lotteryCard: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logo: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
  },
  lotteryName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalityTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 6,
  },
  modalityText: {
    fontSize: 11,
    fontWeight: '500',
  },
  expandIcon: {
    fontSize: 12,
    color: '#86868b',
  },
  expandedContent: {
    padding: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleDay: {
    fontSize: 14,
    flex: 1,
  },
  timesContainer: {
    flexDirection: 'row',
  },
  timeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 6,
  },
  timeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalitiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  allModalities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalityTagLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  modalityTextLarge: {
    fontSize: 13,
    fontWeight: '500',
  },
  playButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
