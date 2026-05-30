import { STORAGE_KEY } from '../constants/recycle';
import type { PredictionRecord } from '../types/recycle';

export function loadHistory() {
  if (typeof window === 'undefined') {
    return [] as PredictionRecord[];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [] as PredictionRecord[];
    const parsed = JSON.parse(raw) as PredictionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as PredictionRecord[];
  }
}

export function saveHistory(history: PredictionRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}
