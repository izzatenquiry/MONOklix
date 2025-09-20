import { type AiLogItem } from '../types';
import { supabase } from './supabaseClient';
import { dbGetLogs, dbAddLogEntry, dbClearLogs, dbPruneLogs } from './indexedDBService';

const MAX_LOG_ITEMS = 50;

/**
 * Gets the current user's ID from the active session.
 * @returns {Promise<string | null>} The user's ID or null if not authenticated.
 */
const getCurrentUserId = async (): Promise<string | null> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user?.id) {
        console.error("User not authenticated, cannot access AI log.");
        return null;
    }
    return session.user.id;
};

/**
 * Retrieves the entire AI log for the current user from IndexedDB.
 * @returns {Promise<AiLogItem[]>} A promise that resolves to an array of log items.
 */
export const getLogs = async (): Promise<AiLogItem[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    // FIX: The type error here is resolved by strongly typing the dbGetLogs function in indexedDBService.ts
    return dbGetLogs(userId);
};

/**
 * Adds a new entry to the current user's AI log in IndexedDB.
 * @param {Omit<AiLogItem, 'id' | 'timestamp' | 'userId'>} newLogData - The data for the new log item.
 */
export const addLogEntry = async (newLogData: Omit<AiLogItem, 'id' | 'timestamp' | 'userId'>) => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const newLogItem: AiLogItem = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
        userId,
        ...newLogData,
    };
  
    try {
        await dbAddLogEntry(newLogItem);
        // Pruning keeps the log size manageable.
        await dbPruneLogs(userId, MAX_LOG_ITEMS);
    } catch (error) {
        console.error("Failed to save AI log to IndexedDB:", error);
    }
};

/**
 * Clears the entire AI log for the current user from IndexedDB.
 */
export const clearLogs = async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await dbClearLogs(userId);
};