/**
 * LotoLink Mobile - API Service
 * Handles all API communication with the backend
 */

import {
  LOTTERIES,
  BANCAS,
  LOTTERY_RESULTS,
  TICKET_HISTORY,
  TRANSACTIONS,
  NOTIFICATIONS,
  DEMO_USER,
} from '../data/mockData';

// API Configuration
const API_CONFIG = {
  baseUrl: 'https://api.lotolink.com',
  timeout: 10000,
  useMockData: true, // Set to false when backend is available
};

// Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface Lottery {
  id: string;
  name: string;
  logo: string;
  logoText: string;
  color: string;
  schedule: { day: string; times: string[] }[];
  nextDraw: string;
  modalities: string[];
  description: string;
  isOpen: boolean;
}

export interface Banca {
  id: number;
  name: string;
  address: string;
  phone: string;
  distance: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean;
  hours: string;
  lotteries: string[];
  coords: { lat: number; lng: number };
  image: string | null;
}

export interface LotteryResult {
  id: string;
  lotteryId: string;
  lotteryName: string;
  color: string;
  time: string;
  date: string;
  numbers: string[];
  isLive: boolean;
}

export interface Ticket {
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
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'play' | 'win' | 'withdrawal';
  amount: number;
  method: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  time: string;
  reference: string;
  details?: string;
}

export interface Notification {
  id: string;
  type: 'win' | 'result' | 'promo' | 'reminder';
  title: string;
  message: string;
  date: string;
  time: string;
  read: boolean;
  icon: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  memberSince: string;
  avatar: string | null;
  balance: number;
  wins: number;
  totalPlays: number;
  verified: boolean;
}

export interface PlayRequest {
  lotteryId: string;
  modalityId: string;
  numbers: string[];
  stake: number;
  bancaId: number;
}

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// API Functions

/**
 * Get all available lotteries
 */
export async function getLotteries(): Promise<ApiResponse<Lottery[]>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(500);
      return { success: true, data: LOTTERIES as Lottery[] };
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/lotteries`);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, data: [], error: 'Error al cargar loterías' };
  }
}

/**
 * Get lottery by ID
 */
export async function getLotteryById(id: string): Promise<ApiResponse<Lottery | null>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(300);
      const lottery = LOTTERIES.find(l => l.id === id);
      return { success: true, data: (lottery as Lottery) || null };
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/lotteries/${id}`);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, data: null, error: 'Error al cargar lotería' };
  }
}

/**
 * Get all nearby bancas
 */
export async function getBancas(): Promise<ApiResponse<Banca[]>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(500);
      return { success: true, data: BANCAS as Banca[] };
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/bancas`);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, data: [], error: 'Error al cargar bancas' };
  }
}

/**
 * Get banca by ID
 */
export async function getBancaById(id: number): Promise<ApiResponse<Banca | null>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(300);
      const banca = BANCAS.find(b => b.id === id);
      return { success: true, data: (banca as Banca) || null };
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/bancas/${id}`);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, data: null, error: 'Error al cargar banca' };
  }
}

/**
 * Get lottery results (live and historical)
 */
export async function getLotteryResults(
  lotteryId?: string,
  limit: number = 10
): Promise<ApiResponse<LotteryResult[]>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(500);
      let results = [...LOTTERY_RESULTS] as LotteryResult[];
      if (lotteryId) {
        results = results.filter(r => r.lotteryId === lotteryId);
      }
      return { success: true, data: results.slice(0, limit) };
    }

    const url = lotteryId
      ? `${API_CONFIG.baseUrl}/results?lotteryId=${lotteryId}&limit=${limit}`
      : `${API_CONFIG.baseUrl}/results?limit=${limit}`;
    const response = await fetch(url);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, data: [], error: 'Error al cargar resultados' };
  }
}

/**
 * Get live results only
 */
export async function getLiveResults(): Promise<ApiResponse<LotteryResult[]>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(300);
      const liveResults = LOTTERY_RESULTS.filter(r => r.isLive) as LotteryResult[];
      return { success: true, data: liveResults };
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/results/live`);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, data: [], error: 'Error al cargar resultados en vivo' };
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(): Promise<ApiResponse<User>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(300);
      return { success: true, data: DEMO_USER as User };
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/user/profile`);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, data: DEMO_USER as User, error: 'Error al cargar perfil' };
  }
}

/**
 * Get user ticket history
 */
export async function getTicketHistory(
  status?: 'won' | 'lost' | 'pending'
): Promise<ApiResponse<Ticket[]>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(500);
      let tickets = [...TICKET_HISTORY] as Ticket[];
      if (status) {
        tickets = tickets.filter(t => t.status === status);
      }
      return { success: true, data: tickets };
    }

    const url = status
      ? `${API_CONFIG.baseUrl}/user/tickets?status=${status}`
      : `${API_CONFIG.baseUrl}/user/tickets`;
    const response = await fetch(url);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, data: [], error: 'Error al cargar historial' };
  }
}

/**
 * Get transaction history
 */
export async function getTransactions(): Promise<ApiResponse<Transaction[]>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(500);
      return { success: true, data: TRANSACTIONS as Transaction[] };
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/user/transactions`);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, data: [], error: 'Error al cargar transacciones' };
  }
}

/**
 * Get notifications
 */
export async function getNotifications(): Promise<ApiResponse<Notification[]>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(300);
      return { success: true, data: NOTIFICATIONS as Notification[] };
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/user/notifications`);
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, data: [], error: 'Error al cargar notificaciones' };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(id: string): Promise<ApiResponse<boolean>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(200);
      return { success: true, data: true };
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/user/notifications/${id}/read`, {
      method: 'POST',
    });
    return { success: response.ok, data: response.ok };
  } catch (error) {
    return { success: false, data: false, error: 'Error al marcar notificación' };
  }
}

/**
 * Place a new bet
 */
export async function placeBet(request: PlayRequest): Promise<ApiResponse<Ticket>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(1000);
      const newTicket: Ticket = {
        id: `ticket-${Date.now()}`,
        lotteryId: request.lotteryId,
        lotteryName: LOTTERIES.find(l => l.id === request.lotteryId)?.name || 'Unknown',
        modality: request.modalityId,
        numbers: request.numbers,
        amount: request.stake,
        status: 'pending',
        prize: 0,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
        banca: BANCAS.find(b => b.id === request.bancaId)?.name || 'Unknown',
        ticketCode: `LNK-${Date.now().toString(36).toUpperCase()}`,
      };
      return { success: true, data: newTicket, message: '¡Jugada confirmada!' };
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const data = await response.json();
    return { success: true, data, message: '¡Jugada confirmada!' };
  } catch (error) {
    return { 
      success: false, 
      data: {} as Ticket, 
      error: 'Error al procesar jugada' 
    };
  }
}

/**
 * Deposit funds
 */
export async function depositFunds(
  amount: number,
  method: string
): Promise<ApiResponse<Transaction>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(1500);
      const transaction: Transaction = {
        id: `txn-${Date.now()}`,
        type: 'deposit',
        amount,
        method,
        status: 'completed',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
        reference: `DEP-${Date.now().toString(36).toUpperCase()}`,
      };
      return { success: true, data: transaction, message: 'Recarga exitosa' };
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/wallet/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, method }),
    });
    const data = await response.json();
    return { success: true, data, message: 'Recarga exitosa' };
  } catch (error) {
    return { 
      success: false, 
      data: {} as Transaction, 
      error: 'Error al procesar recarga' 
    };
  }
}

/**
 * Withdraw funds
 */
export async function withdrawFunds(
  amount: number,
  method: string
): Promise<ApiResponse<Transaction>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(1500);
      const transaction: Transaction = {
        id: `txn-${Date.now()}`,
        type: 'withdrawal',
        amount: -amount,
        method,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }),
        reference: `WTH-${Date.now().toString(36).toUpperCase()}`,
      };
      return { success: true, data: transaction, message: 'Retiro solicitado' };
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/wallet/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, method }),
    });
    const data = await response.json();
    return { success: true, data, message: 'Retiro solicitado' };
  } catch (error) {
    return { 
      success: false, 
      data: {} as Transaction, 
      error: 'Error al procesar retiro' 
    };
  }
}

/**
 * Update user settings
 */
export async function updateUserSettings(settings: {
  notifications?: boolean;
  darkMode?: boolean;
  language?: string;
}): Promise<ApiResponse<boolean>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(300);
      return { success: true, data: true };
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/user/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return { success: response.ok, data: response.ok };
  } catch (error) {
    return { success: false, data: false, error: 'Error al actualizar configuración' };
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<ApiResponse<boolean>> {
  try {
    if (API_CONFIG.useMockData) {
      await delay(500);
      return { success: true, data: true };
    }

    const response = await fetch(`${API_CONFIG.baseUrl}/auth/logout`, {
      method: 'POST',
    });
    return { success: response.ok, data: response.ok };
  } catch (error) {
    return { success: false, data: false, error: 'Error al cerrar sesión' };
  }
}

export default {
  getLotteries,
  getLotteryById,
  getBancas,
  getBancaById,
  getLotteryResults,
  getLiveResults,
  getUserProfile,
  getTicketHistory,
  getTransactions,
  getNotifications,
  markNotificationRead,
  placeBet,
  depositFunds,
  withdrawFunds,
  updateUserSettings,
  logout,
};
