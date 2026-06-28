import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Filter, ListFilter, Plus } from 'lucide-react';
import { ComplaintCard } from '../components/ComplaintCard.jsx';
import { getComplaints, getDepartmentComplaints } from '../services/complaintService.js';
import { useAuth } from '../hooks/useAuth.js';

const statuses = ['Submitted', 'In Review', 'Assigned', 'In Progress', 'Resolved', 'Reopened', 'Rejected'];
const categories = ['Roads', 'Electrical', 'Sanitation', 'Water', 'General', 'Pending_AI_Review'];
const severities = ['1', '2', '3', '4', '5'];

const initialFilters = {
  status: 'All',
  category: 'All',
  severity: 'All'
};

export const ComplaintList = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const isDepartmentScoped = user?.role === 'DepartmentAdmin';

  useEffect(() => {
    let isMounted = true;

    const loadComplaints = async () => {
      setIsLoading(true);
      setError('');

      try {
        const data = isDepartmentScoped
          ? await getDepartmentComplaints()
          : await getComplaints();

        if (isMounted) {
          setComplaints(data.complaints || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Unable to load complaints.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadComplaints();

    return () => {
      isMounted = false;
    };
  }, [isDepartmentScoped]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const matchesStatus = filters.status === 'All' || complaint.status === filters.status;
      const matchesCategory = filters.category === 'All' || complaint.category === filters.category;
      const matchesSeverity = filters.severity === 'All' || String(complaint.severityRating) === filters.severity;

      return matchesStatus && matchesCategory && matchesSeverity;
    });
  }, [complaints, filters]);

  const summary = useMemo(() => {
    const open = complaints.filter((complaint) => !['Resolved', 'Rejected'].includes(complaint.status)).length;
    const resolved = complaints.filter((complaint) => complaint.status === 'Resolved').length;
    const urgent = complaints.filter((complaint) => complaint.severityRating >= 4 || complaint.isEscalated).length;

    return {
      total: complaints.length,
      open,
      resolved,
      urgent
    };
  }, [complaints]);

  const updateFilter = (event) => {
    setFilters((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  return (
    <section className="page-surface">
      <div className="page-header complaints-header">
        <div>
          <span className="eyebrow">{isDepartmentScoped ? 'Department queue' : 'Complaint feed'}</span>
          <h1>{isDepartmentScoped ? `${user.departmentAssigned} complaints` : 'All civic complaints'}</h1>
          <p>
            {isDepartmentScoped
              ? 'Your queue is scoped to the department assigned by a SuperAdmin.'
              : 'Review submitted civic issues across the city and narrow the feed by status, category, or severity.'}
          </p>
        </div>
        {user?.role === 'Citizen' && (
          <Link className="action-button" to="/file">
            <Plus size={18} />
            File complaint
          </Link>
        )}
      </div>

      <div className="metric-grid four-up">
        <article className="metric-tile">
          <ListFilter size={22} />
          <span>Total loaded</span>
          <strong>{summary.total}</strong>
        </article>
        <article className="metric-tile">
          <AlertCircle size={22} />
          <span>Open</span>
          <strong>{summary.open}</strong>
        </article>
        <article className="metric-tile">
          <Filter size={22} />
          <span>Filtered</span>
          <strong>{filteredComplaints.length}</strong>
        </article>
        <article className="metric-tile">
          <AlertCircle size={22} />
          <span>Urgent</span>
          <strong>{summary.urgent}</strong>
        </article>
      </div>

      <section className="workbench-panel filter-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Filters</span>
            <h2>Refine the feed</h2>
          </div>
          <button className="ghost-button" type="button" onClick={resetFilters}>
            Reset filters
          </button>
        </div>

        <div className="filter-grid">
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" value={filters.status} onChange={updateFilter}>
              <option value="All">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={filters.category}
              onChange={updateFilter}
              disabled={isDepartmentScoped}
            >
              <option value="All">{isDepartmentScoped ? user.departmentAssigned : 'All categories'}</option>
              {!isDepartmentScoped && categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="severity">Severity</label>
            <select id="severity" name="severity" value={filters.severity} onChange={updateFilter}>
              <option value="All">All severities</option>
              {severities.map((severity) => (
                <option key={severity} value={severity}>Severity {severity}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {error && <div className="form-error">{error}</div>}
      {isLoading && <div className="empty-state">Loading complaints...</div>}

      {!isLoading && !error && filteredComplaints.length === 0 && (
        <div className="empty-state">
          <strong>No complaints match this view.</strong>
          <p>Try loosening a filter, or file a new complaint if there is an issue to report.</p>
        </div>
      )}

      <div className="complaints-feed">
        {filteredComplaints.map((complaint) => (
          <ComplaintCard key={complaint._id} complaint={complaint} />
        ))}
      </div>
    </section>
  );
};
