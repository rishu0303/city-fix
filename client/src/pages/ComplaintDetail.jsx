import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, ImageIcon, MapPin, ThumbsUp, UserRound } from 'lucide-react';
import { LocationPreviewMap } from '../components/LocationPreviewMap.jsx';
import { SeverityBadge, StatusBadge } from '../components/StatusBadge.jsx';
import { getComplaintById } from '../services/complaintService.js';

const formatDate = (value) => {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
};

const getCoordinates = (complaint) => {
  const [longitude, latitude] = complaint?.location?.coordinates || [];
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
};

const getCoordinatePair = (complaint) => {
  const [longitude, latitude] = complaint?.location?.coordinates || [];
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return { latitude, longitude };
};

export const ComplaintDetail = () => {
  const { id } = useParams();
  const [complaint, setComplaint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadComplaint = async () => {
      setIsLoading(true);
      setError('');

      try {
        const data = await getComplaintById(id);
        if (isMounted) {
          setComplaint(data.complaint);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Unable to load this complaint.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadComplaint();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return <div className="empty-state">Loading complaint detail...</div>;
  }

  if (error) {
    return (
      <section className="page-surface compact-page">
        <Link className="back-link" to="/complaints">
          <ArrowLeft size={17} />
          Back to complaints
        </Link>
        <div className="form-error">{error}</div>
      </section>
    );
  }

  const coordinates = getCoordinates(complaint);
  const coordinatePair = getCoordinatePair(complaint);

  return (
    <section className="page-surface">
      <Link className="back-link" to="/complaints">
        <ArrowLeft size={17} />
        Back to complaints
      </Link>

      <div className="detail-layout">
        <main className="detail-main">
          <section className="workbench-panel detail-hero">
            {complaint.imageUrl ? (
              <img src={complaint.imageUrl} alt={complaint.title || 'Complaint image'} />
            ) : (
              <div className="image-placeholder">
                <ImageIcon size={30} />
                No image attached
              </div>
            )}
          </section>

          <section className="workbench-panel detail-section">
            <div className="complaint-meta">
              <StatusBadge status={complaint.status} />
              <SeverityBadge severity={complaint.severityRating} />
              <span className="category-badge">{complaint.category}</span>
            </div>
            <h1>{complaint.title || 'Civic Issue Reported'}</h1>
            <p>{complaint.description || 'No description provided.'}</p>
          </section>

          <section className="workbench-panel detail-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Timeline</span>
                <h2>Status history</h2>
              </div>
            </div>

            {complaint.timeline?.length > 0 ? (
              <ol className="timeline-list">
                {complaint.timeline.map((item) => (
                  <li key={`${item.updatedAt}-${item.status}-${item.note}`}>
                    <div>
                      <strong>{item.status || complaint.status}</strong>
                      <span>{formatDate(item.updatedAt)}</span>
                    </div>
                    {item.note && <p>{item.note}</p>}
                    {item.updatedBy?.name && <small>Updated by {item.updatedBy.name}</small>}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="empty-state">
                <strong>No timeline notes yet.</strong>
                <p>The first department update will appear here.</p>
              </div>
            )}
          </section>
        </main>

        <aside className="detail-side">
          <section className="workbench-panel detail-section">
            <span className="eyebrow">Snapshot</span>
            <div className="detail-stat">
              <ThumbsUp size={18} />
              <span>Upvotes</span>
              <strong>{complaint.upvotes || 0}</strong>
            </div>
            <div className="detail-stat">
              <CalendarClock size={18} />
              <span>Created</span>
              <strong>{formatDate(complaint.createdAt)}</strong>
            </div>
            <div className="detail-stat">
              <UserRound size={18} />
              <span>Reporter</span>
              <strong>{complaint.user?.name || 'Citizen'}</strong>
            </div>
          </section>

          <section className="workbench-panel detail-section">
            <span className="eyebrow">Location</span>
            <h2>{complaint.location?.addressString || 'Pinned location'}</h2>
            {coordinatePair && (
              <LocationPreviewMap
                latitude={coordinatePair.latitude}
                longitude={coordinatePair.longitude}
              />
            )}
            <p className="detail-line">
              <MapPin size={16} />
              {coordinates || 'Coordinates unavailable'}
            </p>
          </section>

          {complaint.resolutionImageUrl && (
            <section className="workbench-panel detail-section">
              <span className="eyebrow">Resolution proof</span>
              <img className="resolution-image" src={complaint.resolutionImageUrl} alt="Resolution proof" />
            </section>
          )}
        </aside>
      </div>
    </section>
  );
};
