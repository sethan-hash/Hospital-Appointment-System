import React, { createContext, useContext, useState } from 'react';
import { USER_ROLES } from '../utils/constants';
import { MOCK_PATIENT } from '../data/mockPatient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState({
    id: MOCK_PATIENT.id,
    name: MOCK_PATIENT.name,
    email: MOCK_PATIENT.email,
    role: USER_ROLES.PATIENT,
    avatar: MOCK_PATIENT.avatar,
    isAuthenticated: true,
  });

  const [registrationDraft, setRegistrationDraft] = useState({
    fullName: '',
    email: '',
    password: '',
    dob: '',
    gender: 'male',
    phone: '',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
    },
    bloodType: '',
    allergies: '',
    chronicConditions: '',
    insuranceCardImage: null,
  });

  const login = (email, password) => {
    setCurrentUser({
      id: MOCK_PATIENT.id,
      name: MOCK_PATIENT.name,
      email: email || MOCK_PATIENT.email,
      role: USER_ROLES.PATIENT,
      avatar: MOCK_PATIENT.avatar,
      isAuthenticated: true,
    });
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const updateRegistrationDraft = (fields) => {
    setRegistrationDraft((prev) => ({
      ...prev,
      ...fields,
      emergencyContact: {
        ...prev.emergencyContact,
        ...(fields.emergencyContact || {}),
      },
    }));
  };

  const completeRegistration = () => {
    setCurrentUser({
      id: `pat-${Date.now()}`,
      name: registrationDraft.fullName || 'John Doe',
      email: registrationDraft.email || 'patient@example.com',
      role: USER_ROLES.PATIENT,
      avatar: MOCK_PATIENT.avatar,
      isAuthenticated: true,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        registrationDraft,
        updateRegistrationDraft,
        completeRegistration,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
