import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { receptionistService } from '../../services/receptionistService';

export function WalkInModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: 'MALE',
    dateOfBirth: '',
    bloodGroup: '',
    address: '',
    city: 'Bengaluru',
    pincode: '',
  });

  const [bookImmediately, setBookImmediately] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      gender: 'MALE',
      dateOfBirth: '',
      bloodGroup: '',
      address: '',
      city: 'Bengaluru',
      pincode: '',
    });
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      setError('Patient full name is required.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Patient email is required.');
      return;
    }
    if (!formData.phone.trim() || formData.phone.trim().length < 10) {
      setError('A valid 10-digit phone number is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const patient = await receptionistService.registerPatient({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        pincode: formData.pincode.trim() || undefined,
      });

      resetForm();
      if (onSuccess) {
        onSuccess(patient, { bookImmediately });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to register walk-in patient.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Register Walk-in Patient"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-error-container/20 border border-error/20 text-error">
            <Icon name="error" className="text-lg flex-shrink-0 mt-0.5" />
            <span className="text-body-sm">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="walkin-fullname"
            label="Full Name"
            placeholder="e.g. Rahul Sharma"
            value={formData.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            required
            iconLeading="person"
          />

          <Input
            id="walkin-phone"
            label="Phone Number"
            type="tel"
            placeholder="10-digit mobile number"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            required
            iconLeading="call"
            maxLength={10}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="walkin-email"
            label="Email Address"
            type="email"
            placeholder="patient@example.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            required
            iconLeading="mail"
          />

          <Select
            id="walkin-gender"
            label="Gender"
            value={formData.gender}
            onChange={(e) => handleChange('gender', e.target.value)}
            required
            options={[
              { value: 'MALE', label: 'Male' },
              { value: 'FEMALE', label: 'Female' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="walkin-dob"
            label="Date of Birth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            iconLeading="calendar_today"
          />

          <Select
            id="walkin-blood"
            label="Blood Group"
            placeholder="Select Blood Group (Optional)"
            value={formData.bloodGroup}
            onChange={(e) => handleChange('bloodGroup', e.target.value)}
            options={[
              { value: 'A+', label: 'A+' },
              { value: 'A-', label: 'A-' },
              { value: 'B+', label: 'B+' },
              { value: 'B-', label: 'B-' },
              { value: 'AB+', label: 'AB+' },
              { value: 'AB-', label: 'AB-' },
              { value: 'O+', label: 'O+' },
              { value: 'O-', label: 'O-' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              id="walkin-address"
              label="Address / Street"
              placeholder="Door No, Street name"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              iconLeading="home"
            />
          </div>

          <Input
            id="walkin-city"
            label="City"
            placeholder="City"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
          />
        </div>

        <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-body-sm text-on-surface select-none">
            <input
              type="checkbox"
              checked={bookImmediately}
              onChange={(e) => setBookImmediately(e.target.checked)}
              className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
            />
            <span>Open appointment booking directly after registering</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            iconLeading="how_to_reg"
          >
            Register Patient
          </Button>
        </div>
      </form>
    </Modal>
  );
}
