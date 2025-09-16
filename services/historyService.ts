

import { type HistoryItem, type HistoryItemType } from '../types';
import { supabase } from './supabaseClient';
import { saveData, loadData, removeData } from './indexedDBService';

const HISTORY_KEY_PREFIX = '1za7-ai-generation-history-';
const MAX_HISTORY_ITEMS = 15; // Set a reasonable limit to prevent storage quota errors

/**
 * Gets the IndexedDB key specific to the current user.
 * It now relies solely on the secure Supabase session.
 * @returns {Promise<string | null>} The user-specific key or null if not authenticated.
 */
const getUserHistoryKey = async (): Promise<string | null> => {
    // The single source of truth for the user's session is Supabase auth.
    const { data: { session }, error } = await (supabase.auth as any).getSession();

    if (error) {
        console.error("Error getting session for history:", error.message);
        return null;
    }

    if (session?.user?.id) {
        return `${HISTORY_KEY_PREFIX}${session.user.id}`;
    }

    // This message will now only appear if there is genuinely no active session.
    console.error("User not authenticated, cannot access history.");
    return null;
};

/**
 * Retrieves the entire generation history for the current user from IndexedDB.
 * @returns {Promise<HistoryItem[]>} A promise that resolves to an array of history items.
 */
export const getHistory = async (): Promise<HistoryItem[]> => {
    const userHistoryKey = await getUserHistoryKey();
    if (!userHistoryKey) return [];

    try {
        const history = await loadData<HistoryItem[]>(userHistoryKey);
        return history || [];
    } catch (error) {
        console.error("Failed to load history from IndexedDB:", error);
        return [];
    }
};

/**
 * Adds a new item to the current user's generation history in IndexedDB.
 * @param {object} newItemData - The data for the new history item.
 */
export const addHistoryItem = async (newItemData: { type: HistoryItemType; prompt: string; result: string; }) => {
    const userHistoryKey = await getUserHistoryKey();
    if (!userHistoryKey) return;

    const history = await getHistory();
    const newItem: HistoryItem = {
        id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
        ...newItemData,
    };
  
    let updatedHistory = [newItem, ...history];

    if (updatedHistory.length > MAX_HISTORY_ITEMS) {
        updatedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);
    }

    try {
        await saveData(userHistoryKey, updatedHistory);
    } catch (error) {
        console.error("Failed to save history to IndexedDB:", error);
    }
};

/**
 * Deletes a specific item from the current user's generation history in IndexedDB.
 * @param {string} id - The ID of the history item to delete.
 */
export const deleteHistoryItem = async (id: string) => {
    const userHistoryKey = await getUserHistoryKey();
    if (!userHistoryKey) return;

    const history = await getHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    try {
        await saveData(userHistoryKey, updatedHistory);
    } catch (error) {
        console.error("Failed to update history in IndexedDB after deletion:", error);
    }
};

/**
 * Clears the entire generation history for the current user from IndexedDB.
 */
export const clearHistory = async () => {
    const userHistoryKey = await getUserHistoryKey();
    if (!userHistoryKey) return;

    try {
        await removeData(userHistoryKey);
    } catch (error) {
        console.error("Failed to clear history from IndexedDB:", error);
    }
};
