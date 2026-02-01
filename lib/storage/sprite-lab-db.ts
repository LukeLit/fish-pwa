/**
 * IndexedDB Storage for SpriteLab
 * 
 * Stores work-in-progress sprites locally before uploading to blob storage.
 * Uses efficient binary Blob storage for sprite data.
 */

const DB_NAME = 'sprite-lab-db';
const DB_VERSION = 1;
const STORE_NAME = 'sprites';

export interface SpriteLabEntry {
  id: string;                    // Creature ID e.g., "goldfish_starter"
  name: string;
  updatedAt: number;             // Unix timestamp for display
  
  // Growth sprites stored as Blobs (efficient binary storage)
  sprites: {
    juvenile?: Blob;
    adult?: Blob;
    elder?: Blob;
  };
  
  // Metadata needed to regenerate/upload
  promptData: {
    descriptionChunks: string[];
    visualMotif: string;
    biomeId: string;
    rarity: string;
    sizeTier: string;
    essence: Record<string, number>;
    grantedAbilities: string[];
  };
}

/**
 * Open or create the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[SpriteLabDB] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        console.log('[SpriteLabDB] Created object store');
      }
    };
  });
}

/**
 * Save or update a sprite entry
 */
export async function saveEntry(entry: SpriteLabEntry): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.put(entry);
    
    request.onerror = () => {
      console.error('[SpriteLabDB] Failed to save entry:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      console.log('[SpriteLabDB] Saved entry:', entry.id);
      resolve();
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Get a specific entry by creature ID
 */
export async function getEntry(id: string): Promise<SpriteLabEntry | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.get(id);
    
    request.onerror = () => {
      console.error('[SpriteLabDB] Failed to get entry:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      resolve(request.result || null);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * List all entries, sorted by most recently updated
 */
export async function listEntries(): Promise<SpriteLabEntry[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('updatedAt');
    
    const request = index.getAll();
    
    request.onerror = () => {
      console.error('[SpriteLabDB] Failed to list entries:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      // Sort by updatedAt descending (most recent first)
      const entries = (request.result as SpriteLabEntry[]).sort(
        (a, b) => b.updatedAt - a.updatedAt
      );
      resolve(entries);
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Delete an entry by ID
 */
export async function deleteEntry(id: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const request = store.delete(id);
    
    request.onerror = () => {
      console.error('[SpriteLabDB] Failed to delete entry:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      console.log('[SpriteLabDB] Deleted entry:', id);
      resolve();
    };
    
    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Convert a data URL to a Blob
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Convert a Blob to a data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
