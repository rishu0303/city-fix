import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList, ImagePlus, ShieldAlert, UploadCloud, UserCheck, UserX } from 'lucide-react';
import { ComplaintCard } from '../components/ComplaintCard.jsx';
import { SeverityBadge, StatusBadge } from '../components/StatusBadge.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/StateFeedback.jsx';
import { getDepartmentAdmins, updateDepartmentAdminApproval } from '../services/adminService.js';
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

const formatAdminDate = (value) => {
  if (!value) return 'Joined date unavailable';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium'
  }).format(new Date(value));
};

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
  const [queueError, setQueueError] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');
  const [departmentAdmins, setDepartmentAdmins] = useState([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [approvalId, setApprovalId] = useState('');

  const isAdmin = user?.role === 'DepartmentAdmin' || user?.role === 'SuperAdmin';
  const isSuperAdmin = user?.role === 'SuperAdmin';
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

  const applyQueueSelection = useCallback((nextComplaints, preferredId = '') => {
    const nextSelected = nextComplaints.find((complaint) => complaint._id === preferredId) || nextComplaints[0] || null;

    setSelectedId(nextSelected?._id || '');
    setStatus(nextSelected?.status || '');
  }, []);

  const loadQueue = useCallback(async (preferredId = selectedId) => {
    setIsLoading(true);
    setQueueError('');

    try {
      const data = await getDepartmentComplaints();
      const nextComplaints = data.complaints || [];
      setComplaints(nextComplaints);
      applyQueueSelection(nextComplaints, preferredId);
    } catch (err) {
      setQueueError(err.response?.data?.message || 'Unable to load the admin queue.');
    } finally {
      setIsLoading(false);
    }
  }, [applyQueueSelection, selectedId]);

  const loadDepartmentAdmins = useCallback(async () => {
    if (!isSuperAdmin) return;

    setIsLoadingAdmins(true);
    setApprovalError('');

    try {
      const data = await getDepartmentAdmins();
      setDepartmentAdmins(data.users || []);
    } catch (err) {
      setApprovalError(err.response?.data?.message || 'Unable to load DepartmentAdmin approvals.');
    } finally {
      setIsLoadingAdmins(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isAdmin) {
      let isMounted = true;

      getDepartmentComplaints()
        .then((data) => {
          if (!isMounted) return;

          const nextComplaints = data.complaints || [];
          setComplaints(nextComplaints);
          applyQueueSelection(nextComplaints);
        })
        .catch((err) => {
          if (isMounted) {
            setQueueError(err.response?.data?.message || 'Unable to load the admin queue.');
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
  }, [applyQueueSelection, isAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return undefined;

    let isMounted = true;

    getDepartmentAdmins()
      .then((data) => {
        if (isMounted) {
          setDepartmentAdmins(data.users || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setApprovalError(err.response?.data?.message || 'Unable to load DepartmentAdmin approvals.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isSuperAdmin]);

  const selectComplaint = (complaint) => {
    setSelectedId(complaint._id);
    setStatus(complaint.status);
    setAdminComment('');
    setResolutionImage(null);
    setResolutionPreview('');
    setActionError('');
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
    setActionError('');
    setSuccess('');

    if (!selectedComplaint) {
      setActionError('Choose a complaint before updating status.');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await updateComplaintStatus({
        id: selectedComplaint._id,
        status,
        adminComment,
        image: resolutionImage
      });
      const updatedComplaint = data.complaint;

      if (updatedComplaint?._id) {
        setComplaints((current) => current.map((complaint) => (
          complaint._id === updatedComplaint._id ? { ...complaint, ...updatedComplaint } : complaint
        )));
        setSelectedId(updatedComplaint._id);
        setStatus(updatedComplaint.status);
      }

      setSuccess('Complaint status updated successfully.');
      setAdminComment('');
      setResolutionImage(null);
      setResolutionPreview('');
      await loadQueue(updatedComplaint?._id || selectedComplaint._id);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Unable to update this complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovalUpdate = async (adminUser, isApproved) => {
    setApprovalError('');
    setActionError('');
    setSuccess('');
    setApprovalId(adminUser._id);

    try {
      const data = await updateDepartmentAdminApproval({ id: adminUser._id, isApproved });
      const updatedUser = data.user;
      setDepartmentAdmins((current) => current.map((item) => (
        item._id === updatedUser._id ? { ...item, ...updatedUser } : item
      )));
      setSuccess(data.message || `${adminUser.name} updated successfully.`);
    } catch (err) {
      setApprovalError(err.response?.data?.message || 'Unable to update DepartmentAdmin approval.');
    } finally {
      setApprovalId('');
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
        <button className="ghost-button" type="button" onClick={() => loadQueue()} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh queue'}
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

      {isSuperAdmin && (
        <section className="workbench-panel approval-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SuperAdmin approvals</span>
              <h2>DepartmentAdmin accounts</h2>
              <p>Approve verified department workers or revoke access when an account should no longer operate the queue.</p>
            </div>
            <button className="ghost-button" type="button" onClick={loadDepartmentAdmins} disabled={isLoadingAdmins}>
              {isLoadingAdmins ? 'Loading...' : 'Refresh approvals'}
            </button>
          </div>

          {approvalError && (
            <ErrorState
              title="DepartmentAdmin approvals could not load."
              message={approvalError}
              onRetry={loadDepartmentAdmins}
              actionLabel="Retry approvals"
            />
          )}

          {isLoadingAdmins && (
            <LoadingState
              title="Loading DepartmentAdmin accounts..."
              message="Checking pending and approved department workers."
            />
          )}

          {!isLoadingAdmins && !approvalError && departmentAdmins.length === 0 && (
            <EmptyState
              title="No DepartmentAdmin accounts yet."
              message="New department registrations will appear here for SuperAdmin review."
            />
          )}

          {!isLoadingAdmins && !approvalError && departmentAdmins.length > 0 && (
            <div className="approval-list">
              {departmentAdmins.map((adminUser) => (
                <article className="approval-item" key={adminUser._id}>
                  <div>
                    <div className="approval-title">
                      <strong>{adminUser.name}</strong>
                      <span className={adminUser.isApproved ? 'approval-chip approved' : 'approval-chip pending'}>
                        {adminUser.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <p>{adminUser.email}</p>
                    <div className="approval-meta">
                      <span>{adminUser.departmentAssigned}</span>
                      <span>{formatAdminDate(adminUser.createdAt)}</span>
                    </div>
                  </div>

                  <div className="approval-actions">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => handleApprovalUpdate(adminUser, true)}
                      disabled={approvalId === adminUser._id || adminUser.isApproved}
                    >
                      <UserCheck size={16} />
                      Approve
                    </button>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => handleApprovalUpdate(adminUser, false)}
                      disabled={approvalId === adminUser._id || !adminUser.isApproved}
                    >
                      <UserX size={16} />
                      Revoke
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {actionError && <div className="form-error">{actionError}</div>}
      {success && <div className="form-success">{success}</div>}

      <div className="admin-queue-layout">
        <section className="workbench-panel admin-list-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Queue</span>
              <h2>Complaints to review</h2>
            </div>
          </div>

          {queueError && (
            <ErrorState
              title="Admin queue could not load."
              message={queueError}
              onRetry={() => loadQueue()}
              actionLabel="Retry queue"
            />
          )}

          {isLoading && (
            <LoadingState
              title="Loading admin queue..."
              message="Fetching scoped complaints and selecting the next issue."
            />
          )}

          {!isLoading && !queueError && complaints.length === 0 && (
            <EmptyState
              title="No complaints in this queue."
              message="New department issues will appear here when citizens submit reports."
            />
          )}

          {!queueError && (
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
          )}
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
