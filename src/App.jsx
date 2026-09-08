import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PatientProvider } from './context/PatientContext';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { PersonalInfoPage } from './pages/onboarding/PersonalInfoPage';
import { HealthProfilePage } from './pages/onboarding/HealthProfilePage';
import { RegistrationCompletePage } from './pages/onboarding/RegistrationCompletePage';
import { PatientDashboardPage } from './pages/patient/PatientDashboardPage';
import { FindDoctorPage } from './pages/patient/FindDoctorPage';
import { DoctorProfilePage } from './pages/patient/DoctorProfilePage';
import { BookAppointmentPage } from './pages/patient/BookAppointmentPage';
import { AppointmentConfirmationPage } from './pages/patient/AppointmentConfirmationPage';
import { UpcomingAppointmentsPage } from './pages/patient/UpcomingAppointmentsPage';
import { PastVisitsPage } from './pages/patient/PastVisitsPage';
import { PatientAccountProfilePage } from './pages/patient/PatientAccountProfilePage';

export function App() {
  return (
    <AuthProvider>
      <PatientProvider>
        <BrowserRouter>
          <Routes>
            {/* Root Redirect */}
            <Route path="/" element={<Navigate to="/patient/dashboard" replace />} />

            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Onboarding Flow Routes */}
            <Route path="/onboarding/personal-info" element={<PersonalInfoPage />} />
            <Route path="/onboarding/health-profile" element={<HealthProfilePage />} />
            <Route path="/onboarding/complete" element={<RegistrationCompletePage />} />

            {/* Patient Application Routes */}
            <Route path="/patient" element={<Navigate to="/patient/dashboard" replace />} />
            <Route path="/patient/dashboard" element={<PatientDashboardPage />} />
            <Route path="/patient/doctors" element={<FindDoctorPage />} />
            <Route path="/patient/doctors/:id" element={<DoctorProfilePage />} />
            <Route path="/patient/book/:doctorId" element={<BookAppointmentPage />} />
            <Route path="/patient/book" element={<Navigate to="/patient/doctors" replace />} />
            <Route path="/patient/appointments" element={<UpcomingAppointmentsPage />} />
            <Route
              path="/patient/appointments/confirmation"
              element={<AppointmentConfirmationPage />}
            />
            <Route path="/patient/visits" element={<PastVisitsPage />} />
            <Route path="/patient/records" element={<Navigate to="/patient/visits" replace />} />
            <Route path="/patient/profile" element={<PatientAccountProfilePage />} />

            {/* Catch-all 404 Route */}
            <Route path="*" element={<Navigate to="/patient/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </PatientProvider>
    </AuthProvider>
  );
}

export default App;
