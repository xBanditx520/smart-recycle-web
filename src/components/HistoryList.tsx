import { getUILabel } from '../constants/disposal';
import type { PredictionRecord } from '../types/recycle';

interface HistoryListProps {
  records: PredictionRecord[];
  onClear: () => void;
  onSelect: (record: PredictionRecord) => void;
  onDelete: (recordId: string) => void;
}

export default function HistoryList({ records, onClear, onSelect, onDelete }: HistoryListProps) {
  return (
    <section className="history-panel">
      <div className="section-head">
        <div>
          <p className="section-label">History</p>
          <h3>Recent predictions</h3>
        </div>
        <div className="history-actions">
          <button className="secondary-button" type="button" onClick={onClear} disabled={records.length === 0}>
            Clear
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <p className="empty-state">No saved predictions yet.</p>
      ) : (
        <ul className="history-list">
          {records.map((record) => (
            <li key={record.id} className="history-item">
              <img src={record.previewUrl} alt={record.fileName} />
              <div>
                <strong>
                  {record.label === 'recyclable'
                    ? 'Recyclable'
                    : record.label === 'non-recyclable'
                      ? 'Non-recyclable'
                      : getUILabel(record.label)}
                </strong>
                <span>{Math.round(record.confidence * 100)}% confidence</span>
                <small>{new Date(record.createdAt).toLocaleString()}</small>
                <div className="history-item-actions">
                  <button className="secondary-button" type="button" onClick={() => onSelect(record)}>
                    View
                  </button>
                  <button className="secondary-button" type="button" onClick={() => onDelete(record.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
