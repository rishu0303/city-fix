import { Link } from 'react-router-dom';
import { MapPin, ThumbsUp } from 'lucide-react';
import { SeverityBadge, StatusBadge } from './StatusBadge.jsx';

export const ComplaintCard = ({ complaint, compact = false }) => {
  const cardContent = (
    <article className={`complaint-card ${compact ? 'compact' : ''}`}>
      {complaint.imageUrl && (
        <img className="complaint-thumb" src={complaint.imageUrl} alt="" />
      )}
      <div className="complaint-content">
        <div className="complaint-meta">
          <StatusBadge status={complaint.status} />
          <SeverityBadge severity={complaint.severityRating} />
        </div>
        <h3>{complaint.title || 'Civic Issue Reported'}</h3>
        <p>{complaint.description || 'No description provided.'}</p>
        <div className="complaint-footer">
          <span>
            <MapPin size={15} />
            {complaint.location?.addressString || 'Location captured'}
          </span>
          <span>
            <ThumbsUp size={15} />
            {complaint.upvotes || 0}
          </span>
        </div>
      </div>
    </article>
  );

  if (compact || !complaint._id) {
    return cardContent;
  }

  return (
    <Link className="complaint-card-link" to={`/complaints/${complaint._id}`}>
      {cardContent}
    </Link>
  );
};
