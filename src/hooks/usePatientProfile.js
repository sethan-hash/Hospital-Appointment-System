import { usePatient } from '../context/PatientContext';

export function usePatientProfile() {
  const { profile, pastVisits, loading, refreshData } = usePatient();

  return {
    profile,
    pastVisits,
    loading,
    refreshData,
  };
}
