import React from 'react';
import { Package, FileText, Users, AlertCircle } from 'lucide-react';

const EmptyState = ({ 
  icon = Package, 
  title = 'No data found', 
  description = 'There are no items to display at the moment.',
  action = null,
  className = ''
}) => {
  const Icon = icon;
  
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-sm mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
