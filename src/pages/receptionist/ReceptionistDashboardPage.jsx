import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';

export function ReceptionistDashboardPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="h-16 border-b border-outline-variant/20 px-6 flex items-center justify-between bg-surface-container-lowest shadow-sm">
        <div className="flex items-center gap-2 text-primary font-bold text-lg">
          <Icon name="local_hospital" filled={true} className="text-2xl" />
          <span>MedLink Care — Receptionist Portal</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Sign Out
        </Button>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10 flex flex-col gap-6">
        <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/30">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xl">
              <Icon name="desk" className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">
                Welcome, {currentUser?.fullName || currentUser?.name || 'Receptionist'}
              </h1>
              <p className="text-on-surface-variant font-label-md">
                Role: <span className="font-semibold text-secondary">{currentUser?.role}</span> | {currentUser?.email}
              </p>
            </div>
          </div>
          <p className="text-on-surface-variant">
            You are logged into the MedLink Care Receptionist Dashboard. Patient check-in and scheduling will be active in future phases.
          </p>
        </div>
      </main>
    </div>
  );
}
