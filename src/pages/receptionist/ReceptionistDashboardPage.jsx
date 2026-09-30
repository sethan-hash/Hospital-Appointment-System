import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { receptionistService } from '../../services/receptionistService';
import { ReceptionistStats } from '../../components/receptionist/ReceptionistStats';
import { AppointmentsTable } from '../../components/receptionist/AppointmentsTable';
import { PatientSearchSection } from '../../components/receptionist/PatientSearchSection';
import { WalkInModal } from '../../components/receptionist/WalkInModal';
import { BookAppointmentModal } from '../../components/receptionist/BookAppointmentModal';
import { RescheduleModal } from '../../components/receptionist/RescheduleModal';
import { CancelModal } from '../../components/receptionist/CancelModal';
import { PaymentCollectionModal } from '../../components/receptionist/PaymentCollectionModal';

export function ReceptionistDashboardPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Dashboard Filters & State
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'patients'

  // Data State
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [statsData, setStatsData] = useState({ scheduled: 0, completed: 0, remaining: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  // Notifications
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: string }

  // Modal States
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookingPatient, setBookingPatient] = useState(null);

  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  // Payment collection modal state
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalLoading, setPaymentModalLoading] = useState(false);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 5000);
  };

  // Fetch doctors for filter & selection
  useEffect(() => {
    receptionistService
      .getDoctors()
      .then((docs) => setDoctors(docs))
      .catch((err) => console.error('Error fetching doctors:', err));
  }, []);

  // Fetch today's summary stats independently
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const todayAppointments = await receptionistService.getAppointments({ date: todayStr });
      const scheduled = todayAppointments.filter((a) => a.status === 'SCHEDULED').length;
      const completed = todayAppointments.filter((a) => a.status === 'COMPLETED').length;
      const remaining = scheduled; // Scheduled appointments yet to be completed

      setStatsData({
        scheduled,
        completed,
        remaining,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [todayStr]);

  // Fetch filtered appointments queue
  const loadAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    try {
      const data = await receptionistService.getAppointments({
        date: selectedDate,
        doctorId: selectedDoctorId,
        status: selectedStatus,
      });
      setAppointments(data);
    } catch (err) {
      console.error('Error loading appointments:', err);
      showNotification(err.message || 'Failed to load appointments.', 'error');
    } finally {
      setLoadingAppointments(false);
    }
  }, [selectedDate, selectedDoctorId, selectedStatus]);

  // Load initial data and on filter change
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Handlers for appointment status changes
  const handleUpdateStatus = async (appointment, newStatus) => {
    try {
      await receptionistService.updateStatus(appointment.id, newStatus);
      showNotification(
        `Appointment for ${appointment.patientName} marked as ${newStatus}.`
      );
      loadAppointments();
      loadStats();
    } catch (err) {
      showNotification(err.message || 'Failed to update appointment status.', 'error');
    }
  };

  // Walk-in registration success
  const handleWalkInSuccess = (patient, { bookImmediately }) => {
    showNotification(`Patient ${patient.fullName} successfully registered!`);
    if (bookImmediately) {
      setBookingPatient(patient);
      setIsBookModalOpen(true);
    }
  };

  // Appointment booking success
  const handleBookingSuccess = (newAppointment) => {
    showNotification(
      `Appointment successfully booked for ${newAppointment.patientName || 'patient'}!`
    );
    loadAppointments();
    loadStats();
  };

  // Reschedule success
  const handleRescheduleSuccess = (updated) => {
    showNotification(
      `Appointment rescheduled to ${updated.date || updated.appointmentDate} at ${updated.time}.`
    );
    loadAppointments();
    loadStats();
  };

  // Cancel success
  const handleCancelSuccess = () => {
    showNotification('Appointment has been cancelled successfully.');
    loadAppointments();
    loadStats();
  };

  // Trigger booking for a patient found in lookup
  const handleBookForPatient = (patient) => {
    setBookingPatient(patient);
    setIsBookModalOpen(true);
  };

  // Open payment collection modal
  const handleCollectPayment = (appointment) => {
    setPaymentTarget(appointment);
    setIsPaymentModalOpen(true);
  };

  // Confirm payment collection
  const handlePaymentConfirm = async ({ invoiceId, paymentStatus, paymentMethod }) => {
    setPaymentModalLoading(true);
    try {
      await receptionistService.updatePayment(invoiceId, { paymentStatus, paymentMethod });
      showNotification(
        `Payment ${paymentStatus === 'PAID' ? 'collected' : 'reset to pending'} successfully.`
      );
      setIsPaymentModalOpen(false);
      setPaymentTarget(null);
      loadAppointments();
    } catch (err) {
      showNotification(err.message || 'Failed to update payment.', 'error');
    } finally {
      setPaymentModalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-outline-variant/20 px-4 md:px-8 flex items-center justify-between bg-surface-container-lowest shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Icon name="local_hospital" filled={true} className="text-2xl" />
          </div>
          <div>
            <h1 className="font-bold text-on-surface text-base md:text-lg leading-tight">
              MedLink Care
            </h1>
            <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
              Receptionist Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-body-sm font-semibold text-on-surface">
              {currentUser?.fullName || currentUser?.name || 'Receptionist'}
            </span>
            <span className="text-[11px] text-on-surface-variant">
              {currentUser?.email}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            iconLeading="logout"
            className="text-xs"
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Banner Alert Notification */}
        {notification && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between border animate-entrance ${
              notification.type === 'error'
                ? 'bg-error-container/20 border-error/30 text-error'
                : 'bg-secondary-container/30 border-secondary/30 text-on-surface'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon
                name={notification.type === 'error' ? 'error' : 'check_circle'}
                className="text-xl flex-shrink-0"
              />
              <span className="text-body-sm font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-on-surface-variant hover:text-on-surface p-1"
            >
              <Icon name="close" className="text-lg" />
            </button>
          </div>
        )}

        {/* Dashboard Title & Primary Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-on-surface">
              Reception Operations
            </h2>
            <p className="text-on-surface-variant text-body-sm">
              Manage patient walk-ins, schedule appointments, and coordinate daily visits.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              iconLeading="person_add"
              onClick={() => setIsWalkInOpen(true)}
              className="shadow-sm"
            >
              Walk-in Registration
            </Button>
            <Button
              variant="primary"
              iconLeading="add"
              onClick={() => {
                setBookingPatient(null);
                setIsBookModalOpen(true);
              }}
              className="shadow-sm"
            >
              Book Appointment
            </Button>
          </div>
        </div>

        {/* 1. Stats Row */}
        <ReceptionistStats
          scheduledCount={statsData.scheduled}
          completedCount={statsData.completed}
          remainingCount={statsData.remaining}
          loading={loadingStats}
        />

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-1">
          <button
            onClick={() => setActiveTab('queue')}
            className={`pb-2.5 px-4 font-semibold text-body-md border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'queue'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Icon name="calendar_today" className="text-lg" />
            Today's Appointments Queue
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`pb-2.5 px-4 font-semibold text-body-md border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'patients'
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Icon name="person_search" className="text-lg" />
            Patient Lookup &amp; Search
          </button>
        </div>

        {/* Tab 1: Today's Appointments Queue */}
        {activeTab === 'queue' && (
          <AppointmentsTable
            appointments={appointments}
            doctors={doctors}
            selectedDoctorId={selectedDoctorId}
            onSelectDoctor={setSelectedDoctorId}
            selectedStatus={selectedStatus}
            onSelectStatus={setSelectedStatus}
            selectedDate={selectedDate}
            onChangeDate={setSelectedDate}
            loading={loadingAppointments}
            onReschedule={(apt) => setRescheduleTarget(apt)}
            onCancel={(apt) => setCancelTarget(apt)}
            onUpdateStatus={handleUpdateStatus}
            onCollectPayment={handleCollectPayment}
          />
        )}

        {/* Tab 2: Patient Directory & Search */}
        {activeTab === 'patients' && (
          <PatientSearchSection onBookForPatient={handleBookForPatient} />
        )}
      </main>

      {/* Modals */}
      <WalkInModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
        onSuccess={handleWalkInSuccess}
      />

      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => {
          setIsBookModalOpen(false);
          setBookingPatient(null);
        }}
        initialPatient={bookingPatient}
        onSuccess={handleBookingSuccess}
      />

      <RescheduleModal
        isOpen={Boolean(rescheduleTarget)}
        appointment={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onSuccess={handleRescheduleSuccess}
      />

      <CancelModal
        isOpen={Boolean(cancelTarget)}
        appointment={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onSuccess={handleCancelSuccess}
      />

      <PaymentCollectionModal
        isOpen={isPaymentModalOpen}
        appointment={paymentTarget}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentTarget(null);
        }}
        onConfirm={handlePaymentConfirm}
        loading={paymentModalLoading}
      />
    </div>
  );
}
