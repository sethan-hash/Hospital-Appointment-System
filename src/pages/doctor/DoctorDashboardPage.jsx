import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { doctorService } from '../../services/doctorService';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { StatCard } from '../../components/patient/StatCard';
import { Badge } from '../../components/common/Badge';
import { DoctorAppointmentDetailModal } from '../../components/doctor/DoctorAppointmentDetailModal';
import { DoctorProfileModal } from '../../components/doctor/DoctorProfileModal';
import { DoctorScheduleModal } from '../../components/doctor/DoctorScheduleModal';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Formats "HH:MM" → "9:30 AM" */
function formatTime(t) {
  if (!t) return '';
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Maps appointment status to Badge variant */
const STATUS_VARIANT = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'pending',
};

const STATUS_LABEL = {
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};

/** Maps doctor availability to Badge variant */
const AVAIL_VARIANT = {
  true: 'completed',
  false: 'cancelled',
};

// ─── Appointment Row ─────────────────────────────────────────────────────────

function AppointmentRow({ appt, onSelect }) {
  const typeIcon = appt.type === 'TELECONSULTATION' ? 'videocam' : 'local_hospital';
  const typeLabel = appt.type === 'TELECONSULTATION' ? 'Tele' : 'In-Person';

  return (
    <div
      onClick={() => onSelect(appt.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(appt.id);
        }
      }}
      className="flex items-center gap-4 p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/10 hover:bg-surface-container transition-colors cursor-pointer group"
    >
      {/* Time */}
      <div className="w-16 shrink-0 text-center">
        <p className="font-label-lg text-primary font-semibold text-sm">
          {formatTime(appt.appointmentTime)}
        </p>
      </div>

      {/* Patient */}
      <div className="flex-1 min-w-0">
        <p className="font-body-md text-on-surface font-medium truncate group-hover:text-primary transition-colors">
          {appt.patientName}
        </p>
        {appt.reasonForVisit && (
          <p className="font-label-sm text-on-surface-variant text-xs truncate">{appt.reasonForVisit}</p>
        )}
      </div>

      {/* Type */}
      <div className="hidden sm:flex items-center gap-1 text-on-surface-variant text-xs">
        <Icon name={typeIcon} className="text-sm" />
        <span>{typeLabel}</span>
      </div>

      {/* Status */}
      <Badge variant={STATUS_VARIANT[appt.status] || 'info'}>
        {STATUS_LABEL[appt.status] || appt.status}
      </Badge>

      {/* Detail cue */}
      <div className="text-on-surface-variant opacity-50 group-hover:opacity-100 group-hover:text-primary transition-opacity">
        <Icon name="chevron_right" className="text-xl" />
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function DoctorDashboardPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await doctorService.getDashboard();
      if (!data) {
        setError('Doctor profile not found for this account.');
      } else {
        setDashboard(data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWeeklySchedule = useCallback(async () => {
    try {
      const schedule = await doctorService.getSchedule();
      setWeeklySchedule(schedule || []);
    } catch {
      // Graceful fallback
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadWeeklySchedule();
  }, [loadDashboard, loadWeeklySchedule]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const doctor = dashboard?.doctor;
  const stats = dashboard?.statistics;
  const todayAppointments = dashboard?.todayAppointments || [];

  // Get first letter for avatar initials
  const initials = doctor?.name
    ? doctor.name
        .split(' ')
        .filter((w) => w.length > 0)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
    : 'Dr';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-outline-variant/20 px-6 flex items-center justify-between bg-surface-container-lowest shadow-sm">
        <div className="flex items-center gap-2 text-primary font-bold text-lg">
          <Icon name="local_hospital" filled={true} className="text-2xl" />
          <span>MedLink Care — Doctor Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            iconLeading="edit"
            onClick={() => setIsProfileModalOpen(true)}
          >
            My Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            iconLeading="schedule"
            onClick={() => setIsScheduleModalOpen(true)}
          >
            Schedule
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 flex flex-col gap-6">
        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Icon name="progress_activity" className="text-4xl text-primary animate-spin" />
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="bg-error-container text-on-error-container rounded-2xl p-6 flex flex-col items-center gap-3">
            <Icon name="error_outline" className="text-4xl" />
            <p className="font-body-md">{error}</p>
            <Button variant="outline" size="sm" onClick={loadDashboard}>
              Retry
            </Button>
          </div>
        )}

        {/* ── Dashboard content ── */}
        {!loading && !error && dashboard && (
          <>
            {/* Doctor Profile Card */}
            <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex items-center gap-5 min-w-0">
                <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xl shrink-0 select-none">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-on-surface truncate">
                      Welcome, {doctor.name}
                    </h1>
                    {doctor.isAvailable ? (
                      <Badge variant={AVAIL_VARIANT.true}>Available</Badge>
                    ) : (
                      <Badge variant={AVAIL_VARIANT.false}>Unavailable</Badge>
                    )}
                  </div>
                  <p className="text-on-surface-variant text-sm mt-0.5">
                    {doctor.specialization} · {doctor.department} Dept. · {doctor.hospitalName}
                  </p>
                  <p className="text-on-surface-variant text-xs mt-0.5">
                    {doctor.qualification} · {doctor.experienceYears}+ Years Experience
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  iconLeading="edit"
                  onClick={() => setIsProfileModalOpen(true)}
                >
                  Edit Profile
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  iconLeading="schedule"
                  onClick={() => setIsScheduleModalOpen(true)}
                >
                  Manage Schedule
                </Button>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                icon="today"
                iconColor="primary"
                value={String(stats.todayCount)}
                label="Today's Appointments"
              />
              <StatCard
                icon="check_circle"
                iconColor="secondary"
                value={String(stats.completedToday)}
                label="Completed Today"
              />
              <StatCard
                icon="schedule"
                iconColor="tertiary"
                value={String(stats.upcomingTotal)}
                label="Upcoming Scheduled"
              />
              <StatCard
                icon="group"
                iconColor="error"
                value={String(stats.totalPatients)}
                label="Total Patients"
              />
            </div>

            {/* Today's Appointments */}
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/30 overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-outline-variant/20">
                <Icon name="event_note" className="text-primary" />
                <h2 className="font-title-md font-semibold text-on-surface">
                  Today&apos;s Schedule
                </h2>
                <span className="ml-auto text-xs text-on-surface-variant">
                  {todayAppointments.length === 0
                    ? 'No appointments today'
                    : `${todayAppointments.length} appointment${todayAppointments.length !== 1 ? 's' : ''}`}
                </span>
              </div>

              <div className="p-4 flex flex-col gap-3">
                {todayAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-on-surface-variant">
                    <Icon name="calendar_today" className="text-4xl opacity-40" />
                    <p className="text-sm">No appointments scheduled for today.</p>
                  </div>
                ) : (
                  todayAppointments.map((appt) => (
                    <AppointmentRow
                      key={appt.id}
                      appt={appt}
                      onSelect={(id) => setSelectedAppointmentId(id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Office Hours & Weekly Schedule Overview Card */}
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/30 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <Icon name="calendar_month" className="text-primary" />
                  <h2 className="font-title-md font-semibold text-on-surface">
                    Office Hours & Weekly Schedule
                  </h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  iconLeading="tune"
                  onClick={() => setIsScheduleModalOpen(true)}
                >
                  Configure Hours
                </Button>
              </div>

              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {weeklySchedule.map((item) => (
                  <div
                    key={item.dayOfWeek}
                    className={`p-3 rounded-xl border flex flex-col gap-1 transition-colors ${
                      item.isActive
                        ? 'bg-surface-container-lowest border-outline-variant/30 shadow-xs'
                        : 'bg-surface border-transparent opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-label-md font-semibold text-on-surface text-xs">
                        {item.day}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.isActive ? 'bg-[#2e7d32]' : 'bg-outline-variant'
                        }`}
                      />
                    </div>
                    <span className="font-body-sm text-xs text-on-surface-variant font-medium">
                      {item.isActive ? item.hours : 'Day Off'}
                    </span>
                    {item.isActive && item.slotDurationMinutes && (
                      <span className="text-[10px] text-outline font-medium">
                        {item.slotDurationMinutes}m slots
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Appointment & Patient Details Modal */}
            <DoctorAppointmentDetailModal
              appointmentId={selectedAppointmentId}
              isOpen={Boolean(selectedAppointmentId)}
              onClose={() => setSelectedAppointmentId(null)}
            />

            {/* Doctor Profile Modal */}
            <DoctorProfileModal
              isOpen={isProfileModalOpen}
              onClose={() => setIsProfileModalOpen(false)}
              onProfileUpdated={loadDashboard}
            />

            {/* Doctor Schedule Modal */}
            <DoctorScheduleModal
              isOpen={isScheduleModalOpen}
              onClose={() => setIsScheduleModalOpen(false)}
              onScheduleUpdated={(newSchedule) => {
                setWeeklySchedule(newSchedule);
                loadDashboard();
              }}
            />
          </>
        )}
      </main>
    </div>
  );
}
