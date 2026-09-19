import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Icon } from '../common/Icon';
import { getAppointmentDateParts } from '../../utils/dateUtils';

/**
 * Upcoming Appointment Bento Card Component
 * Replicates the Stitch Dashboard appointment card with decorative blob, calendar date badge, doctor details, and action buttons.
 */
export function AppointmentCard({ appointment, onRescheduleClick, onCancelClick }) {
  if (!appointment) return null;

  const dateParts = getAppointmentDateParts(appointment.date);

  return (
    <Card className="p-lg relative overflow-hidden group hover:shadow-card-hover transition-all duration-300">
      {/* Decorative background glow from Stitch */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary-container/20 rounded-full blur-3xl group-hover:bg-primary-container/30 transition-colors duration-500 pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md relative z-10">
        <div className="flex gap-md items-start">
          {/* Calendar Date Block */}
          <div className="bg-primary-container/10 p-3 rounded-lg text-primary flex flex-col items-center justify-center min-w-[70px] border border-primary-container/20">
            <span className="font-label-md text-label-md uppercase tracking-wider font-semibold">
              {dateParts.month}
            </span>
            <span className="font-headline-md text-headline-md font-bold leading-none mt-1">
              {dateParts.day}
            </span>
          </div>

          {/* Details */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={appointment.status.toLowerCase()}>
                {appointment.status}
              </Badge>
              <span className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 font-medium">
                <Icon name="schedule" className="text-[16px]" /> {appointment.time}
              </span>
            </div>

            <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              {appointment.doctorName}
            </h4>
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-1">
              <Icon name="stethoscope" className="text-[16px]" /> {appointment.department}
            </p>
            {appointment.location && (
              <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5 text-xs">
                <Icon name="location_on" className="text-[14px] text-primary" /> {appointment.location}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 md:w-auto w-full mt-4 md:mt-0">
          {onCancelClick && (
            <Button
              variant="outline"
              size="md"
              iconLeading="cancel"
              onClick={onCancelClick}
              className="px-4 py-3 min-h-[52px] text-error hover:bg-error-container/20 hover:border-error/50"
            >
              Cancel
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            iconLeading="calendar_today"
            onClick={onRescheduleClick}
            className="px-6 py-3 min-h-[52px]"
          >
            Reschedule
          </Button>
        </div>
      </div>
    </Card>
  );
}
