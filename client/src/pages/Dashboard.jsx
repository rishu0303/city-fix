import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardList, ShieldAlert } from 'lucide-react';
import { ComplaintCard } from '../components/ComplaintCard.jsx';
import { getDepartmentComplaints } from '../services/complaintService.js';
import { useAuth } from '../hooks/useAuth.js';
import { CitizenDashboard } from './CitizenDashboard.jsx';

const openStatuses = ['Submitted', 'In Review', 'Assigned', 'In Progress', 'Reopened'];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const isSuperAdmin = user?.role === 'SuperAdmin';

  useEffect(() => {
    let isMounted = true;

    getDepartmentComplaints()
      .then((data) => {
        if (isMounted) {
          setComplaints(data.complaints || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.message || 'Unable to load operations dashboard.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    return {
      total: complaints.length,
      open: complaints.filter((complaint) => openStatuses.includes(complaint.status)).length,
      escalated: complaints.filter((complaint) => complaint.isEscalated || complaint.severityRating >= 4).length,
      resolved: complaints.filter((complaint) => complaint.status === 'Resolved').length
    };
  }, [complaints]);

  const priorityComplaints = useMemo(() => {
    return [...complaints]
      .sort((a, b) => {
        const priorityDelta = (b.priorityScore || 0) - (a.priorityScore || 0);
        if (priorityDelta !== 0) return priorityDelta;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      })
      .slice(0, 5);
  }, [complaints]);

  return (
    <section className="page-surface">
      <div className="page-header dashboard-header">
        <div>
          <span className="eyebrow">{isSuperAdmin ? 'SuperAdmin dashboard' : 'Department dashboard'}</span>
          <h1>{isSuperAdmin ? 'City operations overview.' : `${user?.departmentAssigned || 'Department'} operations.`}</h1>
          <p>
            {isSuperAdmin
              ? 'Monitor city-wide complaint flow, escalations, and department workload from one place.'
              : 'Review your assigned department queue, prioritize urgent issues, and move work through resolution.'}
          </p>
        </div>
        <Link className="action-button" to="/admin">
          <ShieldAlert size={18} />
          Open admin queue
        </Link>
      </div>

      <div className="metric-grid four-up">
        <article className="metric-tile">
          <ClipboardList size={22} />
          <span>Total queue</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="metric-tile">
          <AlertTriangle size={22} />
          <span>Open work</span>
          <strong>{stats.open}</strong>
        </article>
        <article className="metric-tile">
          <AlertTriangle size={22} />
          <span>Urgent</span>
          <strong>{stats.escalated}</strong>
        </article>
        <article className="metric-tile">
          <CheckCircle2 size={22} />
          <span>Resolved</span>
          <strong>{stats.resolved}</strong>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="workbench-panel local-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Priority work</span>
              <h2>{isSuperAdmin ? 'City-wide attention queue' : 'Department attention queue'}</h2>
            </div>
            <Link className="back-link" to="/complaints">View all</Link>
          </div>

          {error && <div className="form-error">{error}</div>}
          {isLoading && <div className="empty-state">Loading operations dashboard...</div>}
          {!isLoading && !error && priorityComplaints.length === 0 && (
            <div className="empty-state">
              <strong>No active complaints in this queue.</strong>
              <p>New citizen reports will appear here when they are routed to your scope.</p>
            </div>
          )}

          <div className="complaint-list">
            {priorityComplaints.map((complaint) => (
              <ComplaintCard key={complaint._id} complaint={complaint} />
            ))}
          </div>
        </section>

        <aside className="workbench-panel guidance-panel">
          <span className="eyebrow">Operations flow</span>
          <h2>Resolve without cross-department drift</h2>
          <ol className="process-list">
            <li>Open the admin queue.</li>
            <li>Select the highest priority issue.</li>
            <li>Move through valid status transitions.</li>
            <li>Attach resolution proof before closing work.</li>
          </ol>
          <Link className="secondary-action" to="/analytics">
            <BarChart3 size={16} />
            Review analytics
          </Link>
        </aside>
      </div>
    </section>
  );
};

export const Dashboard = () => {
  const { user } = useAuth();

  if (user?.role === 'Citizen') {
    return <CitizenDashboard />;
  }

  return <AdminDashboard />;
};
