import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FilePlus2, LocateFixed, MapPin, Navigation } from 'lucide-react';
import { ComplaintCard } from '../components/ComplaintCard.jsx';
import { getNearbyComplaints } from '../services/complaintService.js';
import { useAuth } from '../hooks/useAuth.js';

const DEFAULT_DISTANCE = 5000;

export const CitizenDashboard = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [error, setError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const stats = useMemo(() => {
    const open = complaints.filter((complaint) => !['Resolved', 'Rejected'].includes(complaint.status)).length;
    const resolved = complaints.filter((complaint) => complaint.status === 'Resolved').length;
    const highPriority = complaints.filter((complaint) => complaint.severityRating >= 4 || complaint.isEscalated).length;

    return {
      total: complaints.length,
      open,
      resolved,
      highPriority
    };
  }, [complaints]);

  const fetchNearby = async (position) => {
    setIsLoading(true);
    setError('');

    try {
      const data = await getNearbyComplaints({
        longitude: position.longitude,
        latitude: position.latitude,
        distance: DEFAULT_DISTANCE
      });
      setComplaints(data.complaints || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load nearby complaints.');
    } finally {
      setIsLoading(false);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return;
    }

    setIsLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setLocation(nextLocation);
        fetchNearby(nextLocation);
        setIsLocating(false);
      },
      () => {
        setError('Location permission was denied. You can still file a complaint from the form map.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <section className="page-surface">
      <div className="page-header dashboard-header">
        <div>
          <span className="eyebrow">Citizen dashboard</span>
          <h1>Welcome, {user?.name || 'neighbor'}.</h1>
          <p>Track nearby civic issues, see local activity, and report problems with a precise map pin.</p>
        </div>
        <Link className="action-button" to="/file">
          <FilePlus2 size={18} />
          File complaint
        </Link>
      </div>

      <div className="metric-grid four-up">
        <article className="metric-tile">
          <Navigation size={22} />
          <span>Nearby reports</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="metric-tile">
          <AlertTriangle size={22} />
          <span>Open issues</span>
          <strong>{stats.open}</strong>
        </article>
        <article className="metric-tile">
          <CheckCircle2 size={22} />
          <span>Resolved</span>
          <strong>{stats.resolved}</strong>
        </article>
        <article className="metric-tile">
          <AlertTriangle size={22} />
          <span>High priority</span>
          <strong>{stats.highPriority}</strong>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="workbench-panel local-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Local radius</span>
              <h2>Nearby issue feed</h2>
            </div>
            <button className="ghost-button" type="button" onClick={detectLocation} disabled={isLocating}>
              <LocateFixed size={16} />
              {isLocating ? 'Locating...' : 'Refresh location'}
            </button>
          </div>

          {location && (
            <div className="location-note">
              <MapPin size={15} />
              Showing reports within {DEFAULT_DISTANCE / 1000}km of {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </div>
          )}

          {error && <div className="form-error">{error}</div>}
          {isLoading && <div className="empty-state">Loading nearby reports...</div>}

          {!isLoading && !location && (
            <div className="empty-state">
              <strong>Share your location to load nearby issues.</strong>
              <p>CityFix only uses it to request the local 5km issue feed from the backend.</p>
            </div>
          )}

          {!isLoading && location && complaints.length === 0 && (
            <div className="empty-state">
              <strong>No nearby complaints yet.</strong>
              <p>That can be a good sign. If you see an issue, start a report with a photo and map pin.</p>
            </div>
          )}

          <div className="complaint-list">
            {complaints.slice(0, 5).map((complaint) => (
              <ComplaintCard key={complaint._id} complaint={complaint} />
            ))}
          </div>
        </section>

        <aside className="workbench-panel guidance-panel">
          <span className="eyebrow">How reports work</span>
          <h2>From street issue to department queue</h2>
          <ol className="process-list">
            <li>Upload a clear image.</li>
            <li>Drop the pin at the exact location.</li>
            <li>AI suggests category and severity.</li>
            <li>Duplicate reports become priority upvotes.</li>
          </ol>
        </aside>
      </div>
    </section>
  );
};
