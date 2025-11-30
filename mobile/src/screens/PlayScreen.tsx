/**
 * LotoLink Mobile - Play Screen
 * Main gameplay screen for selecting numbers and placing bets
 */

import React, { useState } from 'react';
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

// Available lotteries
const LOTTERIES = [
  { id: 1, name: 'Nacional', color: '#e74c3c', icon: '🎰' },
  { id: 2, name: 'Leidsa', color: '#27ae60', icon: '🍀' },
  { id: 3, name: 'Real', color: '#f39c12', icon: '👑' },
  { id: 4, name: 'Loteka', color: '#9b59b6', icon: '💎' },
];

// Play modalities
const MODALITIES = [
  { id: 1, name: 'Quiniela', numbers: 2, description: 'Acierta 2 números', multiplier: 60 },
  { id: 2, name: 'Pale', numbers: 2, description: 'Acierta 2 números en orden', multiplier: 800 },
  { id: 3, name: 'Tripleta', numbers: 3, description: 'Acierta 3 números', multiplier: 5000 },
  { id: 4, name: 'Super Pale', numbers: 4, description: 'Acierta 4 números', multiplier: 25000 },
];

// Stake options
const STAKE_OPTIONS = [10, 25, 50, 100, 200, 500];

export default function PlayScreen({ navigation, route }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // State
  const [step, setStep] = useState(1); // 1: lottery, 2: modality, 3: numbers, 4: confirm
  const [selectedLottery, setSelectedLottery] = useState(route?.params?.lottery || null);
  const [selectedModality, setSelectedModality] = useState(null);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [stake, setStake] = useState(25);
  const [customNumber, setCustomNumber] = useState('');

  // Calculate potential prize
  const potentialPrize = selectedModality ? stake * selectedModality.multiplier : 0;

  // Add number
  const addNumber = (num) => {
    if (selectedNumbers.length < (selectedModality?.numbers || 2)) {
      if (!selectedNumbers.includes(num)) {
        setSelectedNumbers([...selectedNumbers, num]);
      }
    }
  };

  // Remove number
  const removeNumber = (num) => {
    setSelectedNumbers(selectedNumbers.filter(n => n !== num));
  };

  // Add custom number
  const handleAddCustomNumber = () => {
    const num = parseInt(customNumber, 10);
    if (!isNaN(num) && num >= 0 && num <= 99) {
      const formattedNum = num.toString().padStart(2, '0');
      addNumber(formattedNum);
      setCustomNumber('');
    }
  };

  // Generate random numbers
  const generateRandom = () => {
    const needed = (selectedModality?.numbers || 2) - selectedNumbers.length;
    const newNumbers = [...selectedNumbers];
    while (newNumbers.length < (selectedModality?.numbers || 2)) {
      const rand = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      if (!newNumbers.includes(rand)) {
        newNumbers.push(rand);
      }
    }
    setSelectedNumbers(newNumbers);
  };

  // Confirm play
  const confirmPlay = () => {
    Alert.alert(
      '¡Jugada Confirmada!',
      `Lotería: ${selectedLottery.name}\nModalidad: ${selectedModality.name}\nNúmeros: ${selectedNumbers.join(', ')}\nApuesta: RD$ ${stake}\nPremio Potencial: RD$ ${potentialPrize.toLocaleString()}`,
      [
        { text: 'Ver Ticket', onPress: () => navigation.navigate('Profile') },
        { text: 'Jugar Más', onPress: () => resetPlay() },
      ]
    );
  };

  // Reset play
  const resetPlay = () => {
    setStep(1);
    setSelectedLottery(null);
    setSelectedModality(null);
    setSelectedNumbers([]);
    setStake(25);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((s) => (
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
              {s === 1 ? 'Lotería' : s === 2 ? 'Modalidad' : s === 3 ? 'Números' : 'Confirmar'}
            </Text>
          </View>
        ))}
      </View>

      {/* Step 1: Select Lottery */}
      {step === 1 && (
        <View style={styles.section}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            🎰 Selecciona una Lotería
          </Text>
          <View style={styles.optionsGrid}>
            {LOTTERIES.map((lottery) => (
              <TouchableOpacity
                key={lottery.id}
                style={[
                  styles.optionCard,
                  { backgroundColor: colors.card },
                  selectedLottery?.id === lottery.id && { borderColor: lottery.color, borderWidth: 3 },
                ]}
                onPress={() => {
                  setSelectedLottery(lottery);
                  setStep(2);
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: lottery.color }]}>
                  <Text style={styles.optionEmoji}>{lottery.icon}</Text>
                </View>
                <Text style={[styles.optionName, { color: colors.text }]}>
                  {lottery.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Step 2: Select Modality */}
      {step === 2 && (
        <View style={styles.section}>
          <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
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
                setStep(3);
              }}
            >
              <View style={styles.modalityInfo}>
                <Text style={[styles.modalityName, { color: colors.text }]}>
                  {modality.name}
                </Text>
                <Text style={[styles.modalityDesc, { color: colors.textSecondary }]}>
                  {modality.description}
                </Text>
              </View>
              <View style={styles.modalityMultiplier}>
                <Text style={[styles.multiplierText, { color: colors.success }]}>
                  x{modality.multiplier}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Step 3: Select Numbers */}
      {step === 3 && (
        <View style={styles.section}>
          <TouchableOpacity onPress={() => setStep(2)} style={styles.backButton}>
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
                  { backgroundColor: selectedNumbers[idx] ? selectedLottery.color : colors.border },
                ]}
                onPress={() => selectedNumbers[idx] && removeNumber(selectedNumbers[idx])}
              >
                <Text style={styles.selectedNumberText}>
                  {selectedNumbers[idx] || '?'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Number Input */}
          <View style={[styles.customInputContainer, { backgroundColor: colors.card }]}>
            <TextInput
              style={[styles.customInput, { color: colors.text }]}
              placeholder="00-99"
              placeholderTextColor={colors.textSecondary}
              value={customNumber}
              onChangeText={setCustomNumber}
              keyboardType="numeric"
              maxLength={2}
            />
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleAddCustomNumber}
            >
              <Text style={styles.addButtonText}>Agregar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.randomButton, { backgroundColor: colors.success }]}
              onPress={generateRandom}
            >
              <Text style={styles.addButtonText}>🎲 Aleatorio</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Numbers Grid */}
          <View style={styles.quickNumbersGrid}>
            {['00', '11', '22', '33', '44', '55', '66', '77', '88', '99'].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.quickNumber,
                  { backgroundColor: selectedNumbers.includes(num) ? selectedLottery.color : colors.card },
                ]}
                onPress={() => selectedNumbers.includes(num) ? removeNumber(num) : addNumber(num)}
              >
                <Text style={[styles.quickNumberText, { color: selectedNumbers.includes(num) ? '#fff' : colors.text }]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedNumbers.length === selectedModality?.numbers && (
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: colors.primary }]}
              onPress={() => setStep(4)}
            >
              <Text style={styles.continueButtonText}>Continuar →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <View style={styles.section}>
          <TouchableOpacity onPress={() => setStep(3)} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Cambiar Números</Text>
          </TouchableOpacity>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            ✅ Confirma tu Jugada
          </Text>

          {/* Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Lotería</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {selectedLottery?.icon} {selectedLottery?.name}
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
                  <View key={idx} style={[styles.summaryBall, { backgroundColor: selectedLottery?.color }]}>
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
          >
            <Text style={styles.confirmButtonText}>🎰 Confirmar Jugada</Text>
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
    height: 40,
  },
});
