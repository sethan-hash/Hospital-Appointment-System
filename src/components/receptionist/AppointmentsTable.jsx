import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Icon } from '../common/Icon';
import { Select } from '../common/Select';
import { Input } from '../common/Input';

export function AppointmentsTable({
  appointments = [],
  doctors = [],
  selectedDoctorId = '',
  onSelectDoctor,
  selectedStatus = '',
  onSelectStatus,
  selectedDate = '',
  onChangeDate,
  loading = false,
  onReschedule,
  onCancel,
  onUpdateStatus,
}) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'SCHEDULED':
        return <Badge variant="scheduled" icon="schedule">Scheduled</Badge>;
      case 'COMPLETED':
        return <Badge variant="completed" icon="check_circle">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="cancelled" icon="cancel">Cancelled</Badge>;
      case 'NO_SHOW':
        return (
          <Badge variant="default" icon="person_off" className="bg-surface-container-high text-on-surface-variant font-semibold">
            No-Show
          </Badge>
        );
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getTypeBadge = (type) => {
    if (type === 'TELECONSULT') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary">
          <Icon name="videocam" className="text-[14px]" />
          Teleconsult
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-primary-container/30 text-primary">
        <Icon name="local_hospital" className="text-[14px]" />
        In-Person
      </span>
    );
  };

  return (
    <Card className="p-6 border border-outline-variant/30 space-y-5">
      {/* Header and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface flex items-center gap-2">
            <Icon name="calendar_month" className="text-primary text-2xl" />
            Today's Appointments Queue
          </h2>
          <p className="text-on-surface-variant text-body-sm">
            Live patient arrivals, appointment check-ins, and schedule changes.
          </p>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="w-full sm:w-40">
            <Input
              id="filter-date"
              type="date"
              value={selectedDate}
              onChange={(e) => onChangeDate(e.target.value)}
              className="h-10 text-xs"
            />
          </div>

          <div className="w-full sm:w-48">
            <Select
              id="filter-doctor"
              value={selectedDoctorId}
              onChange={(e) => onSelectDoctor(e.target.value)}
              placeholder="All Doctors"
              options={[
                { value: '', label: 'All Doctors' },
                ...doctors.map((d) => ({
                  value: String(d.id),
                  label: d.name,
                })),
              ]}
              className="h-10 text-xs"
            />
          </div>

          <div className="w-full sm:w-44">
            <Select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => onSelectStatus(e.target.value)}
              placeholder="All Statuses"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'SCHEDULED', label: 'Scheduled' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
                { value: 'NO_SHOW', label: 'No-Show' },
              ]}
              className="h-10 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
          <Icon name="progress_activity" className="animate-spin text-3xl text-primary" />
          <p className="text-body-sm text-on-surface-variant">Loading appointments queue…</p>
        </div>
      ) : appointments.length === 0 ? (
        /* Empty state */
        <div className="py-16 text-center bg-surface-container-low/50 rounded-xl border border-dashed border-outline-variant/50">
          <Icon name="event_busy" className="text-4xl text-on-surface-variant/60 mb-2" />
          <p className="font-medium text-on-surface">No appointments found</p>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto mt-1">
            There are no appointments matching the selected filters for this date.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 text-xs font-semibold text-on-surface-variant uppercase tracking-wider bg-surface-container-low/50">
                  <th className="py-3 px-4">Time &amp; Date</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 text-body-sm">
                {appointments.map((apt) => {
                  const isScheduled = apt.status === 'SCHEDULED';
                  return (
                    <tr
                      key={apt.id}
                      className="hover:bg-surface-container-low/30 transition-colors"
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-semibold text-on-surface flex items-center gap-1.5">
                          <Icon name="schedule" className="text-primary text-[18px]" />
                          {apt.time}
                        </p>
                        <p className="text-xs text-on-surface-variant ml-6">
                          {apt.date}
                        </p>
                      </td>

                      {/* Patient & Phone */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-on-surface">
                          {apt.patientName || 'Unnamed Patient'}
                        </p>
                        <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                          <Icon name="call" className="text-[13px]" />
                          {apt.patientPhone || 'No Phone'}
                        </p>
                      </td>

                      {/* Doctor & Department */}
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-on-surface">
                          {apt.doctorName || 'Doctor'}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {apt.doctorDepartment || apt.doctorSpecialization || 'General'}
                        </p>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getTypeBadge(apt.type)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(apt.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isScheduled && (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => onUpdateStatus(apt, 'COMPLETED')}
                                iconLeading="check"
                                title="Mark Completed / Checked In"
                                className="text-xs py-1 px-2.5"
                              >
                                Check In
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onReschedule(apt)}
                                iconLeading="edit_calendar"
                                title="Reschedule"
                                className="text-xs py-1 px-2.5"
                              >
                                Reschedule
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onCancel(apt)}
                                title="Cancel Appointment"
                                className="text-xs py-1 px-2 text-error hover:bg-error-container/20 border-error/30"
                              >
                                Cancel
                              </Button>
                            </>
                          )}

                          {!isScheduled && (
                            <span className="text-xs text-on-surface-variant/70 italic px-2">
                              No actions
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {appointments.map((apt) => {
              const isScheduled = apt.status === 'SCHEDULED';
              return (
                <div
                  key={apt.id}
                  className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-primary font-semibold text-body-md">
                        <Icon name="schedule" className="text-[18px]" />
                        <span>{apt.time}</span>
                        <span className="text-xs font-normal text-on-surface-variant">({apt.date})</span>
                      </div>
                      <h3 className="font-semibold text-on-surface text-body-lg mt-1">
                        {apt.patientName}
                      </h3>
                      <p className="text-xs text-on-surface-variant flex items-center gap-1">
                        <Icon name="call" className="text-[14px]" />
                        {apt.patientPhone || 'No Phone'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {getStatusBadge(apt.status)}
                      {getTypeBadge(apt.type)}
                    </div>
                  </div>

                  <div className="text-xs text-on-surface-variant border-t border-outline-variant/10 pt-2">
                    <span>Doctor: </span>
                    <strong className="text-on-surface font-medium">{apt.doctorName}</strong>
                    <span> ({apt.doctorDepartment || apt.doctorSpecialization})</span>
                  </div>

                  {isScheduled && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onUpdateStatus(apt, 'COMPLETED')}
                        iconLeading="check"
                      >
                        Check In
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onReschedule(apt)}
                        iconLeading="edit_calendar"
                      >
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCancel(apt)}
                        className="text-error border-error/30"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
