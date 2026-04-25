import React from 'react';

const StatusBadge = ({ status }) => {
  const statusConfig = {
    DRAFT: { color: 'bg-slate-100 text-slate-800', label: 'Draft' },
    UPCOMING: { color: 'bg-yellow-100 text-yellow-800', label: 'Upcoming' },
    ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Active' },
    CLOSED: { color: 'bg-slate-100 text-slate-800', label: 'Closed' },
    FORCE_CLOSED: { color: 'bg-red-100 text-red-800', label: 'Force Closed' },
    CANCELLED: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
  };
  
  const config = statusConfig[status] || statusConfig.DRAFT;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {config.label}
    </span>
  );
};

export default StatusBadge;
