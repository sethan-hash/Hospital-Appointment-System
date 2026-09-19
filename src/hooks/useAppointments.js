import { usePatient } from '../context/PatientContext';

export function useAppointments() {
  const {
    upcomingAppointment,
    allAppointments,
    bookNewAppointment,
    rescheduleAppointment,
    cancelAppointment,
    loading,
    refreshData,
  } = usePatient();

  return {
    upcomingAppointment,
    allAppointments,
    bookNewAppointment,
    rescheduleAppointment,
    cancelAppointment,
    loading,
    refreshData,
  };
}
