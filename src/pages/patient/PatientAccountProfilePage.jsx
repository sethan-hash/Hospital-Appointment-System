import React, { useState, useEffect } from 'react';
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
import { DEFAULT_PATIENT_AVATAR } from '../../data/mockPatient';

export function PatientAccountProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { profile, loading, updateProfile } = usePatientProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bloodType: 'O+',
    allergies: '',
    chronicConditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  // Synchronize form state with loaded backend profile
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || profile.fullName || '',
        email: profile.email || '',
        phone: profile.phone || '',
        bloodType: profile.bloodType || profile.bloodGroup || 'O+',
        allergies: profile.allergies || '',
        chronicConditions: profile.chronicConditions || '',
        emergencyContactName: profile.emergencyContactName || profile.emergencyContact?.name || '',
        emergencyContactPhone: profile.emergencyContactPhone || profile.emergencyContact?.phone || '',
      });
    }
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        bloodType: formData.bloodType,
        allergies: formData.allergies,
        chronicConditions: formData.chronicConditions,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
      });

      setIsEditing(false);
      setSuccessMessage('Profile information updated successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading && !profile) {
    return (
      <PatientLayout showBack={true} onBack={() => navigate('/patient/dashboard')} title="Account Profile">
        <div className="p-12 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="font-body-md text-on-surface-variant">Loading patient profile...</p>
        </div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout showBack={true} onBack={() => navigate('/patient/dashboard')} title="Account Profile">
      <div className="space-y-6">
        {/* Status Alerts */}
        {successMessage && (
          <div className="bg-secondary-container/20 border border-secondary/40 text-secondary text-body-sm rounded-xl p-4 flex items-center gap-3">
            <Icon name="check_circle" className="text-xl shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="bg-error-container/20 border border-error/40 text-error text-body-sm rounded-xl p-4 flex items-center gap-3">
            <Icon name="error" className="text-xl shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Profile Card Header */}
        <Card className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
          <div className="relative">
            <img
              src={profile?.avatar || DEFAULT_PATIENT_AVATAR}
              alt={formData.name || 'Patient'}
              className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover shadow-sm border-2 border-primary/20"
            />
          </div>

          <div className="flex-1 space-y-1">
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              {formData.name || profile?.name || 'Patient'}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Patient ID: #{profile?.id || '—'}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
              <span className="bg-primary-container/10 text-primary font-label-md text-label-md px-3 py-1 rounded-full font-semibold">
                Blood Type: {formData.bloodType || '—'}
              </span>
              {profile?.dob && (
                <span className="bg-surface-container text-on-surface-variant font-label-md text-label-md px-3 py-1 rounded-full">
                  DOB: {profile.dob}
                </span>
              )}
            </div>
          </div>

          <div>
            <Button
              variant={isEditing ? 'outline' : 'primary'}
              size="md"
              iconLeading={isEditing ? 'close' : 'edit'}
              onClick={() => {
                setIsEditing((prev) => !prev);
                setErrorMessage(null);
              }}
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
                required
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
                required
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
                required
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
                placeholder="None or list allergies"
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
                placeholder="None or list chronic conditions"
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
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isSaving}
                  iconTrailing="check"
                >
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
