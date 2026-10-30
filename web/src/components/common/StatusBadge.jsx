import React from 'react';
import { AppColors } from '../../constants/appColors';

export function StatusBadge({ status, compact = false }) {
  const code = (status || 'CREATED').toUpperCase();
  const color = AppColors.forStatus(code);

  const getLabel = () => {
    switch (code) {
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'READY_FOR_ANALYSIS':
        return 'Ready For AI';
      case 'ANALYZED':
        return 'Analyzed';
      case 'COMPLETED':
        return 'Completed';
      case 'EXPIRED':
        return 'Expired';
      case 'CANCELLED':
        return 'Cancelled';
      case 'HELD':
        return 'On Hold';
      case 'CREATED':
      default:
        return 'Created';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-md border ${
        compact ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-xs'
      }`}
      style={{
        color: color,
        backgroundColor: `${color}14`,
        borderColor: `${color}33`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {getLabel()}
    </span>
  );
}
