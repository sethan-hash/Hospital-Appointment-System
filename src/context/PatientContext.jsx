import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { patientService } from '../services/patientService';
import { appointmentService } from '../services/appointmentService';
import { useAuth } from '../hooks/useAuth';

const PatientContext = createContext(null);

export function PatientProvider({ children }) {
  const { isAuthenticated, role } = useAuth();
  const [profile, setProfile] = useState(null);
  const [upcomingAppointment, setUpcomingAppointment] = useState(null);
  const [allAppointments, setAllAppointments] = useState([]);
  const [pastVisits, setPastVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    if (!isAuthenticated || role !== 'PATIENT') {
      setProfile(null);
      setUpcomingAppointment(null);
      setAllAppointments([]);
      setPastVisits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [fetchedProfile, fetchedUpcoming, fetchedAllApts, fetchedVisits] =
        await Promise.all([
          patientService.getProfile(),
          appointmentService.getUpcomingAppointment(),
          appointmentService.getAppointments(),
          patientService.getPastVisits(),
        ]);

      setProfile(fetchedProfile);
      setUpcomingAppointment(fetchedUpcoming);
      setAllAppointments(fetchedAllApts);
      setPastVisits(fetchedVisits);
    } catch (error) {
      console.error('Failed to load patient data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, role]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const updateProfile = async (updates) => {
    const updated = await patientService.updateProfile(updates);
    setProfile(updated);
    return updated;
  };

  const bookNewAppointment = async (appointmentData) => {
    const newApt = await appointmentService.bookAppointment(appointmentData);
    await refreshData();
    return newApt;
  };

  const rescheduleAppointment = async (id, newDate, newTime) => {
    const updated = await appointmentService.rescheduleAppointment(id, newDate, newTime);
    await refreshData();
    return updated;
  };

  return (
    <PatientContext.Provider
      value={{
        profile,
        upcomingAppointment,
        allAppointments,
        pastVisits,
        loading,
        refreshData,
        updateProfile,
        bookNewAppointment,
        rescheduleAppointment,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
}
