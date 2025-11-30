/**
 * LotoLink Mobile - Profile Screen
 * User profile, balance, history, and settings
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Image,
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

// Sample user data
const USER = {
  name: 'Juan Pérez',
  email: 'juan.perez@email.com',
  phone: '+1 809-555-1234',
  memberSince: 'Enero 2024',
  avatar: null,
};

// Sample ticket history
const TICKET_HISTORY = [
  { id: 1, lottery: 'Nacional', numbers: ['23', '45'], amount: 50, status: 'won', prize: 500, date: '2024-01-15' },
  { id: 2, lottery: 'Leidsa', numbers: ['12', '34', '56'], amount: 100, status: 'lost', prize: 0, date: '2024-01-14' },
  { id: 3, lottery: 'Real', numbers: ['78', '90'], amount: 25, status: 'pending', prize: 0, date: '2024-01-16' },
  { id: 4, lottery: 'Loteka', numbers: ['11', '22', '33'], amount: 75, status: 'won', prize: 1500, date: '2024-01-13' },
];

// Menu options
const MENU_OPTIONS = [
  { id: 1, icon: '💳', label: 'Métodos de Pago', screen: 'PaymentMethods' },
  { id: 2, icon: '🔔', label: 'Notificaciones', screen: 'Notifications' },
  { id: 3, icon: '🔒', label: 'Seguridad', screen: 'Security' },
  { id: 4, icon: '❓', label: 'Ayuda', screen: 'Help' },
  { id: 5, icon: '📜', label: 'Términos y Condiciones', screen: 'Terms' },
  { id: 6, icon: '🚪', label: 'Cerrar Sesión', action: 'logout' },
];

export default function ProfileScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'history' | 'wallet'
  const [balance] = useState(2500);
  const [wins] = useState(5);

  const getStatusColor = (status) => {
    switch (status) {
      case 'won': return colors.success;
      case 'lost': return colors.danger;
      case 'pending': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'won': return 'Ganado';
      case 'lost': return 'Perdido';
      case 'pending': return 'Pendiente';
      default: return status;
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Profile Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {USER.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
        </View>
        <Text style={styles.userName}>{USER.name}</Text>
        <Text style={styles.userEmail}>{USER.email}</Text>
        <Text style={styles.memberSince}>Miembro desde {USER.memberSince}</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={styles.statIcon}>💰</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            RD$ {balance.toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Balance
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={styles.statIcon}>🏆</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{wins}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Victorias
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={styles.statIcon}>🎫</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {TICKET_HISTORY.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Tickets
          </Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
        {['overview', 'history', 'wallet'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab ? '#fff' : colors.text },
            ]}>
              {tab === 'overview' ? '📋 General' : 
               tab === 'history' ? '📜 Historial' : '💳 Cartera'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Opciones
          </Text>
          {MENU_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.menuItem, { backgroundColor: colors.card }]}
              onPress={() => {
                if (option.action === 'logout') {
                  // Handle logout
                } else {
                  navigation.navigate(option.screen);
                }
              }}
            >
              <Text style={styles.menuIcon}>{option.icon}</Text>
              <Text style={[styles.menuLabel, { color: colors.text }]}>
                {option.label}
              </Text>
              <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>
                ›
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeTab === 'history' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Historial de Tickets
          </Text>
          {TICKET_HISTORY.map((ticket) => (
            <View
              key={ticket.id}
              style={[styles.ticketCard, { backgroundColor: colors.card }]}
            >
              <View style={styles.ticketHeader}>
                <Text style={[styles.ticketLottery, { color: colors.text }]}>
                  {ticket.lottery}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) }]}>
                  <Text style={styles.statusText}>
                    {getStatusLabel(ticket.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.ticketNumbers}>
                {ticket.numbers.map((num, idx) => (
                  <View key={idx} style={[styles.numberBall, { backgroundColor: colors.primary }]}>
                    <Text style={styles.numberText}>{num}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.ticketFooter}>
                <Text style={[styles.ticketDate, { color: colors.textSecondary }]}>
                  {ticket.date}
                </Text>
                <Text style={[styles.ticketAmount, { color: colors.text }]}>
                  {ticket.status === 'won' ? `+RD$ ${ticket.prize}` : `RD$ ${ticket.amount}`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {activeTab === 'wallet' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Cartera Digital
          </Text>
          <View style={[styles.walletCard, { backgroundColor: colors.card }]}>
            <Text style={styles.walletIcon}>💳</Text>
            <Text style={[styles.walletBalance, { color: colors.text }]}>
              RD$ {balance.toLocaleString()}
            </Text>
            <Text style={[styles.walletLabel, { color: colors.textSecondary }]}>
              Balance disponible
            </Text>
            <View style={styles.walletActions}>
              <TouchableOpacity style={[styles.walletButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.walletButtonText}>➕ Recargar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.walletButton, { backgroundColor: colors.success }]}>
                <Text style={styles.walletButtonText}>💸 Retirar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
    paddingTop: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    marginTop: -20,
  },
  statCard: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    margin: 16,
    padding: 4,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
  },
  menuArrow: {
    fontSize: 24,
  },
  ticketCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketLottery: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  ticketNumbers: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  numberBall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  numberText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ticketDate: {
    fontSize: 12,
  },
  ticketAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  walletCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  walletIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  walletBalance: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  walletLabel: {
    fontSize: 14,
    marginBottom: 20,
  },
  walletActions: {
    flexDirection: 'row',
    width: '100%',
  },
  walletButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  walletButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
