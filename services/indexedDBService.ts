import { type AiLogItem, type HistoryItem } from '../types';

const DB_NAME = '1za7-ai-db';
const DB_VERSION = 2; // Incremented version to trigger onupgradeneeded
const STORES = {
    SETTINGS: 'settings',
    HISTORY: 'history',
    LOGS: 'logs',
};

let db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
            reject("IndexedDB error");
        };

        request.onsuccess = (event) => {
            db = (event.target as IDBOpenDBRequest).result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = (event.target as IDBOpenDBRequest).result;
            // Old version might have a 'keyValueStore'. We can delete it upon upgrade.
            if (dbInstance.objectStoreNames.contains('keyValueStore')) {
                dbInstance.deleteObjectStore('keyValueStore');
            }

            if (!dbInstance.objectStoreNames.contains(STORES.SETTINGS)) {
                dbInstance.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
            }
            if (!dbInstance.objectStoreNames.contains(STORES.HISTORY)) {
                const historyStore = dbInstance.createObjectStore(STORES.HISTORY, { keyPath: 'id' });
                historyStore.createIndex('userId', 'userId', { unique: false });
                historyStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            if (!dbInstance.objectStoreNames.contains(STORES.LOGS)) {
                const logsStore = dbInstance.createObjectStore(STORES.LOGS, { keyPath: 'id' });
                logsStore.createIndex('userId', 'userId', { unique: false });
                logsStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
};

// --- Generic Settings (Key-Value) Store Functions ---
// These functions are kept for backward compatibility with settings management.

export const saveData = async (key: string, value: any): Promise<void> => {
    const dbInstance = await openDB();
    const transaction = dbInstance.transaction(STORES.SETTINGS, 'readwrite');
    const store = transaction.objectStore(STORES.SETTINGS);
    store.put({ key, value });
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
};

export const loadData = async <T>(key: string): Promise<T | null> => {
    const dbInstance = await openDB();
    const transaction = dbInstance.transaction(STORES.SETTINGS, 'readonly');
    const store = transaction.objectStore(STORES.SETTINGS);
    const request = store.get(key);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result ? request.result.value : null);
        request.onerror = () => reject(request.error);
    });
};

export const removeData = async (key: string): Promise<void> => {
    const dbInstance = await openDB();
    const transaction = dbInstance.transaction(STORES.SETTINGS, 'readwrite');
    const store = transaction.objectStore(STORES.SETTINGS);
    store.delete(key);
     return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
};


// --- User-Specific, Itemized Store Functions ---

const addItem = async (storeName: string, item: object): Promise<void> => {
    const dbInstance = await openDB();
    const transaction = dbInstance.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.add(item);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
};

const getAllItemsForUser = async <T>(storeName: string, userId: string): Promise<T[]> => {
    const dbInstance = await openDB();
    const transaction = dbInstance.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index('userId');
    const request = index.getAll(userId);
    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            // Sort descending by timestamp to keep the newest items first
            const sorted = (request.result as any[]).sort((a, b) => b.timestamp - a.timestamp);
            resolve(sorted as T[]);
        };
        request.onerror = () => reject(request.error);
    });
};

const deleteItem = async (storeName: string, id: string): Promise<void> => {
    const dbInstance = await openDB();
    const transaction = dbInstance.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.delete(id);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
};

const clearItemsForUser = async (storeName: string, userId: string): Promise<void> => {
    const dbInstance = await openDB();
    const transaction = dbInstance.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const index = store.index('userId');
    const request = index.openCursor(IDBKeyRange.only(userId));
    request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
        }
    };
     return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
};

const pruneStoreForUser = async (storeName: string, userId: string, maxItems: number): Promise<void> => {
    const dbInstance = await openDB();
    const transaction = dbInstance.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const index = store.index('userId');
    const cursorRequest = index.openCursor(IDBKeyRange.only(userId), 'prev'); // 'prev' to start from newest
    let count = 0;

    cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
            count++;
            if (count > maxItems) {
                store.delete(cursor.primaryKey);
            }
            cursor.continue();
        }
    };
     return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject((event.target as IDBTransaction).error);
    });
};


// --- Exported History Functions ---
// FIX: Explicitly type the generic function to ensure type safety for callers.
export const dbGetHistory = (userId: string) => getAllItemsForUser<HistoryItem>(STORES.HISTORY, userId);
export const dbAddHistoryItem = (item: any) => addItem(STORES.HISTORY, item);
export const dbDeleteHistoryItem = (id: string) => deleteItem(STORES.HISTORY, id);
export const dbClearHistory = (userId: string) => clearItemsForUser(STORES.HISTORY, userId);
export const dbPruneHistory = (userId: string, max: number) => pruneStoreForUser(STORES.HISTORY, userId, max);

// --- Exported Log Functions ---
// FIX: Explicitly type the generic function to ensure type safety for callers.
export const dbGetLogs = (userId: string) => getAllItemsForUser<AiLogItem>(STORES.LOGS, userId);
export const dbAddLogEntry = (item: any) => addItem(STORES.LOGS, item);
export const dbClearLogs = (userId: string) => clearItemsForUser(STORES.LOGS, userId);
export const dbPruneLogs = (userId: string, max: number) => pruneStoreForUser(STORES.LOGS, userId, max);