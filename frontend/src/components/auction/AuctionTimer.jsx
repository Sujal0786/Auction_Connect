import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

const AuctionTimer = ({ closeTime, isExtended = false }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const close = new Date(closeTime).getTime();
      const difference = close - now;
      
      if (difference <= 0) {
        return 'Closed';
      }
      
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      
      setIsUrgent(difference < 10 * 60 * 1000); // Less than 10 minutes
      
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
      }
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      
      return `${minutes}m ${seconds}s`;
    };
    
    setTimeLeft(calculateTimeLeft());
    
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [closeTime]);
  
  return (
    <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
      timeLeft === 'Closed' 
        ? 'bg-slate-100 text-slate-600' 
        : isUrgent 
          ? 'bg-red-50 text-red-700' 
          : 'bg-primary-50 text-primary-700'
    }`}>
      {isUrgent && timeLeft !== 'Closed' && (
        <AlertTriangle className="w-4 h-4 animate-pulse" />
      )}
      <Clock className="w-4 h-4" />
      <span className="font-semibold">{timeLeft}</span>
      {isExtended && (
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full ml-2">
          Extended
        </span>
      )}
    </div>
  );
};

export default AuctionTimer;
