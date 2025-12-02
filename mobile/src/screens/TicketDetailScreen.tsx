/**
 * LotoLink Mobile - Ticket Detail Screen
 * Display detailed information about a specific ticket/play
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Share,
  Alert,
} from 'react-native';
import { Colors, LOTTERIES } from '../data/mockData';

interface TicketDetailProps {
  route: {
    params: {
      ticket: {
        id: string;
        lotteryId: string;
        lotteryName: string;
        modality: string;
        numbers: string[];
        amount: number;
        status: 'won' | 'lost' | 'pending';
        prize: number;
        date: string;
        time: string;
        banca: string;
        ticketCode: string;
      };
    };
  };
  navigation: any;
}

export default function TicketDetailScreen({ route, navigation }: TicketDetailProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { ticket } = route.params;

  const lottery = LOTTERIES.find(l => l.id === ticket.lotteryId);
  const lotteryColor = lottery?.color || colors.primary;

  const getStatusColor = () => {
    switch (ticket.status) {
      case 'won': return colors.success;
      case 'lost': return colors.danger;
      case 'pending': return colors.warning;
      default: return colors.textSecondary;
    }
  };

  const getStatusLabel = () => {
    switch (ticket.status) {
      case 'won': return '🏆 Ganador';
      case 'lost': return '❌ No Ganador';
      case 'pending': return '⏳ Pendiente';
      default: return ticket.status;
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎰 Mi ticket de LotoLink\n\nLotería: ${ticket.lotteryName}\nModalidad: ${ticket.modality}\nNúmeros: ${ticket.numbers.join(', ')}\nApuesta: RD$ ${ticket.amount}\nCódigo: ${ticket.ticketCode}\n\n¡Juega tú también en LotoLink!`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleClaimPrize = () => {
    Alert.alert(
      '🏆 Reclamar Premio',
      `Tu premio de RD$ ${ticket.prize.toLocaleString()} será acreditado a tu balance en las próximas horas.`,
      [
        { text: 'Entendido', style: 'default' },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Ticket Header */}
      <View style={[styles.ticketHeader, { backgroundColor: lotteryColor }]}>
        <View style={styles.headerContent}>
          <Text style={styles.lotteryLogo}>{lottery?.logo || '🎰'}</Text>
          <View>
            <Text style={styles.lotteryName}>{ticket.lotteryName}</Text>
            <Text style={styles.modality}>{ticket.modality}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusLabel()}</Text>
        </View>
      </View>

      {/* Ticket Code */}
      <View style={[styles.codeContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>
          Código del Ticket
        </Text>
        <Text style={[styles.codeValue, { color: colors.text }]}>
          {ticket.ticketCode}
        </Text>
      </View>

      {/* Numbers */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          🎱 Números Jugados
        </Text>
        <View style={styles.numbersContainer}>
          {ticket.numbers.map((num, idx) => (
            <View
              key={idx}
              style={[styles.numberBall, { backgroundColor: lotteryColor }]}
            >
              <Text style={styles.numberText}>{num}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Details */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          📋 Detalles de la Jugada
        </Text>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Banca
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {ticket.banca}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Fecha
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {ticket.date}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Hora
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {ticket.time}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            Apuesta
          </Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            RD$ {ticket.amount.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Prize Section (if won) */}
      {ticket.status === 'won' && (
        <View style={[styles.prizeSection, { backgroundColor: colors.success + '20' }]}>
          <Text style={styles.prizeIcon}>🏆</Text>
          <Text style={[styles.prizeTitle, { color: colors.success }]}>
            ¡Felicidades!
          </Text>
          <Text style={[styles.prizeAmount, { color: colors.success }]}>
            RD$ {ticket.prize.toLocaleString()}
          </Text>
          <Text style={[styles.prizeLabel, { color: colors.textSecondary }]}>
            Premio ganado
          </Text>
          <TouchableOpacity
            style={[styles.claimButton, { backgroundColor: colors.success }]}
            onPress={handleClaimPrize}
          >
            <Text style={styles.claimButtonText}>Reclamar Premio</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pending Section */}
      {ticket.status === 'pending' && (
        <View style={[styles.pendingSection, { backgroundColor: colors.warning + '20' }]}>
          <Text style={styles.pendingIcon}>⏳</Text>
          <Text style={[styles.pendingTitle, { color: colors.warning }]}>
            Sorteo Pendiente
          </Text>
          <Text style={[styles.pendingSubtitle, { color: colors.textSecondary }]}>
            Los resultados se publicarán después del sorteo
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card }]}
          onPress={handleShare}
        >
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={[styles.actionLabel, { color: colors.text }]}>
            Compartir
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Play', { lottery })}
        >
          <Text style={styles.actionIcon}>🎲</Text>
          <Text style={[styles.actionLabel, { color: '#fff' }]}>
            Jugar de Nuevo
          </Text>
        </TouchableOpacity>
      </View>

      {/* QR Code Placeholder */}
      <View style={[styles.qrSection, { backgroundColor: colors.card }]}>
        <Text style={[styles.qrTitle, { color: colors.text }]}>
          Código QR
        </Text>
        <View style={styles.qrPlaceholder}>
          <Text style={styles.qrIcon}>📱</Text>
          <Text style={[styles.qrText, { color: colors.textSecondary }]}>
            Escanea en la banca para verificar
          </Text>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ticketHeader: {
    padding: 24,
    paddingTop: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  lotteryLogo: {
    fontSize: 48,
    marginRight: 16,
  },
  lotteryName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modality: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  codeContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  section: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  numbersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  prizeSection: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  prizeIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  prizeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  prizeAmount: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  prizeLabel: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  claimButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  claimButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  pendingSection: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  pendingIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  pendingSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    margin: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  qrSection: {
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  qrPlaceholder: {
    width: 150,
    height: 150,
    borderWidth: 2,
    borderColor: '#e8e8ed',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  qrText: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
