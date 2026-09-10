import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Icon } from '../../components/common/Icon';
import { useAuth } from '../../hooks/useAuth';
import { usePatientProfile } from '../../hooks/usePatientProfile';
import { BLOOD_TYPES } from '../../utils/constants';
import patientAvatar from '../../assets/avatars/patient_arjun_sharma.jpg';

export function PatientAccountProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { profile } = usePatientProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || 'Arjun Sharma',
    email: profile?.email || 'arjun.sharma@example.in',
    phone: profile?.phone || '+91 98765 43210',
    bloodType: profile?.bloodType || 'O+',
    allergies: profile?.allergies || 'Penicillin',
    chronicConditions: profile?.chronicConditions || 'Mild Hypertension',
    emergencyContactName: profile?.emergencyContact?.name || 'Meera Sharma',
    emergencyContactPhone: profile?.emergencyContact?.phone || '+91 98765 00001',
  });

  const handleSave = (e) => {
    e.preventDefault();
    setIsEditing(false);
    alert('Profile information updated successfully!');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <PatientLayout showBack={true} onBack={() => navigate('/patient/dashboard')} title="Account Profile">
      <div className="space-y-6">
        {/* Profile Card Header */}
        <Card className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <div className="relative">
            <img
              src={profile?.avatar || patientAvatar}
              alt={formData.name}
              className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover shadow-sm border-2 border-primary/20"
            />
          </div>

          <div className="flex-1 space-y-1">
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              {formData.name}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Patient ID: #{profile?.id || 'pat-1001'}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
              <span className="bg-primary-container/10 text-primary font-label-md text-label-md px-3 py-1 rounded-full font-semibold">
                Blood Type: {formData.bloodType}
              </span>
              <span className="bg-surface-container text-on-surface-variant font-label-md text-label-md px-3 py-1 rounded-full">
                DOB: {profile?.dob || '1988-04-14'}
              </span>
            </div>
          </div>

          <div>
            <Button
              variant={isEditing ? 'outline' : 'primary'}
              size="md"
              iconLeading={isEditing ? 'close' : 'edit'}
              onClick={() => setIsEditing((prev) => !prev)}
            >
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </Button>
          </div>
        </Card>

        {/* Profile Information Form */}
        <Card className="p-6 md:p-8">
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-6">
            Personal &amp; Medical Details
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                id="profile-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                disabled={!isEditing}
                iconLeading="person"
              />

              <Input
                label="Email Address"
                id="profile-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                disabled={!isEditing}
                iconLeading="mail"
              />

              <Input
                label="Phone Number"
                id="profile-phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                disabled={!isEditing}
                iconLeading="call"
              />

              <Select
                label="Blood Type"
                id="profile-blood"
                options={BLOOD_TYPES}
                value={formData.bloodType}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bloodType: e.target.value }))
                }
                disabled={!isEditing}
              />

              <Input
                label="Known Allergies"
                id="profile-allergies"
                value={formData.allergies}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, allergies: e.target.value }))
                }
                disabled={!isEditing}
              />

              <Input
                label="Chronic Conditions"
                id="profile-conditions"
                value={formData.chronicConditions}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    chronicConditions: e.target.value,
                  }))
                }
                disabled={!isEditing}
              />

              <Input
                label="Emergency Contact Name"
                id="profile-ec-name"
                value={formData.emergencyContactName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    emergencyContactName: e.target.value,
                  }))
                }
                disabled={!isEditing}
              />

              <Input
                label="Emergency Contact Phone"
                id="profile-ec-phone"
                value={formData.emergencyContactPhone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    emergencyContactPhone: e.target.value,
                  }))
                }
                disabled={!isEditing}
              />
            </div>

            {isEditing && (
              <div className="pt-4 flex justify-end">
                <Button type="submit" variant="primary" size="md">
                  Save Changes
                </Button>
              </div>
            )}
          </form>
        </Card>

        {/* Account Actions */}
        <div className="flex justify-between items-center pt-2">
          <Button
            variant="ghost"
            onClick={() => navigate('/patient/visits')}
            iconLeading="description"
          >
            View All Visit Summaries
          </Button>

          <Button
            variant="secondary"
            iconLeading="logout"
            onClick={handleLogout}
            className="text-error border-error/40 hover:bg-error/10"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </PatientLayout>
  );
}
