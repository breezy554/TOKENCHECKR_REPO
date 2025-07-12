import React from 'react';

export default function ScoreBar({ score }) {
  const getColor = () => {
    if (score <= 30) return 'bg-green-500';
    if (score <= 70) return 'bg-yellow-400';
    return 'bg-red-500';
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-sm font-medium mb-1">Risk Score: {score}/100</div>
      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className={`h-full ${getColor()}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>0 (Safe)</span>
        <span>50</span>
        <span>100 (Danger)</span>
      </div>
    </div>
  );
}
