import { AlertTriangle, Inbox, LoaderCircle } from 'lucide-react';

export const LoadingState = ({ title = 'Loading...', message }) => (
  <div className="state-panel loading-state" role="status" aria-live="polite">
    <LoaderCircle className="state-icon spinning" size={24} />
    <div>
      <strong>{title}</strong>
      {message && <p>{message}</p>}
    </div>
  </div>
);

export const ErrorState = ({ title = 'Something went wrong.', message, onRetry, actionLabel = 'Try again' }) => (
  <div className="state-panel error-state" role="alert">
    <AlertTriangle className="state-icon" size={24} />
    <div>
      <strong>{title}</strong>
      {message && <p>{message}</p>}
      {onRetry && (
        <button className="ghost-button" type="button" onClick={onRetry}>
          {actionLabel}
        </button>
      )}
    </div>
  </div>
);

export const EmptyState = ({ title, message, action }) => (
  <div className="state-panel empty-state">
    <Inbox className="state-icon" size={24} />
    <div>
      <strong>{title}</strong>
      {message && <p>{message}</p>}
      {action}
    </div>
  </div>
);
