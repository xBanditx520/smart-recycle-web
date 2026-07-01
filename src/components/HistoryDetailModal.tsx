import { useEffect } from 'react';
import { getBinInfo, getDisposalTip, getRecyclability, getUILabel } from '../constants/disposal';
import type { PredictionRecord } from '../types/recycle';

interface HistoryDetailModalProps {
  record: PredictionRecord;
  onClose: () => void;
  onDelete: (recordId: string) => void;
}

export default function HistoryDetailModal({ record, onClose, onDelete }: HistoryDetailModalProps) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const isBinary = record.label === 'recyclable' || record.label === 'non-recyclable';
  const displayLabel =
    record.label === 'recyclable'
      ? 'Recyclable'
      : record.label === 'non-recyclable'
        ? 'Non-recyclable'
        : getUILabel(record.label);
  const recyclability = !isBinary && !record.isComposite ? getRecyclability(record.label) : null;
  const binInfo = !isBinary && !record.isComposite ? getBinInfo(record.label) : null;

  const disposalTip = (() => {
    if (record.isComposite && record.topClasses && record.topClasses.length >= 2) {
      const [primary, secondary] = record.topClasses;
      return `Remove the ${secondary.label.toLowerCase()} component first if possible, then handle the ${primary.label.toLowerCase()} part separately. ${getDisposalTip(primary.label)}`;
    }
    return getDisposalTip(record.label);
  })();

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="section-label">History detail</p>
            <h3>
              {displayLabel}
              {recyclability ? <span className="recyclability-tag"> ({recyclability})</span> : null}
            </h3>
            {binInfo ? (
              <div className="bin-indicator">
                <span className="bin-dot" style={{ background: binInfo.hex }} aria-hidden="true" />
                <span>{binInfo.label}</span>
              </div>
            ) : null}
          </div>
          <button className="secondary-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-body">
          <img src={record.previewUrl} alt={record.fileName} className="modal-image" />
          <div className="modal-meta">
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
              <span>File name</span>
              <strong>{record.fileName}</strong>
            </div>
          </div>
        </div>

        <div className="disposal-card">
          <p className="section-label">Disposal Guidance</p>
          <p className="disposal-tip">{disposalTip}</p>
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
