import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingLayout } from '../../layouts/OnboardingLayout';
import { Card } from '../../components/common/Card';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Select } from '../../components/common/Select';
import { Input } from '../../components/common/Input';
import { TextArea } from '../../components/common/TextArea';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';
import { useAuth } from '../../hooks/useAuth';
import { BLOOD_TYPES } from '../../utils/constants';

export function HealthProfilePage() {
  const navigate = useNavigate();
  const { registrationDraft, updateRegistrationDraft, register, resetRegistrationDraft } =
    useAuth();

  const [formData, setFormData] = useState({
    bloodType: registrationDraft.bloodType || 'O+',
    allergies: registrationDraft.allergies || '',
    chronicConditions: registrationDraft.chronicConditions || '',
    insuranceFileName: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        insuranceFileName: file.name,
      }));
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    updateRegistrationDraft({
      bloodType: formData.bloodType,
      allergies: formData.allergies,
      chronicConditions: formData.chronicConditions,
    });

    const fullPayload = {
      fullName: registrationDraft.fullName,
      email: registrationDraft.email,
      password: registrationDraft.password,
      phone: registrationDraft.phone,
      dob: registrationDraft.dob,
      gender: registrationDraft.gender,
      bloodType: formData.bloodType,
      allergies: formData.allergies,
      chronicConditions: formData.chronicConditions,
      emergencyContact: registrationDraft.emergencyContact,
    };

    try {
      await register(fullPayload);
      if (resetRegistrationDraft) resetRegistrationDraft();
      navigate('/onboarding/complete');
    } catch (err) {
      setError(err.message || 'Registration failed. Please review your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingLayout
      showBack={true}
      onBack={() => navigate('/onboarding/personal-info')}
    >
      <Card className="shadow-card overflow-hidden">
        {/* Step Progress */}
        <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant/20">
          <ProgressBar step={3} totalSteps={3} title="Health Profile" />
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-bold">
              Complete Your Profile
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Please provide your basic health information to help us personalize
              your care. All information is secure and confidential.
            </p>
          </div>

          <form onSubmit={handleCompleteSubmit} className="space-y-6">
            {error && (
              <div className="bg-error-container/20 border border-error/40 text-error text-body-sm rounded-xl p-3.5 flex items-center gap-2">
                <Icon name="error" className="text-xl shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Blood Type */}
              <Select
                label="Blood Type"
                id="bloodType"
                options={BLOOD_TYPES}
                value={formData.bloodType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    bloodType: e.target.value,
                  }))
                }
                required
              />

              {/* Known Allergies */}
              <Input
                label="Known Allergies"
                id="allergies"
                placeholder="e.g., Penicillin, Peanuts (or 'None')"
                value={formData.allergies}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    allergies: e.target.value,
                  }))
                }
              />

              {/* Chronic Conditions */}
              <div className="md:col-span-2">
                <TextArea
                  label="Chronic Conditions"
                  id="chronicConditions"
                  placeholder="List any chronic conditions you are currently managing..."
                  value={formData.chronicConditions}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      chronicConditions: e.target.value,
                    }))
                  }
                  rows={3}
                />
              </div>
            </div>

            {/* Insurance Card Upload */}
            <div className="bg-surface-container rounded-xl p-6 border border-outline-variant/30 relative overflow-hidden group hover:border-primary/50 transition-colors">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />

              <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-1 group-hover:scale-105 transition-transform shadow-sm">
                  <Icon
                    name="add_a_photo"
                    className="text-[30px] text-white"
                  />
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Upload Insurance Card
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                  {formData.insuranceFileName
                    ? `Selected: ${formData.insuranceFileName}`
                    : 'Snap a photo of the front of your medical insurance card for faster check-ins.'}
                </p>

                <label className="mt-3 px-6 h-[40px] rounded-full border border-secondary text-secondary font-label-lg text-label-lg hover:bg-secondary/10 transition-colors cursor-pointer inline-flex items-center justify-center font-semibold">
                  <span>
                    {formData.insuranceFileName ? 'Change File' : 'Choose File'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                size="md"
                rounded="full"
                onClick={() => navigate('/onboarding/personal-info')}
                className="order-2 sm:order-1 px-8"
              >
                Back
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                rounded="full"
                loading={isSubmitting}
                className="order-1 sm:order-2 px-8 min-h-[52px]"
              >
                Complete Registration
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </OnboardingLayout>
  );
}
