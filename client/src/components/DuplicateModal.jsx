import { CheckCircle2, X } from 'lucide-react';
import { ComplaintCard } from './ComplaintCard.jsx';

export const DuplicateModal = ({ duplicate, onConfirm, onClose }) => {
  if (!duplicate) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="duplicate-modal" role="dialog" aria-modal="true" aria-labelledby="duplicate-title">
        <button className="icon-button modal-close" type="button" onClick={onClose} aria-label="Close duplicate dialog">
          <X size={18} />
        </button>
        <div className="modal-icon">
          <CheckCircle2 size={24} />
        </div>
        <span className="eyebrow">Smart duplicate detection</span>
        <h2 id="duplicate-title">We found a matching report.</h2>
        <p>
          CityFix matched your submission to an existing issue. Your support has already been added to its priority.
        </p>
        <ComplaintCard complaint={duplicate} compact />
        <div className="modal-actions">
          <button className="primary-button" type="button" onClick={onConfirm}>
            Yes, this is my issue
          </button>
          <button className="ghost-button" type="button" onClick={onClose}>
            Review another report
          </button>
        </div>
      </section>
    </div>
  );
};
