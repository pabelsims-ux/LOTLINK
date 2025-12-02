/**
 * LotoLink Mobile - Wallet Screen
 * Manage balance, deposits, and withdrawals
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
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, DEMO_USER } from '../data/mockData';
import { getTransactions, depositFunds, withdrawFunds, Transaction } from '../services/api';

const DEPOSIT_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];
const PAYMENT_METHODS = [
  { id: 'card', name: 'Tarjeta de Crédito', icon: '💳' },
  { id: 'bank', name: 'Transferencia Bancaria', icon: '🏦' },
  { id: 'mobile', name: 'Pago Móvil', icon: '📱' },
];

export default function WalletScreen({ navigation }: any) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [balance, setBalance] = useState(DEMO_USER.balance);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [processing, setProcessing] = useState(false);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getTransactions();
      if (response.success) {
        setTransactions(response.data);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const handleDeposit = async () => {
    const amount = customAmount ? parseInt(customAmount, 10) : selectedAmount;
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Por favor ingresa un monto válido');
      return;
    }

    setProcessing(true);
    try {
      const response = await depositFunds(amount, PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name || '');
      if (response.success) {
        setBalance(prev => prev + amount);
        setShowDepositModal(false);
        setCustomAmount('');
        Alert.alert('¡Éxito!', `Se han agregado RD$ ${amount.toLocaleString()} a tu balance`);
        await loadTransactions();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar la recarga');
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = customAmount ? parseInt(customAmount, 10) : selectedAmount;
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Por favor ingresa un monto válido');
      return;
    }
    if (amount > balance) {
      Alert.alert('Error', 'Fondos insuficientes');
      return;
    }

    setProcessing(true);
    try {
      const response = await withdrawFunds(amount, PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name || '');
      if (response.success) {
        setBalance(prev => prev - amount);
        setShowWithdrawModal(false);
        setCustomAmount('');
        Alert.alert('¡Solicitud enviada!', `Tu retiro de RD$ ${amount.toLocaleString()} está siendo procesado`);
        await loadTransactions();
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar el retiro');
    } finally {
      setProcessing(false);
    }
  };

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit': return '➕';
      case 'withdrawal': return '➖';
      case 'play': return '🎲';
      case 'win': return '🏆';
      default: return '💰';
    }
  };

  const getTransactionColor = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit': return colors.success;
      case 'withdrawal': return colors.warning;
      case 'play': return colors.primary;
      case 'win': return colors.success;
      default: return colors.text;
    }
  };

  const renderTransactionModal = (isDeposit: boolean) => (
    <Modal
      visible={isDeposit ? showDepositModal : showWithdrawModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => isDeposit ? setShowDepositModal(false) : setShowWithdrawModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isDeposit ? '💳 Recargar Balance' : '💸 Retirar Fondos'}
            </Text>
            <TouchableOpacity 
              onPress={() => isDeposit ? setShowDepositModal(false) : setShowWithdrawModal(false)}
            >
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Amount Selection */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Selecciona un monto
          </Text>
          <View style={styles.amountsGrid}>
            {DEPOSIT_AMOUNTS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.amountButton,
                  { 
                    backgroundColor: selectedAmount === amount && !customAmount 
                      ? colors.primary 
                      : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setSelectedAmount(amount);
                  setCustomAmount('');
                }}
              >
                <Text style={[
                  styles.amountText,
                  { color: selectedAmount === amount && !customAmount ? '#fff' : colors.text },
                ]}>
                  RD$ {amount.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Amount */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            O ingresa un monto personalizado
          </Text>
          <View style={[styles.customInputContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.currencyPrefix, { color: colors.text }]}>RD$</Text>
            <TextInput
              style={[styles.customInput, { color: colors.text }]}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={customAmount}
              onChangeText={setCustomAmount}
            />
          </View>

          {/* Payment Method */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Método de pago
          </Text>
          <View style={styles.methodsContainer}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodButton,
                  { 
                    backgroundColor: selectedMethod === method.id 
                      ? colors.primary + '20' 
                      : colors.background,
                    borderColor: selectedMethod === method.id 
                      ? colors.primary 
                      : colors.border,
                  },
                ]}
                onPress={() => setSelectedMethod(method.id)}
              >
                <Text style={styles.methodIcon}>{method.icon}</Text>
                <Text style={[styles.methodName, { color: colors.text }]}>
                  {method.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              { backgroundColor: isDeposit ? colors.success : colors.warning },
            ]}
            onPress={isDeposit ? handleDeposit : handleWithdraw}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmButtonText}>
                {isDeposit ? '➕ Recargar' : '💸 Retirar'} RD$ {(customAmount && !isNaN(parseInt(customAmount, 10)) ? parseInt(customAmount, 10) : selectedAmount).toLocaleString()}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Balance Header */}
      <View style={[styles.balanceHeader, { backgroundColor: colors.primary }]}>
        <Text style={styles.balanceLabel}>Balance Disponible</Text>
        <Text style={styles.balanceAmount}>RD$ {balance.toLocaleString()}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => setShowDepositModal(true)}
          >
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionLabel}>Recargar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => setShowWithdrawModal(true)}
          >
            <Text style={styles.actionIcon}>💸</Text>
            <Text style={styles.actionLabel}>Retirar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={styles.statIcon}>📊</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {transactions.filter(t => t.type === 'deposit').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Recargas
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={styles.statIcon}>🎲</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {transactions.filter(t => t.type === 'play').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Jugadas
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={styles.statIcon}>🏆</Text>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {transactions.filter(t => t.type === 'win').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Premios
          </Text>
        </View>
      </View>

      {/* Transaction History */}
      <View style={styles.transactionsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Historial de Transacciones
        </Text>
        
        <ScrollView
          style={styles.transactionsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No hay transacciones aún
              </Text>
            </View>
          ) : (
            transactions.map((txn) => (
              <View
                key={txn.id}
                style={[styles.transactionCard, { backgroundColor: colors.card }]}
              >
                <View style={[
                  styles.transactionIconContainer,
                  { backgroundColor: getTransactionColor(txn.type) + '20' },
                ]}>
                  <Text style={styles.transactionIcon}>
                    {getTransactionIcon(txn.type)}
                  </Text>
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={[styles.transactionTitle, { color: colors.text }]}>
                    {txn.type === 'deposit' ? 'Recarga' :
                     txn.type === 'withdrawal' ? 'Retiro' :
                     txn.type === 'play' ? 'Jugada' : 'Premio'}
                  </Text>
                  <Text style={[styles.transactionDetails, { color: colors.textSecondary }]}>
                    {txn.method} • {txn.date} {txn.time}
                  </Text>
                  {txn.details && (
                    <Text style={[styles.transactionSubdetails, { color: colors.textSecondary }]}>
                      {txn.details}
                    </Text>
                  )}
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: txn.amount >= 0 ? colors.success : colors.danger },
                ]}>
                  {txn.amount >= 0 ? '+' : ''}RD$ {Math.abs(txn.amount).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Modals */}
      {renderTransactionModal(true)}
      {renderTransactionModal(false)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  balanceHeader: {
    padding: 24,
    paddingTop: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  transactionsSection: {
    flex: 1,
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  transactionsList: {
    flex: 1,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIcon: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  transactionSubdetails: {
    fontSize: 11,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    color: '#86868b',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  amountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  amountButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: '30%',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  customInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
  },
  methodsContainer: {
    gap: 8,
    marginBottom: 24,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  methodIcon: {
    fontSize: 24,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
