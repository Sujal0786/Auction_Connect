import React from 'react';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

const PriceCard = ({ 
  label, 
  amount, 
  change, 
  changeType = 'neutral',
  icon: Icon,
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-xl shadow-soft border border-slate-200 p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary-600" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-slate-600">{label}</p>
            <p className="text-2xl font-bold text-slate-900">${amount?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      </div>
      {change && (
        <div className={`flex items-center text-sm ${
          changeType === 'positive' ? 'text-green-600' : 
          changeType === 'negative' ? 'text-red-600' : 
          'text-slate-600'
        }`}>
          {changeType === 'positive' && <TrendingDown className="w-4 h-4 mr-1" />}
          {changeType === 'negative' && <TrendingUp className="w-4 h-4 mr-1" />}
          <span>{change}</span>
        </div>
      )}
    </div>
  );
};

export default PriceCard;
