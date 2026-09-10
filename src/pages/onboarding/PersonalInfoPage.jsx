import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from '../../layouts/OnboardingLayout';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { GENDERS, EMERGENCY_RELATIONSHIPS } from '../../utils/constants';
import { formatPhoneNumber } from '../../utils/formatters';

export function PersonalInfoPage() {
  const navigate = useNavigate();
  const { registrationDraft, updateRegistrationDraft } = useAuth();

  const [formData, setFormData] = useState({
    dob: registrationDraft.dob || '1990-01-01',
    gender: registrationDraft.gender || 'male',
    phone: registrationDraft.phone || '+91 98765 43210',
    emergencyContactName: registrationDraft.emergencyContact?.name || '',
    emergencyRelationship: registrationDraft.emergencyContact?.relationship || '',
    emergencyContactPhone: registrationDraft.emergencyContact?.phone || '',
  });

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData((prev) => ({ ...prev, phone: formatted }));
  };

  const handleEmergencyPhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData((prev) => ({ ...prev, emergencyContactPhone: formatted }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    updateRegistrationDraft({
      dob: formData.dob,
      gender: formData.gender,
      phone: formData.phone,
      emergencyContact: {
        name: formData.emergencyContactName,
        relationship: formData.emergencyRelationship,
        phone: formData.emergencyContactPhone,
      },
    });

    navigate('/onboarding/health-profile');
  };

  return (
    <OnboardingLayout showBack={true} onBack={() => navigate('/register')}>
      <div className="w-full flex flex-col">
        {/* Step Progress */}
        <ProgressBar step={2} totalSteps={3} title="Personal Information" />

        {/* Title Header */}
        <div className="mb-6 text-center">
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-bold mb-1">
            Tell us about yourself
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            We need a few details to complete your profile.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Date of Birth */}
          <Input
            label="Date of Birth"
            id="dob"
            type="date"
            value={formData.dob}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, dob: e.target.value }))
            }
            iconTrailing="calendar_month"
            required
          />

          {/* Gender Selector Grid */}
          <div>
            <label className="block mb-2 font-label-md text-label-md text-on-surface-variant font-medium ml-1">
              Gender
            </label>
            <div className="grid grid-cols-3 gap-3">
              {GENDERS.map((g) => {
                const isSelected = formData.gender === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, gender: g.value }))
                    }
                    className={`
                      h-[52px] rounded-lg border font-body-sm text-body-sm flex items-center justify-center transition-all select-none
                      ${
                        isSelected
                          ? 'border-primary bg-primary-container/10 text-primary font-bold shadow-sm ring-1 ring-primary'
                          : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-variant/30'
                      }
                    `}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Phone Number */}
          <Input
            label="Phone Number"
            id="phone"
            type="tel"
            placeholder="+91 XXXXX XXXXX"
            value={formData.phone}
            onChange={handlePhoneChange}
            iconLeading="call"
            required
          />

          <div className="h-px bg-outline-variant/30 my-2" />

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Emergency Contact
            </h2>

            <Input
              label="Contact Name"
              id="ec_name"
              placeholder="Full Name"
              value={formData.emergencyContactName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  emergencyContactName: e.target.value,
                }))
              }
              required
            />

            <Select
              label="Relationship"
              id="ec_relation"
              placeholder="Select relationship"
              options={EMERGENCY_RELATIONSHIPS}
              value={formData.emergencyRelationship}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  emergencyRelationship: e.target.value,
                }))
              }
              required
            />

            <Input
              label="Contact Phone"
              id="ec_phone"
              type="tel"
              placeholder="+91 XXXXX XXXXX"
              value={formData.emergencyContactPhone}
              onChange={handleEmergencyPhoneChange}
              required
            />
          </div>

          <div className="mt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              iconTrailing="arrow_forward"
              className="min-h-[52px]"
            >
              Next Step
            </Button>
          </div>
        </form>
      </div>
    </OnboardingLayout>
  );
}
