import type { PredictionRecord } from '../types/recycle';

interface HistoryListProps {
  records: PredictionRecord[];
  onClear: () => void;
}

export default function HistoryList({ records, onClear }: HistoryListProps) {
  return (
    <section className="history-panel">
      <div className="section-head">
        <div>
          <p className="section-label">History</p>
          <h3>Recent predictions</h3>
        </div>
        <button className="secondary-button" type="button" onClick={onClear} disabled={records.length === 0}>
          Clear
        </button>
      </div>

      {records.length === 0 ? (
        <p className="empty-state">No saved predictions yet.</p>
      ) : (
        <ul className="history-list">
          {records.map((record) => (
            <li key={record.id} className="history-item">
              <img src={record.previewUrl} alt={record.fileName} />
              <div>
                <strong>{record.label === 'recyclable' ? 'Recyclable' : 'Non-recyclable'}</strong>
                <span>{Math.round(record.confidence * 100)}% confidence</span>
                <small>{new Date(record.createdAt).toLocaleString()}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
