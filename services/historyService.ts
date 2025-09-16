
import { type HistoryItem, type HistoryItemType } from '../types';
import { supabase } from './supabaseClient';
import { getLocalUser } from './userService';

const HISTORY_KEY_PREFIX = '1za7-ai-generation-history-';
const MAX_HISTORY_ITEMS = 50; // Set a reasonable limit to prevent storage quota errors

/**
 * Gets the localStorage key specific to the current user.
 * It prioritizes the insecure local session over the Supabase session.
 * @returns {Promise<string | null>} The user-specific key or null if not authenticated.
 */
const getUserHistoryKey = async (): Promise<string | null> => {
    // 1. Check for the insecure local user first, as it's the primary session method for email-only login.
    const localUser = getLocalUser();
    if (localUser?.id) {
        return `${HISTORY_KEY_PREFIX}${localUser.id}`;
    }

    // 2. Fallback to the standard Supabase session for users who logged in via magic link/confirmation.
    // FIX: Cast supabase.auth to any to resolve type error for getSession method.
    const { data: { session } } = await (supabase.auth as any).getSession();
    if (session?.user?.id) {
        return `${HISTORY_KEY_PREFIX}${session.user.id}`;
    }
    
    // 3. If neither authentication method finds a user, then deny access.
    console.error("User not authenticated, cannot access history.");
    return null;
};

/**
 * Retrieves the entire generation history for the current user from localStorage.
 * @returns {Promise<HistoryItem[]>} A promise that resolves to an array of history items.
 */
export const getHistory = async (): Promise<HistoryItem[]> => {
    const userHistoryKey = await getUserHistoryKey();
    if (!userHistoryKey) return [];

    try {
        const historyJson = localStorage.getItem(userHistoryKey);
        return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
        console.error("Failed to parse history from localStorage:", error);
        return [];
    }
};

/**
 * Adds a new item to the current user's generation history.
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
        localStorage.setItem(userHistoryKey, JSON.stringify(updatedHistory));
    } catch (error) {
        console.error("Failed to save history to localStorage:", error);
    }
};

/**
 * Deletes a specific item from the current user's generation history.
 * @param {string} id - The ID of the history item to delete.
 */
export const deleteHistoryItem = async (id: string) => {
    const userHistoryKey = await getUserHistoryKey();
    if (!userHistoryKey) return;

    const history = await getHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    try {
        localStorage.setItem(userHistoryKey, JSON.stringify(updatedHistory));
    } catch (error) {
        console.error("Failed to update history in localStorage after deletion:", error);
    }
};

/**
 * Clears the entire generation history for the current user from localStorage.
 */
export const clearHistory = async () => {
    const userHistoryKey = await getUserHistoryKey();
    if (!userHistoryKey) return;

    try {
        localStorage.removeItem(userHistoryKey);
    } catch (error) {
        console.error("Failed to clear history from localStorage:", error);
    }
};
