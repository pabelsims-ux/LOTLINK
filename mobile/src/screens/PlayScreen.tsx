/**
 * LotoLink Mobile - Play Screen
 * Main gameplay screen for selecting numbers and placing bets
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  TextInput,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { Colors, LOTTERIES, MODALITIES, STAKE_OPTIONS, BANCAS } from '../data/mockData';
import { placeBet } from '../services/api';

const { width } = Dimensions.get('window');

export default function PlayScreen({ navigation, route }: any) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // State
  const [step, setStep] = useState(1); // 1: banca, 2: lottery, 3: modality, 4: numbers, 5: confirm
  const [selectedBanca, setSelectedBanca] = useState(route?.params?.banca || null);
  const [selectedLottery, setSelectedLottery] = useState(route?.params?.lottery || null);
  const [selectedModality, setSelectedModality] = useState<typeof MODALITIES[0] | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [stake, setStake] = useState(25);
  const [showNumberGrid, setShowNumberGrid] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Calculate potential prize
  const potentialPrize = selectedModality ? stake * (selectedModality.payouts.first || 60) : 0;

  // Add number
  const addNumber = useCallback((num: string) => {
    if (selectedNumbers.length < (selectedModality?.numbers || 2)) {
      if (!selectedNumbers.includes(num)) {
        setSelectedNumbers([...selectedNumbers, num]);
      }
    }
  }, [selectedNumbers, selectedModality]);

  // Remove number
  const removeNumber = useCallback((num: string) => {
    setSelectedNumbers(selectedNumbers.filter(n => n !== num));
  }, [selectedNumbers]);

  // Generate random numbers
  const generateRandom = useCallback(() => {
    const needed = selectedModality?.numbers || 2;
    const maxNumber = selectedModality?.numberRange?.[1] || 99;
    const newNumbers: string[] = [];
    while (newNumbers.length < needed) {
      const rand = Math.floor(Math.random() * (maxNumber + 1)).toString().padStart(2, '0');
      if (!newNumbers.includes(rand)) {
        newNumbers.push(rand);
      }
    }
    setSelectedNumbers(newNumbers);
  }, [selectedModality]);

  // Confirm play
  const confirmPlay = async () => {
    if (!selectedBanca || !selectedLottery || !selectedModality) return;
    
    setProcessing(true);
    try {
      const response = await placeBet({
        lotteryId: selectedLottery.id,
        modalityId: selectedModality.id,
        numbers: selectedNumbers,
        stake,
        bancaId: selectedBanca.id,
      });
      
      if (response.success) {
        Alert.alert(
          '🎰 ¡Jugada Confirmada!',
          `Lotería: ${selectedLottery.name}\nModalidad: ${selectedModality.name}\nNúmeros: ${selectedNumbers.join(', ')}\nApuesta: RD$ ${stake}\nPremio Potencial: RD$ ${potentialPrize.toLocaleString()}`,
          [
            { text: 'Ver Ticket', onPress: () => navigation.navigate('Profile', { tab: 'history' }) },
            { text: 'Jugar Más', onPress: () => resetPlay() },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar la jugada');
    } finally {
      setProcessing(false);
    }
  };

  // Reset play
  const resetPlay = () => {
    setStep(1);
    setSelectedBanca(null);
    setSelectedLottery(null);
    setSelectedModality(null);
    setSelectedNumbers([]);
    setStake(25);
  };

  // Number grid (00-99)
  const renderNumberGrid = () => {
    const maxNumber = selectedModality?.numberRange?.[1] || 99;
    const isDigitOnly = maxNumber === 9;
    const numbers = [];
    
    for (let i = 0; i <= maxNumber; i++) {
      const num = isDigitOnly ? String(i) : i.toString().padStart(2, '0');
      const isSelected = selectedNumbers.includes(num);
      
      numbers.push(
        <TouchableOpacity
          key={num}
          style={[
            styles.gridNumber,
            { 
              backgroundColor: isSelected 
                ? (selectedLottery?.color || colors.primary) 
                : colors.card,
              borderColor: isSelected 
                ? (selectedLottery?.color || colors.primary)
                : colors.border,
            },
          ]}
          onPress={() => isSelected ? removeNumber(num) : addNumber(num)}
        >
          <Text style={[
            styles.gridNumberText,
            { color: isSelected ? '#fff' : colors.text },
          ]}>
            {num}
          </Text>
        </TouchableOpacity>
      );
    }
    
    return (
      <View style={styles.numberGridContainer}>
        <View style={styles.gridHeader}>
          <Text style={[styles.gridTitle, { color: colors.text }]}>
            Selecciona {selectedModality?.numbers || 2} números
          </Text>
          <TouchableOpacity
            style={[styles.randomButton, { backgroundColor: colors.success }]}
            onPress={generateRandom}
          >
            <Text style={styles.randomButtonText}>🎲 Al Azar</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.numberGrid}>
          {numbers}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4, 5].map((s) => (
          <View key={s} style={styles.progressItem}>
            <View style={[
              styles.progressDot,
              { backgroundColor: step >= s ? colors.primary : colors.border },
            ]}>
              <Text style={[styles.progressNumber, { color: step >= s ? '#fff' : colors.textSecondary }]}>
                {s}
              </Text>
            </View>
            <Text style={[styles.progressLabel, { color: step >= s ? colors.text : colors.textSecondary }]}>
              {s === 1 ? 'Banca' : s === 2 ? 'Lotería' : s === 3 ? 'Modalidad' : s === 4 ? 'Números' : 'Confirmar'}
            </Text>
          </View>
        ))}
      </View>

      {/* Step 1: Select Banca */}
      {step === 1 && (
        <View style={styles.section}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            🏪 Selecciona una Banca
          </Text>
          <ScrollView style={styles.bancaList}>
            {BANCAS.filter(b => b.isOpen).map((banca) => (
              <TouchableOpacity
                key={banca.id}
                style={[
                  styles.bancaCard,
                  { backgroundColor: colors.card },
                  selectedBanca?.id === banca.id && { borderColor: colors.primary, borderWidth: 2 },
                ]}
                onPress={() => {
                  setSelectedBanca(banca);
                  setStep(2);
                }}
              >
                <View style={styles.bancaInfo}>
                  <Text style={[styles.bancaName, { color: colors.text }]}>{banca.name}</Text>
                  <Text style={[styles.bancaAddress, { color: colors.textSecondary }]}>
                    {banca.address}
                  </Text>
                  <View style={styles.bancaMeta}>
                    <Text style={[styles.bancaDistance, { color: colors.textSecondary }]}>
                      📍 {banca.distance}
                    </Text>
                    <Text style={[styles.bancaRating, { color: colors.warning }]}>
                      ⭐ {banca.rating}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Step 2: Select Lottery */}
      {step === 2 && (
        <View style={styles.section}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            🎰 Selecciona una Lotería
          </Text>
          <View style={styles.optionsGrid}>
            {LOTTERIES.filter(l => l.isOpen).map((lottery) => (
              <TouchableOpacity
                key={lottery.id}
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.card },
                  selectedLottery?.id === lottery.id && { borderColor: lottery.color, borderWidth: 3 },
                ]}
                onPress={() => {
                  setSelectedLottery(lottery);
                  setStep(3);
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: lottery.color }]}>
                  <Text style={styles.optionEmoji}>{lottery.logo}</Text>
                </View>
                <Text style={[styles.optionName, { color: colors.text }]}>
                  {lottery.name}
                </Text>
                <Text style={[styles.optionTime, { color: colors.textSecondary }]}>
                  {lottery.nextDraw}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Step 3: Select Modality */}
      {step === 3 && (
        <View style={styles.section}>
          <TouchableOpacity onPress={() => setStep(2)} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Cambiar Lotería</Text>
          </TouchableOpacity>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            🎲 Selecciona Modalidad
          </Text>
          {MODALITIES.map((modality) => (
            <TouchableOpacity
              key={modality.id}
              style={[
                styles.modalityCard,
                { backgroundColor: colors.card },
                selectedModality?.id === modality.id && { borderColor: colors.primary, borderWidth: 2 },
              ]}
              onPress={() => {
                setSelectedModality(modality);
                setSelectedNumbers([]);
                setStep(4);
              }}
            >
              <View style={styles.modalityHeader}>
                <Text style={styles.modalityIcon}>{modality.icon}</Text>
                <View style={styles.modalityInfo}>
                  <Text style={[styles.modalityName, { color: colors.text }]}>
                    {modality.name}
                  </Text>
                  <Text style={[styles.modalityDesc, { color: colors.textSecondary }]}>
                    {modality.description}
                  </Text>
                </View>
              </View>
              <View style={styles.modalityPrizes}>
                {modality.prizes?.slice(0, 2).map((prize, idx) => (
                  <View key={idx} style={styles.prizeTag}>
                    <Text style={[styles.prizeText, { color: colors.success }]}>
                      {prize.multiplier}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Step 4: Select Numbers */}
      {step === 4 && (
        <View style={styles.section}>
          <TouchableOpacity onPress={() => setStep(3)} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Cambiar Modalidad</Text>
          </TouchableOpacity>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            🔢 Selecciona {selectedModality?.numbers} Números
          </Text>

          {/* Selected Numbers Display */}
          <View style={styles.selectedNumbersContainer}>
            {Array(selectedModality?.numbers || 2).fill(null).map((_, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.selectedNumberSlot,
                  { backgroundColor: selectedNumbers[idx] ? (selectedLottery?.color || colors.primary) : colors.border },
                ]}
                onPress={() => selectedNumbers[idx] && removeNumber(selectedNumbers[idx])}
              >
                <Text style={styles.selectedNumberText}>
                  {selectedNumbers[idx] || '?'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Full Number Grid */}
          {renderNumberGrid()}

          {selectedNumbers.length === selectedModality?.numbers && (
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: colors.primary }]}
              onPress={() => setStep(5)}
            >
              <Text style={styles.continueButtonText}>Continuar →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Step 5: Confirm */}
      {step === 5 && (
        <View style={styles.section}>
          <TouchableOpacity onPress={() => setStep(4)} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Cambiar Números</Text>
          </TouchableOpacity>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            ✅ Confirma tu Jugada
          </Text>

          {/* Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Banca</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                🏪 {selectedBanca?.name}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Lotería</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {selectedLottery?.logo} {selectedLottery?.name}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Modalidad</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedModality?.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Números</Text>
              <View style={styles.summaryNumbers}>
                {selectedNumbers.map((num, idx) => (
                  <View key={idx} style={[styles.summaryBall, { backgroundColor: selectedLottery?.color || colors.primary }]}>
                    <Text style={styles.summaryBallText}>{num}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Stake Selection */}
          <Text style={[styles.stakeTitle, { color: colors.text }]}>💰 Monto de Apuesta</Text>
          <View style={styles.stakeGrid}>
            {STAKE_OPTIONS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.stakeOption,
                  { backgroundColor: stake === amount ? colors.primary : colors.card },
                ]}
                onPress={() => setStake(amount)}
              >
                <Text style={[styles.stakeText, { color: stake === amount ? '#fff' : colors.text }]}>
                  RD$ {amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Prize Preview */}
          <View style={[styles.prizePreview, { backgroundColor: colors.success + '20' }]}>
            <Text style={[styles.prizeLabel, { color: colors.success }]}>Premio Potencial</Text>
            <Text style={[styles.prizeAmount, { color: colors.success }]}>
              RD$ {potentialPrize.toLocaleString()}
            </Text>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[styles.confirmButton, { backgroundColor: colors.primary }]}
            onPress={confirmPlay}
            disabled={processing}
          >
            <Text style={styles.confirmButtonText}>
              {processing ? '⏳ Procesando...' : '🎰 Confirmar Jugada'}
            </Text>
          </TouchableOpacity>
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
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    paddingBottom: 10,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressLabel: {
    fontSize: 11,
  },
  section: {
    padding: 16,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    width: (width - 48) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionEmoji: {
    fontSize: 32,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalityCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modalityInfo: {
    flex: 1,
  },
  modalityName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalityDesc: {
    fontSize: 14,
  },
  modalityMultiplier: {
    justifyContent: 'center',
  },
  multiplierText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  selectedNumbersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  selectedNumberSlot: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  selectedNumberText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  customInputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  customInput: {
    flex: 1,
    fontSize: 18,
    paddingHorizontal: 12,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  randomButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  quickNumbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  quickNumber: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
  },
  quickNumberText: {
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryNumbers: {
    flexDirection: 'row',
  },
  summaryBall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  summaryBallText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stakeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  stakeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  stakeOption: {
    width: (width - 48) / 3 - 4,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  stakeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  prizePreview: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  prizeLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  prizeAmount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  confirmButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 100,
  },
  // Banca styles
  bancaList: {
    maxHeight: 400,
  },
  bancaCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bancaInfo: {
    flex: 1,
  },
  bancaName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  bancaAddress: {
    fontSize: 14,
    marginBottom: 8,
  },
  bancaMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  bancaDistance: {
    fontSize: 12,
  },
  bancaRating: {
    fontSize: 12,
  },
  optionTime: {
    fontSize: 12,
    marginTop: 4,
  },
  // Modality styles
  modalityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalityIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  modalityPrizes: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  prizeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  prizeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Number grid styles
  numberGridContainer: {
    marginTop: 8,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  randomButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  randomButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  gridNumber: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  gridNumberText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
