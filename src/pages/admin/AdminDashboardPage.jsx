import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { adminService } from '../../services/adminService';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { Badge } from '../../components/common/Badge';
import { StatCard } from '../../components/patient/StatCard';

function formatResourceName(type) {
  if (!type) return '';
  return type
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export function AdminDashboardPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchDashboard() {
      try {
        const data = await adminService.getDashboard();
        if (isMounted) {
          setDashboard(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load admin dashboard.');
          setLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getDashboard();
      setDashboard(data);
    } catch (err) {
      setError(err.message || 'Failed to load admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const stats = dashboard?.statistics;
  const recentAppointments = dashboard?.recentAppointments || [];
  const resources = dashboard?.resources || [];

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="h-16 border-b border-outline-variant/20 px-6 flex items-center justify-between bg-surface-container-lowest shadow-sm">
        <div className="flex items-center gap-2 text-primary font-bold text-lg">
          <Icon name="admin_panel_settings" filled={true} className="text-2xl" />
          <span>MedLink Care — Admin Portal</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Sign Out
        </Button>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 flex flex-col gap-8">
        {/* Welcome Card */}
        <div className="bg-surface-container-low rounded-2xl p-6 md:p-8 border border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-error-container text-on-error-container flex items-center justify-center font-bold text-xl shrink-0">
              <Icon name="shield" className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">
                Welcome, {currentUser?.fullName || currentUser?.name || dashboard?.admin?.fullName || 'Admin'}
              </h1>
              <p className="text-on-surface-variant font-label-md">
                Role: <span className="font-semibold text-error">{currentUser?.role || 'ADMIN'}</span> | {currentUser?.email || dashboard?.admin?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRetry} disabled={loading}>
              <Icon name="refresh" className={`text-base ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-body-md">Loading hospital statistics & system data...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-error-container/20 border border-error/30 rounded-2xl p-6 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-error/10 text-error flex items-center justify-center">
              <Icon name="error" className="text-2xl" />
            </div>
            <h3 className="text-lg font-bold text-on-surface">Unable to Load Dashboard</h3>
            <p className="text-on-surface-variant max-w-md">{error}</p>
            <Button variant="primary" size="sm" onClick={handleRetry}>
              Retry Connection
            </Button>
          </div>
        )}

        {/* Loaded Dashboard Content */}
        {!loading && !error && stats && (
          <>
            {/* Bento Statistics Grid */}
            <section>
              <h2 className="text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
                <Icon name="monitoring" className="text-primary" />
                <span>Hospital Metrics & Activity</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon="groups"
                  iconColor="primary"
                  value={String(stats.totalPatients)}
                  label="Registered Patients"
                />
                <StatCard
                  icon="medical_services"
                  iconColor="secondary"
                  value={String(stats.totalDoctors)}
                  label={`Doctors (${stats.activeDoctors} Active)`}
                />
                <StatCard
                  icon="today"
                  iconColor="tertiary"
                  value={String(stats.todayAppointments)}
                  label="Today's Appointments"
                />
                <StatCard
                  icon="calendar_month"
                  iconColor="primary"
                  value={String(stats.upcomingAppointments)}
                  label="Upcoming Scheduled"
                />
                <StatCard
                  icon="task_alt"
                  iconColor="secondary"
                  value={String(stats.completedAppointments)}
                  label="Completed Appointments"
                />
                <StatCard
                  icon="cancel"
                  iconColor="error"
                  value={String(stats.cancelledAppointments)}
                  label="Cancelled Appointments"
                />
                <StatCard
                  icon="payments"
                  iconColor="tertiary"
                  value={`₹${stats.billing?.paidRevenue?.toLocaleString('en-IN') || 0}`}
                  label={`Collected (${stats.billing?.paidCount || 0} Invoices)`}
                />
                <StatCard
                  icon="local_hospital"
                  iconColor="primary"
                  value={`${stats.resources?.available || 0} / ${stats.resources?.total || 0}`}
                  label={`Available Units (${stats.resources?.occupied || 0} Occupied)`}
                />
              </div>
            </section>

            {/* Split Grid: Recent Appointments & Hospital Resources */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Appointments */}
              <section className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/20 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
                    <Icon name="event_note" className="text-primary" />
                    <span>Recent Appointments</span>
                  </h3>
                  <span className="text-xs text-on-surface-variant font-medium">
                    Total: {stats.totalAppointments}
                  </span>
                </div>

                {recentAppointments.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 text-on-surface-variant">
                    <Icon name="event_busy" className="text-3xl mb-2 opacity-40" />
                    <p className="text-sm">No recent appointments recorded.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {recentAppointments.map((appt) => (
                      <div
                        key={appt.id}
                        className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/10 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-on-surface truncate">
                            {appt.patientName}
                          </p>
                          <p className="text-xs text-on-surface-variant truncate">
                            Dr. {appt.doctorName} • {appt.department}
                          </p>
                          <p className="text-[11px] text-on-surface-variant/80 mt-0.5">
                            {new Date(appt.appointmentDate).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}{' '}
                            at {appt.appointmentTime?.slice(0, 5)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            appt.status === 'COMPLETED'
                              ? 'completed'
                              : appt.status === 'SCHEDULED'
                              ? 'scheduled'
                              : appt.status === 'CANCELLED'
                              ? 'cancelled'
                              : 'pending'
                          }
                        >
                          {appt.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Hospital Resources & Infrastructure */}
              <section className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/20 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
                    <Icon name="inventory_2" className="text-primary" />
                    <span>Hospital Infrastructure</span>
                  </h3>
                  <span className="text-xs text-on-surface-variant font-medium">
                    {stats.resources?.available || 0} Ready
                  </span>
                </div>

                {resources.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 text-on-surface-variant">
                    <Icon name="inventory" className="text-3xl mb-2 opacity-40" />
                    <p className="text-sm">No hospital resources registered.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {resources.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/10 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-on-surface truncate">
                            {item.resourceCode}
                          </p>
                          <p className="text-on-surface-variant truncate">
                            {formatResourceName(item.resourceType)} • {item.locationWard}
                          </p>
                        </div>
                        <Badge
                          variant={
                            item.status === 'AVAILABLE'
                              ? 'completed'
                              : item.status === 'OCCUPIED'
                              ? 'cancelled'
                              : 'pending'
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
