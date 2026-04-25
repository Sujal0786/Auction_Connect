import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';

const RankingTable = ({ rankings }) => {
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-slate-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-slate-400 font-semibold">{rank}</span>;
    }
  };
  
  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white';
      case 2:
        return 'bg-gradient-to-r from-slate-300 to-slate-400 text-white';
      case 3:
        return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };
  
  if (!rankings || rankings.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No rankings available yet
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {rankings.map((item, index) => (
        <div
          key={item.supplierId}
          className={`flex items-center justify-between p-4 rounded-xl border ${
            index === 0 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getRankBadge(index + 1)}`}>
              {getRankIcon(index + 1)}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{item.supplier?.name || 'Unknown'}</p>
              <p className="text-sm text-slate-500">{item.supplier?.companyName || ''}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">
              ${item.lowestAmount?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-slate-500">Lowest bid</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RankingTable;
