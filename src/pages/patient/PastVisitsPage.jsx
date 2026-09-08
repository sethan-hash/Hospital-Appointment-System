import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { VisitListItem } from '../../components/patient/VisitListItem';
import { VisitDetailModal } from '../../components/patient/VisitDetailModal';
import { usePatientProfile } from '../../hooks/usePatientProfile';

export function PastVisitsPage() {
  const navigate = useNavigate();
  const { pastVisits, loading } = usePatientProfile();
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [filterType, setFilterType] = useState('all');

  const filteredVisits = pastVisits.filter((v) => {
    if (filterType === 'all') return true;
    return v.type === filterType;
  });

  return (
    <PatientLayout showBack={true} onBack={() => navigate('/patient/dashboard')} title="Medical Records">
      <div className="space-y-6">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-bold">
            Past Visits &amp; Medical Records
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            View consultation summaries, diagnostics, and immunization logs.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`
              px-4 py-2 rounded-full font-label-lg text-label-lg transition-all select-none
              ${
                filterType === 'all'
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container'
              }
            `}
          >
            All Records
          </button>
          <button
            type="button"
            onClick={() => setFilterType('checkup')}
            className={`
              px-4 py-2 rounded-full font-label-lg text-label-lg transition-all select-none
              ${
                filterType === 'checkup'
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container'
              }
            `}
          >
            Checkups
          </button>
          <button
            type="button"
            onClick={() => setFilterType('vaccine')}
            className={`
              px-4 py-2 rounded-full font-label-lg text-label-lg transition-all select-none
              ${
                filterType === 'vaccine'
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container'
              }
            `}
          >
            Vaccines
          </button>
          <button
            type="button"
            onClick={() => setFilterType('radiology')}
            className={`
              px-4 py-2 rounded-full font-label-lg text-label-lg transition-all select-none
              ${
                filterType === 'radiology'
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container'
              }
            `}
          >
            Radiology &amp; Labs
          </button>
        </div>

        {/* Records Card List */}
        <Card className="shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-primary">Loading records...</div>
          ) : filteredVisits.length > 0 ? (
            <div>
              {filteredVisits.map((visit, idx) => (
                <VisitListItem
                  key={visit.id}
                  visit={visit}
                  onViewSummary={(v) => setSelectedVisit(v)}
                  isLast={idx === filteredVisits.length - 1}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-on-surface-variant">
              No records found under this filter.
            </div>
          )}
        </Card>
      </div>

      {/* Detail Summary Modal */}
      <VisitDetailModal
        visit={selectedVisit}
        onClose={() => setSelectedVisit(null)}
        title={selectedVisit?.title || 'Visit Details'}
      />
    </PatientLayout>
  );
}
