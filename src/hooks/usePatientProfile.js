import { usePatient } from '../context/PatientContext';

export function usePatientProfile() {
  const { profile, pastVisits, loading, refreshData, updateProfile } = usePatient();

  return {
    profile,
    pastVisits,
    loading,
    refreshData,
    updateProfile,
  };
}
