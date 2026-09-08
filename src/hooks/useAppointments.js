import { usePatient } from '../context/PatientContext';

export function useAppointments() {
  const {
    upcomingAppointment,
    allAppointments,
    bookNewAppointment,
    rescheduleAppointment,
    loading,
    refreshData,
  } = usePatient();

  return {
    upcomingAppointment,
    allAppointments,
    bookNewAppointment,
    rescheduleAppointment,
    loading,
    refreshData,
  };
}
