/**
 * Notifications Manager
 * Handles trading alerts, reminders, and push notifications
 */

'use client';

import { Trade } from '@/lib/types';
import { calculatePnL } from '@/lib/trade-utils';

export interface Notification {
  id: string;
  type: 'alert' | 'reminder' | 'achievement' | 'warning';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

export interface AlertRule {
  id: string;
  type: 'drawdown' | 'lost-streak' | 'target-reached' | 'daily-reminder';
  enabled: boolean;
  threshold?: number;
  message: string;
  sendNotification: boolean;
}

/**
 * Check for trading alerts based on trades
 */
export function checkTradeAlerts(trades: Trade[]): Notification[] {
  const alerts: Notification[] = [];

  if (trades.length === 0) {
    return alerts;
  }

  // 1. Check for drawdown
  let maxEquity = 0;
  let currentEquity = 0;
  let maxDrawdown = 0;

  trades.forEach((trade) => {
    currentEquity += calculatePnL(trade);
    if (currentEquity > maxEquity) {
      maxEquity = currentEquity;
    }
    const drawdown = maxEquity - currentEquity;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  if (maxDrawdown > 0) {
    alerts.push({
      id: `drawdown-${Date.now()}`,
      type: 'warning',
      title: 'Significant Drawdown Detected',
      message: `Your account is experiencing a drawdown of $${maxDrawdown.toFixed(2)}. Consider taking a break and reviewing your strategy.`,
      timestamp: Date.now(),
      read: false,
    });
  }

  // 2. Check for losing streaks
  const recentTrades = trades.slice(-5);
  let losingStreak = 0;
  for (let i = recentTrades.length - 1; i >= 0; i--) {
    if (calculatePnL(recentTrades[i]) < 0) {
      losingStreak++;
    } else {
      break;
    }
  }

  if (losingStreak >= 3) {
    alerts.push({
      id: `streak-${Date.now()}`,
      type: 'warning',
      title: 'Losing Streak Alert',
      message: `You have ${losingStreak} consecutive losing trades. Take a strategic break.`,
      timestamp: Date.now(),
      read: false,
    });
  }

  // 3. Check for positive milestones
  const totalPnL = trades.reduce((sum, t) => sum + calculatePnL(t), 0);
  const winningTrades = trades.filter(t => calculatePnL(t) > 0);
  const winRate = (winningTrades.length / trades.length) * 100;

  if (winRate >= 60 && trades.length >= 10) {
    alerts.push({
      id: `milestone-${Date.now()}`,
      type: 'achievement',
      title: 'Excellent Win Rate!',
      message: `You've achieved ${winRate.toFixed(1)}% win rate over ${trades.length} trades. Keep it up!`,
      timestamp: Date.now(),
      read: false,
    });
  }

  return alerts;
}

/**
 * Schedule trading reminders
 */
export function scheduleReminders(rules: AlertRule[]): void {
  rules.forEach((rule) => {
    if (!rule.enabled) return;

    // Schedule daily reminders (e.g., at 9 AM)
    if (rule.type === 'daily-reminder') {
      const now = new Date();
      const target = new Date();
      target.setHours(9, 0, 0, 0);

      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }

      const timeout = target.getTime() - now.getTime();
      setTimeout(() => {
        sendNotification(rule.message, rule.id);
        // Reschedule for tomorrow
        scheduleReminders([rule]);
      }, timeout);
    }
  });
}

/**
 * Send browser notification
 */
export async function sendNotification(
  message: string,
  tag: string,
  options: NotificationOptions = {}
): Promise<void> {
  if (!('Notification' in window)) {
    console.log('[Notifications] Browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification('Trading Diary', {
        body: message,
        icon: '/icon-192.png',
        badge: '/icon-64.png',
        tag,
        ...options,
      });
    } catch (error) {
      console.error('[Notifications] Failed to send notification:', error);
    }
  } else if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Trading Diary', {
          body: message,
          icon: '/icon-192.png',
          badge: '/icon-64.png',
          tag,
          ...options,
        });
      }
    } catch (error) {
      console.error('[Notifications] Failed to request permission:', error);
    }
  }
}

/**
 * Save notifications to IndexedDB
 */
export async function saveNotification(notification: Notification): Promise<void> {
  if (!window.indexedDB) return;

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('trading-journal-db', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      try {
        // Create store if it doesn't exist
        let objectStore;
        if (!db.objectStoreNames.contains('notifications')) {
          // Store doesn't exist, need to update DB version
          resolve();
          return;
        }

        const tx = db.transaction(['notifications'], 'readwrite');
        objectStore = tx.objectStore('notifications');
        const addRequest = objectStore.add(notification);

        addRequest.onerror = () => reject(addRequest.error);
        addRequest.onsuccess = () => resolve();
      } catch (error) {
        reject(error);
      }
    };
  });
}

/**
 * Get unread notifications
 */
export async function getUnreadNotifications(): Promise<Notification[]> {
  if (!window.indexedDB) return [];

  return new Promise((resolve) => {
    const request = window.indexedDB.open('trading-journal-db', 2);

    request.onerror = () => resolve([]);
    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('notifications')) {
        resolve([]);
        return;
      }

      const tx = db.transaction(['notifications'], 'readonly');
      const store = tx.objectStore('notifications');
      const index = store.index('read');
      const getAllRequest = index.getAll(false);

      getAllRequest.onerror = () => resolve([]);
      getAllRequest.onsuccess = () => {
        const notifications = getAllRequest.result as Notification[];
        resolve(notifications.sort((a, b) => b.timestamp - a.timestamp));
      };
    };
  });
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!window.indexedDB) return;

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('trading-journal-db', 2);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('notifications')) {
        resolve();
        return;
      }

      const tx = db.transaction(['notifications'], 'readwrite');
      const store = tx.objectStore('notifications');
      const getRequest = store.get(notificationId);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const notification = getRequest.result as Notification;
        if (notification) {
          notification.read = true;
          const updateRequest = store.put(notification);
          updateRequest.onerror = () => reject(updateRequest.error);
          updateRequest.onsuccess = () => resolve();
        } else {
          resolve();
        }
      };
    };
  });
}
