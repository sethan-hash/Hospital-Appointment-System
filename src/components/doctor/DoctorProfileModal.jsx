import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Icon } from '../common/Icon';
import { doctorService } from '../../services/doctorService';

/**
 * Doctor Profile Management Modal
 * Allows attending physicians to inspect and edit their professional credentials,
 * contact details, and availability status.
 */
export function DoctorProfileModal({ isOpen, onClose, onProfileUpdated }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    department: '',
    qualification: '',
    hospitalName: '',
    consultationFee: 800,
    experienceYears: 5,
    bio: '',
    isAvailable: true,
  });

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(null);
      return;
    }

    let isMounted = true;
    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const data = await doctorService.getProfile();
        if (isMounted && data) {
          setFormData({
            name: data.name || data.fullName || '',
            email: data.email || '',
            phone: data.phone || '',
            specialization: data.specialization || '',
            department: data.department || '',
            qualification: data.qualification || data.education || '',
            hospitalName: data.hospitalName || data.clinicName || '',
            consultationFee: data.consultationFee !== undefined ? data.consultationFee : 800,
            experienceYears: data.experienceYears !== undefined ? data.experienceYears : 5,
            bio: data.bio || '',
            isAvailable: data.isAvailable !== undefined ? Boolean(data.isAvailable) : true,
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load doctor profile.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await doctorService.updateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        specialization: formData.specialization,
        department: formData.department,
        qualification: formData.qualification,
        hospitalName: formData.hospitalName,
        consultationFee: parseFloat(formData.consultationFee),
        experienceYears: parseInt(formData.experienceYears, 10),
        bio: formData.bio,
        isAvailable: Boolean(formData.isAvailable),
      });

      setSuccess('Doctor profile updated successfully!');
      if (onProfileUpdated) {
        onProfileUpdated(updated);
      }
      setTimeout(() => {
        setSuccess(null);
      }, 3500);
    } catch (err) {
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Doctor Profile"
      maxWidth="max-w-2xl"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-primary">
          <Icon name="progress_activity" className="animate-spin text-3xl" />
          <p className="text-sm font-medium text-on-surface-variant">Loading profile details...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Notification Banners */}
          {error && (
            <div className="p-3.5 rounded-xl bg-error-container/40 border border-error/20 flex items-center gap-3 text-on-error-container text-sm">
              <Icon name="error" className="text-error text-xl shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-secondary-container/40 border border-secondary/30 flex items-center gap-3 text-secondary text-sm">
              <Icon name="check_circle" className="text-secondary text-xl shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Core Personal & Contact Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              id="doc-name"
              label="Full Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Dr. Priya Sharma"
              required
            />
            <Input
              id="doc-email"
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="e.g. doctor@hospital.com"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              id="doc-phone"
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+91 98450 12345"
              required
            />
            <Input
              id="doc-hospital"
              label="Hospital / Clinic Name"
              value={formData.hospitalName}
              onChange={(e) => handleChange('hospitalName', e.target.value)}
              placeholder="e.g. Apollo Hospitals Bengaluru"
              required
            />
          </div>

          {/* Professional Credentials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              id="doc-specialization"
              label="Specialization"
              value={formData.specialization}
              onChange={(e) => handleChange('specialization', e.target.value)}
              placeholder="e.g. Cardiology"
              required
            />
            <Input
              id="doc-department"
              label="Department"
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              placeholder="e.g. Cardiology"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <Input
                id="doc-qualification"
                label="Qualifications"
                value={formData.qualification}
                onChange={(e) => handleChange('qualification', e.target.value)}
                placeholder="e.g. MBBS, MD, DM"
                required
              />
            </div>
            <div>
              <Input
                id="doc-experience"
                label="Experience (Years)"
                type="number"
                min="0"
                max="70"
                value={formData.experienceYears}
                onChange={(e) => handleChange('experienceYears', e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                id="doc-fee"
                label="Consultation Fee (₹)"
                type="number"
                min="0"
                step="50"
                value={formData.consultationFee}
                onChange={(e) => handleChange('consultationFee', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Professional Bio */}
          <div className="flex flex-col gap-1">
            <label htmlFor="doc-bio" className="font-label-md text-label-md text-on-surface-variant font-medium ml-1">
              Professional Bio
            </label>
            <textarea
              id="doc-bio"
              rows={3}
              value={formData.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Summary of clinical specializations, patient care approach, and experience..."
              className="w-full p-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            />
          </div>

          {/* Availability Status Switch */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <div>
              <p className="font-label-lg font-semibold text-on-surface">Accepting Appointments</p>
              <p className="text-xs text-on-surface-variant">
                When enabled, patients can discover you in search and book consultation visits.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isAvailable}
                onChange={(e) => handleChange('isAvailable', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={saving}
              iconLeading={saving ? 'progress_activity' : 'save'}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
