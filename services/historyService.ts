import { type HistoryItem, type HistoryItemType } from '../types';
import { supabase } from './supabaseClient';
import { dbGetHistory, dbAddHistoryItem, dbDeleteHistoryItem, dbClearHistory, dbPruneHistory } from './indexedDBService';

const MAX_HISTORY_ITEMS = 15;

const getCurrentUserId = async (): Promise<string | null> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user?.id) {
        console.error("User not authenticated, cannot access history.");
        return null;
    }
    return session.user.id;
};

/**
 * Retrieves the entire generation history for the current user from IndexedDB.
 * @returns {Promise<HistoryItem[]>} A promise that resolves to an array of history items.
 */
export const getHistory = async (): Promise<HistoryItem[]> => {
    const userId = await getCurrentUserId();
    if (!userId) return [];
    // FIX: The type error here is resolved by strongly typing the dbGetHistory function in indexedDBService.ts
    return dbGetHistory(userId);
};

/**
 * Adds a new item to the current user's generation history in IndexedDB.
 * @param {object} newItemData - The data for the new history item.
 */
export const addHistoryItem = async (newItemData: { type: HistoryItemType; prompt: string; result: string | Blob; }) => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const newItem: HistoryItem = {
        id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
        userId, // Add userId for indexing
        ...newItemData,
    };
  
    try {
        await dbAddHistoryItem(newItem);
        // Pruning keeps the database size in check.
        await dbPruneHistory(userId, MAX_HISTORY_ITEMS);
    } catch (error) {
        console.error("Failed to save history to IndexedDB:", error);
    }
};

/**
 * Deletes a specific item from the current user's generation history in IndexedDB.
 * @param {string} id - The ID of the history item to delete.
 */
export const deleteHistoryItem = async (id: string) => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await dbDeleteHistoryItem(id);
};

/**
 * Clears the entire generation history for the current user from IndexedDB.
 */
export const clearHistory = async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await dbClearHistory(userId);
};