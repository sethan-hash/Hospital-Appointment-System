import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PatientProvider } from './context/PatientContext';

// Route Guards
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { RoleRoute } from './components/common/RoleRoute';

// Auth & Onboarding Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { PersonalInfoPage } from './pages/onboarding/PersonalInfoPage';
import { HealthProfilePage } from './pages/onboarding/HealthProfilePage';
import { RegistrationCompletePage } from './pages/onboarding/RegistrationCompletePage';

// Role Dashboard Pages
import { DoctorDashboardPage } from './pages/doctor/DoctorDashboardPage';
import { ReceptionistDashboardPage } from './pages/receptionist/ReceptionistDashboardPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminBillingPage } from './pages/admin/AdminBillingPage';
import { AdminResourcesPage } from './pages/admin/AdminResourcesPage';

// Patient Application Pages
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
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Onboarding Flow Routes */}
            <Route path="/onboarding/personal-info" element={<PersonalInfoPage />} />
            <Route path="/onboarding/health-profile" element={<HealthProfilePage />} />
            <Route path="/onboarding/complete" element={<RegistrationCompletePage />} />

            {/* Doctor Routes (Role Protected) */}
            <Route
              path="/doctor/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['DOCTOR']}>
                    <DoctorDashboardPage />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            {/* Receptionist Routes (Role Protected) */}
            <Route
              path="/receptionist/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['RECEPTIONIST']}>
                    <ReceptionistDashboardPage />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            {/* Admin Routes (Role Protected) */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <AdminDashboardPage />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <AdminUsersPage />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/billing"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <AdminBillingPage />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/resources"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <AdminResourcesPage />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            {/* Patient Application Routes (Protected & Patient-Only) */}
            <Route path="/patient" element={<Navigate to="/patient/dashboard" replace />} />
            <Route
              path="/patient/dashboard"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['PATIENT']}>
                    <PatientDashboardPage />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/doctors"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['PATIENT']}>
                    <FindDoctorPage />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/doctors/:id"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['PATIENT']}>
                    <DoctorProfilePage />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/book/:doctorId"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['PATIENT']}>
                    <BookAppointmentPage />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route path="/patient/book" element={<Navigate to="/patient/doctors" replace />} />
            <Route
              path="/patient/appointments"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['PATIENT']}>
                    <UpcomingAppointmentsPage />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/appointments/confirmation"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['PATIENT']}>
                    <AppointmentConfirmationPage />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/visits"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['PATIENT']}>
                    <PastVisitsPage />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />
            <Route path="/patient/records" element={<Navigate to="/patient/visits" replace />} />
            <Route
              path="/patient/profile"
              element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['PATIENT']}>
                    <PatientAccountProfilePage />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            {/* Catch-all 404 Route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </PatientProvider>
    </AuthProvider>
  );
}

export default App;
