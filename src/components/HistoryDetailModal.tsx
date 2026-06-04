import type { PredictionRecord } from '../types/recycle';

interface HistoryDetailModalProps {
  record: PredictionRecord;
  onClose: () => void;
  onDelete: (recordId: string) => void;
}

export default function HistoryDetailModal({ record, onClose, onDelete }: HistoryDetailModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <p className="section-label">History detail</p>
            <h3>
              {record.label === 'recyclable'
                ? 'Recyclable'
                : record.label === 'non-recyclable'
                  ? 'Non-recyclable'
                  : record.label}
            </h3>
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-body">
          <img src={record.previewUrl} alt={record.fileName} className="modal-image" />
          <div className="modal-meta">
            <div>
              <span>File name</span>
              <strong>{record.fileName}</strong>
            </div>
            <div>
              <span>Confidence</span>
              <strong>{Math.round(record.confidence * 100)}%</strong>
            </div>
            <div>
              <span>Inference time</span>
              <strong>{record.inferenceMs.toFixed(0)} ms</strong>
            </div>
            <div>
              <span>Captured at</span>
              <strong>{new Date(record.createdAt).toLocaleString()}</strong>
            </div>
            <div>
              <span>Source</span>
              <strong>{record.source ?? 'upload'}</strong>
            </div>
            <div>
              <span>Model version</span>
              <strong>{record.modelVersion ?? '-'}</strong>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={() => onDelete(record.id)}>
            Delete record
          </button>
        </div>
      </div>
    </div>
  );
}
