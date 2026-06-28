const statusClassNames = {
  Submitted: 'status-submitted',
  'In Review': 'status-review',
  Assigned: 'status-assigned',
  'In Progress': 'status-progress',
  Resolved: 'status-resolved',
  Reopened: 'status-reopened',
  Rejected: 'status-rejected'
};

export const StatusBadge = ({ status }) => {
  return (
    <span className={`status-badge ${statusClassNames[status] || 'status-submitted'}`}>
      {status || 'Submitted'}
    </span>
  );
};

export const SeverityBadge = ({ severity }) => {
  return (
    <span className={`severity-badge severity-${severity || 1}`}>
      Severity {severity || 1}
    </span>
  );
};
