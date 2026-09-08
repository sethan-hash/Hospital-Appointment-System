import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../layouts/AuthLayout';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Icon } from '../../components/common/Icon';

export function RegistrationCompletePage() {
  const navigate = useNavigate();

  return (
    <AuthLayout>
      <div className="flex flex-col items-center w-full">
        {/* Hospital Branding Anchor */}
        <div className="flex items-center gap-2 text-primary mb-8">
          <Icon
            name="local_hospital"
            filled={true}
            className="text-3xl text-primary"
          />
          <span className="font-headline-sm text-headline-sm font-bold tracking-tight">
            MedLink Care
          </span>
        </div>

        {/* Success Card */}
        <Card className="w-full rounded-[24px] shadow-card-hover p-8 md:p-10 flex flex-col items-center text-center animate-entrance">
          {/* Animated Checkmark Graphic from Stitch */}
          <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
            {/* Pulsing background ring */}
            <div className="absolute inset-0 bg-secondary-container rounded-full animate-pulse-soft opacity-80" />
            {/* Core checkmark icon */}
            <Icon
              name="check_circle"
              filled={true}
              className="text-6xl text-secondary relative z-10"
            />
          </div>

          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface font-bold mb-3">
            Welcome to MedLink Care!
          </h1>

          <p className="font-body-md text-body-md text-on-surface-variant mb-8 px-2">
            Your secure patient profile has been successfully created. You're all
            set to manage appointments and access your health records.
          </p>

          <Button
            variant="primary"
            size="lg"
            rounded="full"
            fullWidth
            iconTrailing="arrow_forward"
            onClick={() => navigate('/patient/dashboard')}
            className="min-h-[52px]"
          >
            Go to Dashboard
          </Button>
        </Card>
      </div>
    </AuthLayout>
  );
}
