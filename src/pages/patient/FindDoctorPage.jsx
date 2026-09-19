import React from 'react';
import { PatientLayout } from '../../layouts/PatientLayout';
import { DoctorCard } from '../../components/patient/DoctorCard';
import { SpecialtyChip } from '../../components/patient/SpecialtyChip';
import { EmptyState } from '../../components/feedback/EmptyState';
import { Icon } from '../../components/common/Icon';
import { Button } from '../../components/common/Button';
import { PageHeader } from '../../components/common/PageHeader';
import { FilterChip } from '../../components/common/FilterChip';
import { useDoctors } from '../../hooks/useDoctors';
import { MOCK_SPECIALTIES } from '../../data/mockSpecialties';

export function FindDoctorPage() {
  const {
    doctors,
    searchQuery,
    setSearchQuery,
    selectedSpecialty,
    setSelectedSpecialty,
    loading,
    error,
  } = useDoctors();

  const handleSpecialtyClick = (specialtyId) => {
    setSelectedSpecialty((prev) => (prev === specialtyId ? null : specialtyId));
  };

  return (
    <PatientLayout title="MedLink Care">
      <div className="space-y-6">
        {/* Search Header Section */}
        <section>
          <PageHeader
            title="Find a Specialist"
            subtitle="Book appointments with our top-rated medical professionals."
            as="h2"
            className="mb-4"
          />

          {/* Search Input Bar */}
          <div className="relative max-w-2xl">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none flex items-center">
              <Icon name="search" className="text-xl" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, specialty, or conditions..."
              className="w-full h-[52px] pl-12 pr-12 bg-surface-container-lowest border border-outline-variant rounded-lg font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all shadow-sm placeholder:text-outline-variant"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-outline hover:text-on-surface rounded-full"
                aria-label="Clear search"
              >
                <Icon name="close" className="text-xl" />
              </button>
            ) : (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:bg-surface-container rounded-full transition-colors flex items-center justify-center"
                aria-label="Filter"
              >
                <Icon name="tune" className="text-xl" />
              </button>
            )}
          </div>
        </section>

        {/* Specialty Filter Chips (Horizontal scrollable) */}
        <section className="overflow-x-auto no-scrollbar pb-1">
          <div className="flex gap-2 min-w-max">
            <FilterChip
              label="All Specialties"
              isSelected={selectedSpecialty === null}
              onClick={() => setSelectedSpecialty(null)}
            />

            {MOCK_SPECIALTIES.map((spec) => (
              <SpecialtyChip
                key={spec.id}
                specialty={spec}
                isSelected={selectedSpecialty === spec.id}
                onClick={() => handleSpecialtyClick(spec.id)}
              />
            ))}
          </div>
        </section>

        {/* Doctor Results Grid */}
        <section>
          {loading ? (
            <div className="flex items-center justify-center p-12 text-primary">
              <Icon name="progress_activity" className="animate-spin text-3xl mr-2" />
              <span className="font-body-md">Finding doctors...</span>
            </div>
          ) : error ? (
            <EmptyState
              icon="wifi_off"
              title="Could not load doctors"
              description="There was a problem connecting to the server. Please try again."
              action={
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSpecialty(null);
                  }}
                >
                  Retry
                </Button>
              }
            />
          ) : doctors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doctor) => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="search_off"
              title="No doctors found"
              description={
                searchQuery || selectedSpecialty
                  ? `We couldn't find any specialist matching your search. Try clearing filters.`
                  : 'No doctors are currently available. Please check back later.'
              }
              action={
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSpecialty(null);
                  }}
                >
                  Reset Filters
                </Button>
              }
            />
          )}
        </section>
      </div>
    </PatientLayout>
  );
}
