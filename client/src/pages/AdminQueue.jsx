import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList, ImagePlus, ShieldAlert, UploadCloud } from 'lucide-react';
import { ComplaintCard } from '../components/ComplaintCard.jsx';
import { SeverityBadge, StatusBadge } from '../components/StatusBadge.jsx';
import { getDepartmentComplaints, updateComplaintStatus } from '../services/complaintService.js';
import { useAuth } from '../hooks/useAuth.js';

const transitions = {
  Submitted: ['In Review', 'Assigned', 'Rejected'],
  'In Review': ['Assigned', 'In Progress', 'Rejected'],
  Assigned: ['In Progress', 'Rejected'],
  'In Progress': ['Resolved', 'Rejected'],
  Resolved: ['Reopened'],
  Reopened: ['In Review', 'Assigned', 'In Progress', 'Rejected'],
  Rejected: ['Reopened']
};

const openStatuses = ['Submitted', 'In Review', 'Assigned', 'In Progress', 'Reopened'];

export const AdminQueue = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [status, setStatus] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [resolutionImage, setResolutionImage] = useState(null);
  const [resolutionPreview, setResolutionPreview] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAdmin = user?.role === 'DepartmentAdmin' || user?.role === 'SuperAdmin';
  const selectedComplaint = complaints.find((complaint) => complaint._id === selectedId) || null;

  const summary = useMemo(() => {
    return {
      total: complaints.length,
      open: complaints.filter((complaint) => openStatuses.includes(complaint.status)).length,
      escalated: complaints.filter((complaint) => complaint.isEscalated).length,
      resolved: complaints.filter((complaint) => complaint.status === 'Resolved').length
    };
  }, [complaints]);

  const availableStatuses = useMemo(() => {
    if (!selectedComplaint) return [];
    return [selectedComplaint.status, ...(transitions[selectedComplaint.status] || [])];
  }, [selectedComplaint]);

  const loadQueue = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await getDepartmentComplaints();
      const nextComplaints = data.complaints || [];
      setComplaints(nextComplaints);

      if (!selectedId && nextComplaints.length > 0) {
        setSelectedId(nextComplaints[0]._id);
        setStatus(nextComplaints[0].status);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load the admin queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      let isMounted = true;

      getDepartmentComplaints()
        .then((data) => {
          if (!isMounted) return;

          const nextComplaints = data.complaints || [];
          setComplaints(nextComplaints);

          if (nextComplaints.length > 0) {
            setSelectedId(nextComplaints[0]._id);
            setStatus(nextComplaints[0].status);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err.response?.data?.message || 'Unable to load the admin queue.');
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
    }
  }, [isAdmin]);

  const selectComplaint = (complaint) => {
    setSelectedId(complaint._id);
    setStatus(complaint.status);
    setAdminComment('');
    setResolutionImage(null);
    setResolutionPreview('');
    setError('');
    setSuccess('');
  };

  const updateResolutionImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setResolutionImage(file);
    setResolutionPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedComplaint) {
      setError('Choose a complaint before updating status.');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateComplaintStatus({
        id: selectedComplaint._id,
        status,
        adminComment,
        image: resolutionImage
      });
      setSuccess('Complaint status updated successfully.');
      setAdminComment('');
      setResolutionImage(null);
      setResolutionPreview('');
      await loadQueue();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update this complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <section className="page-surface compact-page">
        <span className="eyebrow">Restricted area</span>
        <h1>Admin queue is not available for this account.</h1>
        <p>Citizens can track and file complaints from the dashboard and complaint feed.</p>
      </section>
    );
  }

  return (
    <section className="page-surface">
      <div className="page-header">
        <div>
          <span className="eyebrow">{user.role === 'SuperAdmin' ? 'City operations' : 'Department operations'}</span>
          <h1>{user.role === 'SuperAdmin' ? 'Admin queue' : `${user.departmentAssigned} queue`}</h1>
          <p>Review assigned issues, move them through valid status transitions, and attach resolution proof when work is completed.</p>
        </div>
        <button className="ghost-button" type="button" onClick={loadQueue} disabled={isLoading}>
          Refresh queue
        </button>
      </div>

      <div className="metric-grid four-up">
        <article className="metric-tile">
          <ClipboardList size={22} />
          <span>Total queue</span>
          <strong>{summary.total}</strong>
        </article>
        <article className="metric-tile">
          <ShieldAlert size={22} />
          <span>Open work</span>
          <strong>{summary.open}</strong>
        </article>
        <article className="metric-tile">
          <ShieldAlert size={22} />
          <span>Escalated</span>
          <strong>{summary.escalated}</strong>
        </article>
        <article className="metric-tile">
          <CheckCircle2 size={22} />
          <span>Resolved</span>
          <strong>{summary.resolved}</strong>
        </article>
      </div>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <div className="admin-queue-layout">
        <section className="workbench-panel admin-list-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Queue</span>
              <h2>Complaints to review</h2>
            </div>
          </div>

          {isLoading && <div className="empty-state">Loading admin queue...</div>}
          {!isLoading && complaints.length === 0 && (
            <div className="empty-state">
              <strong>No complaints in this queue.</strong>
              <p>New department issues will appear here when citizens submit reports.</p>
            </div>
          )}

          <div className="admin-queue-list">
            {complaints.map((complaint) => (
              <button
                className={`admin-queue-item ${complaint._id === selectedId ? 'active' : ''}`}
                key={complaint._id}
                type="button"
                onClick={() => selectComplaint(complaint)}
              >
                <ComplaintCard complaint={complaint} compact />
              </button>
            ))}
          </div>
        </section>

        <aside className="workbench-panel admin-update-panel">
          {selectedComplaint ? (
            <>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Update selected issue</span>
                  <h2>{selectedComplaint.title || 'Civic Issue Reported'}</h2>
                </div>
                <Link className="back-link" to={`/complaints/${selectedComplaint._id}`}>
                  View detail
                </Link>
              </div>

              <div className="complaint-meta">
                <StatusBadge status={selectedComplaint.status} />
                <SeverityBadge severity={selectedComplaint.severityRating} />
                <span className="category-badge">{selectedComplaint.category}</span>
              </div>

              <form className="form-stack admin-update-form" onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="adminStatus">Next status</label>
                  <select id="adminStatus" value={status} onChange={(event) => setStatus(event.target.value)}>
                    {availableStatuses.map((nextStatus) => (
                      <option key={nextStatus} value={nextStatus}>{nextStatus}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="adminComment">Admin note</label>
                  <textarea
                    id="adminComment"
                    rows="5"
                    value={adminComment}
                    onChange={(event) => setAdminComment(event.target.value)}
                    placeholder="Add dispatch details, field observations, or resolution notes."
                  />
                </div>

                <label className="resolution-upload" htmlFor="resolutionImage">
                  {resolutionPreview ? (
                    <img src={resolutionPreview} alt="Resolution proof preview" />
                  ) : (
                    <span>
                      <ImagePlus size={22} />
                      Upload resolution proof
                    </span>
                  )}
                  <input id="resolutionImage" type="file" accept="image/*" onChange={updateResolutionImage} />
                </label>

                <button className="primary-button" type="submit" disabled={isSubmitting}>
                  <UploadCloud size={18} />
                  {isSubmitting ? 'Updating...' : 'Update complaint'}
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state">
              <strong>Select a complaint.</strong>
              <p>The status form will appear here once you choose an item from the queue.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};
