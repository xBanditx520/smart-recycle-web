import { useEffect, useState } from 'react';
import HistoryDetailModal from '../components/HistoryDetailModal';
import HistoryList from '../components/HistoryList';
import { loadHistory, saveHistory } from '../lib/history';
import type { PredictionRecord } from '../types/recycle';

export default function HistoryPage() {
  const [history, setHistory] = useState<PredictionRecord[]>(() => loadHistory());
  const [selectedRecord, setSelectedRecord] = useState<PredictionRecord | null>(null);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  function clearHistory() {
    setHistory([]);
  }

  function deleteHistoryItem(recordId: string) {
    setHistory((current) => current.filter((item) => item.id !== recordId));
  }

  return (
    <section className="content-section">
      <HistoryList
        records={history}
        onClear={clearHistory}
        onSelect={(record) => setSelectedRecord(record)}
        onDelete={deleteHistoryItem}
      />

      {selectedRecord ? (
        <HistoryDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onDelete={(recordId) => {
            deleteHistoryItem(recordId);
            setSelectedRecord(null);
          }}
        />
      ) : null}
    </section>
  );
}
