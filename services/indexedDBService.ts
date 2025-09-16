

const DB_NAME = '1za7-ai-db';
const STORE_NAME = 'keyValueStore'; // Generic store for all local data
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

/**
 * Opens and initializes the IndexedDB database.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

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
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                // Using 'key' as the keyPath to mimic localStorage key-value behavior
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
    });
};

/**
 * Saves data to the IndexedDB store. This function is analogous to `localStorage.setItem`.
 * @param {string} id - The key for the data.
 * @param {any} data - The data to store. Can be a large object, Blob, etc.
 * @returns {Promise<void>}
 */
export const saveData = async (id: string, data: any): Promise<void> => {
    const dbInstance = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ key: id, value: data });

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error('Error saving data to IndexedDB:', (event.target as IDBRequest).error);
            reject((event.target as IDBRequest).error);
        };
    });
};

/**
 * Loads data from the IndexedDB store. This function is analogous to `localStorage.getItem`.
 * @template T
 * @param {string} id - The key of the data to retrieve.
 * @returns {Promise<T | null>} A promise that resolves with the data's value or null if not found.
 */
export const loadData = async <T>(id: string): Promise<T | null> => {
    const dbInstance = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = dbInstance.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = (event) => {
            const result = (event.target as IDBRequest).result;
            if (result) {
                resolve(result.value as T);
            } else {
                resolve(null);
            }
        };

        request.onerror = (event) => {
            console.error('Error loading data from IndexedDB:', (event.target as IDBRequest).error);
            reject((event.target as IDBRequest).error);
        };
    });
};

/**
 * Removes data from the IndexedDB store. This function is analogous to `localStorage.removeItem`.
 * @param {string} id - The key of the data to remove.
 * @returns {Promise<void>}
 */
export const removeData = async (id: string): Promise<void> => {
    const dbInstance = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = dbInstance.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error('Error removing data from IndexedDB:', (event.target as IDBRequest).error);
            reject((event.target as IDBRequest).error);
        };
    });
};
