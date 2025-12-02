/**
 * LotoLink Mobile - Profile Screen
 * User profile, balance, history, and settings
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { Colors, DEMO_USER, MENU_OPTIONS } from '../data/mockData';
import { getTicketHistory, logout, Ticket } from '../services/api';

export default function ProfileScreen({ navigation, route }: any) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [activeTab, setActiveTab] = useState(route?.params?.tab || 'overview');
  const [balance] = useState(DEMO_USER.balance);
  const [wins] = useState(DEMO_USER.wins);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(colorScheme === 'dark');

  const loadTickets = useCallback(async () => {
    try {
      const response = await getTicketHistory();
      if (response.success) {
        setTickets(response.data);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar Sesión', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            // Navigate to login screen
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }],
            });
          }
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return colors.success;
      case 'lost': return colors.danger;
      case 'pending': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'won': return 'Ganado';
      case 'lost': return 'Perdido';
      case 'pending': return 'Pendiente';
      default: return status;
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Profile Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {DEMO_USER.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          {DEMO_USER.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓</Text>
            </View>
          )}
        </View>
        <Text style={styles.userName}>{DEMO_USER.name}</Text>
        <Text style={styles.userEmail}>{DEMO_USER.email}</Text>
        <Text style={styles.memberSince}>Miembro desde {DEMO_USER.memberSince}</Text>
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
            {tickets.length}
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
          {/* Settings Section */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Configuración
          </Text>
          
          {/* Notifications Toggle */}
          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🔔</Text>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Notificaciones
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
          
          {/* Dark Mode Toggle */}
          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingIcon}>🌙</Text>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Modo Oscuro
              </Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Menu Options */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
            Opciones
          </Text>
          {MENU_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[styles.menuItem, { backgroundColor: colors.card }]}
              onPress={() => navigation.navigate(option.screen)}
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
          
          {/* Logout Button */}
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.danger + '20' }]}
            onPress={handleLogout}
          >
            <Text style={[styles.logoutText, { color: colors.danger }]}>
              🚪 Cerrar Sesión
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'history' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Historial de Tickets
          </Text>
          {tickets.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Text style={styles.emptyIcon}>🎫</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No hay tickets aún
              </Text>
            </View>
          ) : (
            tickets.map((ticket) => (
              <TouchableOpacity
                key={ticket.id}
                style={[styles.ticketCard, { backgroundColor: colors.card }]}
                onPress={() => navigation.navigate('TicketDetail', { ticket })}
              >
                <View style={styles.ticketHeader}>
                  <Text style={[styles.ticketLottery, { color: colors.text }]}>
                    {ticket.lotteryName}
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
                    {ticket.date} • {ticket.time}
                  </Text>
                  <Text style={[styles.ticketAmount, { color: ticket.status === 'won' ? colors.success : colors.text }]}>
                    {ticket.status === 'won' ? `+RD$ ${ticket.prize.toLocaleString()}` : `RD$ ${ticket.amount}`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
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
    height: 100,
  },
  // Settings styles
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  verifiedBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#34c759',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  verifiedText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
