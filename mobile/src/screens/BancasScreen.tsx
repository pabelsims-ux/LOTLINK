/**
 * LotoLink Mobile - Bancas Screen
 * Shows nearby lottery branches with map and list views
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Dimensions,
  FlatList,
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

// Sample bancas data
const BANCAS = [
  {
    id: 1,
    name: 'Banca La Fortuna',
    address: 'Av. 27 de Febrero #123, Santo Domingo',
    distance: '0.3 km',
    rating: 4.8,
    isOpen: true,
    lotteries: ['Nacional', 'Leidsa', 'Real'],
  },
  {
    id: 2,
    name: 'Banca El Millonario',
    address: 'C/ Duarte #456, Santiago',
    distance: '0.8 km',
    rating: 4.5,
    isOpen: true,
    lotteries: ['Nacional', 'Loteka'],
  },
  {
    id: 3,
    name: 'Banca Suerte Total',
    address: 'Av. Independencia #789, La Vega',
    distance: '1.2 km',
    rating: 4.7,
    isOpen: false,
    lotteries: ['Nacional', 'Leidsa', 'Real', 'Loteka'],
  },
  {
    id: 4,
    name: 'Banca Los Ganadores',
    address: 'C/ El Conde #321, Zona Colonial',
    distance: '1.5 km',
    rating: 4.9,
    isOpen: true,
    lotteries: ['Nacional', 'Leidsa'],
  },
];

export default function BancasScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [selectedBanca, setSelectedBanca] = useState(null);

  const renderBancaCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.bancaCard, { backgroundColor: colors.card }]}
      onPress={() => setSelectedBanca(item)}
    >
      <View style={styles.bancaHeader}>
        <View style={styles.bancaInfo}>
          <Text style={[styles.bancaName, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.bancaAddress, { color: colors.textSecondary }]}>
            {item.address}
          </Text>
        </View>
        <View style={styles.bancaMeta}>
          <View style={[styles.statusBadge, { 
            backgroundColor: item.isOpen ? colors.success : colors.textSecondary 
          }]}>
            <Text style={styles.statusText}>
              {item.isOpen ? 'Abierta' : 'Cerrada'}
            </Text>
          </View>
          <Text style={[styles.distance, { color: colors.textSecondary }]}>
            📍 {item.distance}
          </Text>
        </View>
      </View>
      
      <View style={styles.bancaFooter}>
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingIcon}>⭐</Text>
          <Text style={[styles.ratingText, { color: colors.text }]}>
            {item.rating}
          </Text>
        </View>
        <View style={styles.lotteriesContainer}>
          {item.lotteries.slice(0, 3).map((lottery, idx) => (
            <View key={idx} style={[styles.lotteryTag, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.lotteryTagText, { color: colors.primary }]}>
                {lottery}
              </Text>
            </View>
          ))}
          {item.lotteries.length > 3 && (
            <Text style={[styles.moreLotteries, { color: colors.textSecondary }]}>
              +{item.lotteries.length - 3}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.playButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('Play', { banca: item })}
      >
        <Text style={styles.playButtonText}>Jugar Aquí 🎲</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* View Mode Switcher */}
      <View style={[styles.switcherContainer, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.switcherButton,
            viewMode === 'list' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[
            styles.switcherText,
            { color: viewMode === 'list' ? '#fff' : colors.text },
          ]}>
            📋 Lista
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.switcherButton,
            viewMode === 'map' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setViewMode('map')}
        >
          <Text style={[
            styles.switcherText,
            { color: viewMode === 'map' ? '#fff' : colors.text },
          ]}>
            🗺️ Mapa
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'list' ? (
        <FlatList
          data={BANCAS}
          renderItem={renderBancaCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.mapContainer}>
          <View style={[styles.mapPlaceholder, { backgroundColor: colors.card }]}>
            <Text style={styles.mapIcon}>🗺️</Text>
            <Text style={[styles.mapText, { color: colors.text }]}>
              Mapa de Bancas
            </Text>
            <Text style={[styles.mapSubtext, { color: colors.textSecondary }]}>
              {BANCAS.length} bancas cerca de ti
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  switcherContainer: {
    flexDirection: 'row',
    margin: 16,
    padding: 4,
    borderRadius: 12,
  },
  switcherButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  switcherText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  bancaCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bancaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bancaInfo: {
    flex: 1,
    marginRight: 12,
  },
  bancaName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  bancaAddress: {
    fontSize: 14,
    lineHeight: 20,
  },
  bancaMeta: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  distance: {
    fontSize: 12,
  },
  bancaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  lotteriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  lotteryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 4,
  },
  lotteryTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  moreLotteries: {
    marginLeft: 8,
    fontSize: 12,
  },
  playButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
  },
  mapPlaceholder: {
    flex: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  mapText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  mapSubtext: {
    fontSize: 14,
  },
});
