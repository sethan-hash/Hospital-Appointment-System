import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { DEFAULT_PATIENT_AVATAR } from '../data/mockPatient';

const AuthContext = createContext(null);

const INITIAL_REGISTRATION_DRAFT = {
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
  bloodType: 'O+',
  allergies: '',
  chronicConditions: '',
  insuranceCardImage: null,
};

/**
 * Normalizes backend user object into standard client-side user format.
 */
function normalizeUser(apiUser) {
  if (!apiUser) return null;

  return {
    ...apiUser,
    id: apiUser.id,
    name: apiUser.fullName || apiUser.name || 'User',
    fullName: apiUser.fullName || apiUser.name || 'User',
    email: apiUser.email,
    role: apiUser.role,
    avatar: apiUser.avatar || DEFAULT_PATIENT_AVATAR,
    isAuthenticated: true,
  };
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [registrationDraft, setRegistrationDraft] = useState(INITIAL_REGISTRATION_DRAFT);

  // Restore session from token on application startup
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const token = authService.getToken();

      if (!token) {
        if (isMounted) {
          setCurrentUser(null);
          setIsLoadingAuth(false);
        }
        return;
      }

      try {
        const user = await authService.getCurrentUser();
        if (isMounted) {
          setCurrentUser(normalizeUser(user));
        }
      } catch {
        if (isMounted) {
          authService.clearStorage();
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAuth(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Log in user with email and password against backend.
   */
  const login = async (email, password) => {
    const { user } = await authService.login(email, password);
    const normalized = normalizeUser(user);
    setCurrentUser(normalized);
    return normalized;
  };

  /**
   * Register a new patient and initialize session.
   */
  const register = async (patientData) => {
    const { user } = await authService.register(patientData);
    const normalized = normalizeUser(user);
    setCurrentUser(normalized);
    return normalized;
  };

  /**
   * Log out user and clear storage.
   */
  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  /**
   * Updates multi-step registration draft state.
   */
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

  /**
   * Resets registration draft state.
   */
  const resetRegistrationDraft = () => {
    setRegistrationDraft(INITIAL_REGISTRATION_DRAFT);
  };

  const value = {
    currentUser,
    isAuthenticated: Boolean(currentUser?.isAuthenticated),
    role: currentUser?.role || null,
    isLoadingAuth,
    login,
    register,
    logout,
    registrationDraft,
    updateRegistrationDraft,
    resetRegistrationDraft,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
