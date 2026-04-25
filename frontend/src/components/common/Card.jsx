import React from 'react';

const Card = ({ children, className = '', padding = 'md', ...props }) => {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  return (
    <div 
      className={`bg-white rounded-xl shadow-soft border border-slate-200 ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
