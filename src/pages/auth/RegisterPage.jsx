import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { OnboardingLayout } from '../../layouts/OnboardingLayout';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { isValidEmail, isValidPassword, isNonEmptyString } from '../../utils/validators';

export function RegisterPage() {
  const navigate = useNavigate();
  const { registrationDraft, updateRegistrationDraft } = useAuth();

  const [formData, setFormData] = useState({
    fullName: registrationDraft.fullName || '',
    email: registrationDraft.email || '',
    password: registrationDraft.password || '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!isNonEmptyString(formData.fullName)) {
      newErrors.fullName = 'Full name is required';
    }
    if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!isValidPassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    updateRegistrationDraft({
      fullName: formData.fullName,
      email: formData.email,
      password: formData.password,
    });

    navigate('/onboarding/personal-info');
  };

  return (
    <OnboardingLayout showBack={false}>
      <Card className="shadow-card overflow-hidden">
        {/* Header Hero Image from Stitch */}
        <div className="h-32 w-full relative">
          <div
            className="bg-cover bg-center w-full h-full absolute inset-0"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAR_RldnRC5rNnBneHweFPvpkweufBaQNIM6Pf-fHwbwnUhFzfBFJXDWZlcdnaSMUITaIp5GOML9O5yDXdG-s0zq8ZTDOla6AeHI9N8Xc_Ky7fMDS6H3cdJIFx6qH0SfiJWi5BkrXLLJmBLr82BOrQutousxcxGyG2MoRWPFuCes1s-bQeWFQe9WzQRi_cBhmxPIDSHaFnP8Y56UHWjsTaa1ivtSs-uwfQIJTafdZxbZ8hTnudHivt8')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest to-transparent" />
        </div>

        {/* Form Container */}
        <div className="px-6 pb-8 pt-2 flex flex-col gap-6 relative z-10">
          <div className="text-center">
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary font-bold mb-1">
              Create Account
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Join MedLink Care to manage your health journey.
            </p>
          </div>

          <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
            <Input
              label="Full Name"
              id="fullName"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              iconLeading="person"
              error={errors.fullName}
              required
            />

            <Input
              label="Email Address"
              id="email"
              type="email"
              placeholder="john.doe@example.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              iconLeading="mail"
              error={errors.email}
              required
            />

            <Input
              label="Password"
              id="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              iconLeading="lock"
              error={errors.password}
              required
            />

            <Input
              label="Confirm Password"
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              iconLeading="lock_reset"
              error={errors.confirmPassword}
              required
            />

            <div className="mt-2 flex flex-col gap-4">
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                iconTrailing="arrow_forward"
                className="min-h-[52px]"
              >
                Sign Up
              </Button>

              <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-primary font-label-md text-label-md font-semibold hover:underline"
                >
                  Log In
                </Link>
              </p>
            </div>
          </form>
        </div>
      </Card>
    </OnboardingLayout>
  );
}
