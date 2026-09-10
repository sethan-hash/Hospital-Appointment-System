import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Icon } from '../../components/common/Icon';
import { RatingStars } from '../../components/common/RatingStars';
import { useDoctor } from '../../hooks/useDoctor';
import { formatRating } from '../../utils/formatters';

export function DoctorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { doctor, loading } = useDoctor(id);

  if (loading) {
    return (
      <PatientLayout showBack={true} onBack={() => navigate('/patient/doctors')}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Icon name="progress_activity" className="animate-spin text-3xl text-primary" />
        </div>
      </PatientLayout>
    );
  }

  if (!doctor) {
    return (
      <PatientLayout showBack={true} onBack={() => navigate('/patient/doctors')}>
        <div className="text-center py-12">
          <h2 className="text-xl font-bold">Doctor not found</h2>
          <Button variant="primary" onClick={() => navigate('/patient/doctors')} className="mt-4">
            Back to Doctors
          </Button>
        </div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout showBack={true} onBack={() => navigate('/patient/doctors')}>
      <div className="space-y-6">
        {/* Profile Header & Bio Section */}
        <Card className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          <div className="flex-shrink-0 flex flex-col items-center gap-4 w-full md:w-auto">
            <img
              src={doctor.image}
              alt={doctor.name}
              className="w-32 h-32 rounded-full object-cover shadow-sm border-2 border-surface-container"
            />
            <Link to={`/patient/book/${doctor.id}`} className="w-full">
              <Button
                variant="primary"
                size="md"
                fullWidth
                iconLeading="calendar_month"
                className="min-h-[48px]"
              >
                Book Visit
              </Button>
            </Link>
          </div>

          <div className="flex-grow space-y-4 w-full">
            <div className="flex flex-wrap justify-between items-start gap-2">
              <div>
                <h1 className="text-[28px] md:text-[30px] font-bold text-on-surface leading-tight">
                  {doctor.name}
                </h1>
                <p className="text-[18px] text-primary font-medium mt-0.5">
                  {doctor.title}
                </p>
              </div>

              <Badge variant="verified" icon="verified">
                Verified Specialist
              </Badge>
            </div>

            {/* Bio Card */}
            <div className="bg-surface-container-low p-4 rounded-lg">
              <h3 className="text-label-lg font-semibold text-on-surface-variant mb-1">
                Professional Bio
              </h3>
              <p className="text-body-md text-on-surface leading-relaxed">
                {doctor.bio}
              </p>
            </div>

            {/* Quick Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-outline-variant/20">
                <span className="p-2 rounded-full bg-primary-container/20 text-primary flex items-center justify-center">
                  <Icon name="school" className="text-xl" />
                </span>
                <div>
                  <p className="text-xs font-medium text-on-surface-variant">Education</p>
                  <p className="text-sm font-semibold text-on-surface">{doctor.education}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-outline-variant/20">
                <span className="p-2 rounded-full bg-primary-container/20 text-primary flex items-center justify-center">
                  <Icon name="location_on" className="text-xl" />
                </span>
                <div>
                  <p className="text-xs font-medium text-on-surface-variant">Primary Clinic</p>
                  <p className="text-sm font-semibold text-on-surface">{doctor.clinicName}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Schedule & Reviews Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Office Hours / Availability */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-headline-sm font-semibold text-on-surface flex items-center gap-2">
                <Icon name="calendar_month" className="text-primary" /> Office Hours
              </h2>
              <span className="text-xs font-medium text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">
                Regular Weekly Schedule
              </span>
            </div>

            <div className="space-y-2.5">
              {doctor.schedule?.map((item) => (
                <div
                  key={item.day}
                  className={`
                    flex items-center justify-between p-3.5 rounded-lg border transition-colors
                    ${
                      item.available
                        ? 'bg-surface-container-low border-transparent'
                        : 'bg-surface border-transparent opacity-60'
                    }
                  `}
                >
                  <span className="font-body-md text-on-surface font-medium w-24">
                    {item.day}
                  </span>
                  <span
                    className={`text-body-sm ${
                      item.available ? 'text-on-surface-variant' : 'text-outline font-medium'
                    }`}
                  >
                    {item.hours}
                  </span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      item.available ? 'bg-[#2e7d32]' : 'bg-outline-variant'
                    }`}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* Patient Reviews Overview */}
          <Card className="p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-headline-sm font-semibold text-on-surface mb-4 flex items-center gap-2">
                <Icon name="star" filled={true} className="text-secondary" /> Patient Reviews
              </h2>

              <div className="flex flex-col items-center justify-center my-4">
                <h3 className="text-5xl font-bold text-on-surface leading-none">
                  {formatRating(doctor.rating)}
                </h3>
                <RatingStars rating={doctor.rating} className="my-2" />
                <p className="text-body-sm text-on-surface-variant">
                  Based on {doctor.reviewCount} verified reviews
                </p>
              </div>

              {doctor.reviews?.length > 0 && (
                <div className="bg-surface-container-low p-4 rounded-lg mt-4">
                  <p className="text-body-sm italic text-on-surface-variant mb-2">
                    "{doctor.reviews[0].comment}"
                  </p>
                  <p className="text-xs font-medium text-outline text-right">
                    - {doctor.reviews[0].author}, {doctor.reviews[0].date}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <Link to={`/patient/book/${doctor.id}`}>
                <Button variant="primary" size="md" fullWidth>
                  Book Appointment Now
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </PatientLayout>
  );
}
