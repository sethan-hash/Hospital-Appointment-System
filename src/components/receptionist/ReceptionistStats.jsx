import React from 'react';
import { Card } from '../common/Card';
import { Icon } from '../common/Icon';

export function ReceptionistStats({
  scheduledCount = 0,
  completedCount = 0,
  remainingCount = 0,
  loading = false,
}) {
  const statItems = [
    {
      id: 'scheduled',
      label: "Today's Scheduled",
      value: scheduledCount,
      icon: 'calendar_today',
      colorBg: 'bg-primary-container text-on-primary-container',
      iconBg: 'bg-primary text-on-primary',
    },
    {
      id: 'completed',
      label: 'Completed',
      value: completedCount,
      icon: 'check_circle',
      colorBg: 'bg-[#e8f5e9] text-[#2e7d32]',
      iconBg: 'bg-[#2e7d32] text-white',
    },
    {
      id: 'remaining',
      label: 'Remaining',
      value: remainingCount,
      icon: 'pending_actions',
      colorBg: 'bg-[#fff3e0] text-[#e65100]',
      iconBg: 'bg-[#f57c00] text-white',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {statItems.map((item) => (
        <Card
          key={item.id}
          className="p-5 flex items-center justify-between border border-outline-variant/30 relative overflow-hidden"
        >
          <div className="space-y-1">
            <p className="text-on-surface-variant font-label-md text-label-md">
              {item.label}
            </p>
            {loading ? (
              <div className="h-8 w-16 bg-surface-container-high animate-pulse rounded" />
            ) : (
              <p className="font-headline-md text-headline-md font-bold text-on-surface">
                {item.value}
              </p>
            )}
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.colorBg}`}
          >
            <Icon name={item.icon} className="text-2xl" />
          </div>
        </Card>
      ))}
    </div>
  );
}
