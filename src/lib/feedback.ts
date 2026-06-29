const DB_NAME = 'sr-feedback';
const STORE = 'items';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface FeedbackEntry {
  id?: number;
  imageDataUrl: string;
  predictedLabel: string;
  confidence: number;
  geminiLabel?: string;
  mode: string;
  ts: number;
}

async function blobUrlToDataUrl(url: string): Promise<string> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export async function saveFeedback(opts: {
  imageUrl: string;
  predictedLabel: string;
  confidence: number;
  geminiLabel?: string;
  mode: string;
}): Promise<void> {
  const imageDataUrl = opts.imageUrl.startsWith('data:')
    ? opts.imageUrl
    : await blobUrlToDataUrl(opts.imageUrl);

  const item: Omit<FeedbackEntry, 'id'> = {
    imageDataUrl,
    predictedLabel: opts.predictedLabel,
    confidence: opts.confidence,
    ...(opts.geminiLabel ? { geminiLabel: opts.geminiLabel } : {}),
    mode: opts.mode,
    ts: Date.now(),
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(item);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getFeedbackCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function exportFeedback(): Promise<void> {
  const db = await openDB();
  const entries = await new Promise<FeedbackEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
  const blob = new Blob(
    [JSON.stringify({ version: 1, count: entries.length, entries }, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sr-feedback-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function clearFeedback(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
