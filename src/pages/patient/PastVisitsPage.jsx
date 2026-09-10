import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { VisitListItem } from '../../components/patient/VisitListItem';
import { VisitDetailModal } from '../../components/patient/VisitDetailModal';
import { PageHeader } from '../../components/common/PageHeader';
import { FilterChip } from '../../components/common/FilterChip';
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
        <PageHeader
          title="Past Visits & Medical Records"
          subtitle="View consultation summaries, diagnostics, and immunization logs."
        />

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <FilterChip
            label="All Records"
            isSelected={filterType === 'all'}
            onClick={() => setFilterType('all')}
          />
          <FilterChip
            label="Checkups"
            isSelected={filterType === 'checkup'}
            onClick={() => setFilterType('checkup')}
          />
          <FilterChip
            label="Vaccines"
            isSelected={filterType === 'vaccine'}
            onClick={() => setFilterType('vaccine')}
          />
          <FilterChip
            label="Radiology & Labs"
            isSelected={filterType === 'radiology'}
            onClick={() => setFilterType('radiology')}
          />
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
