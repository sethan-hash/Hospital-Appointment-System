import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Icon } from '../common/Icon';
import { receptionistService } from '../../services/receptionistService';

export function PatientSearchSection({ onBookForPatient }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setPatients([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const results = await receptionistService.searchPatients(searchQuery.trim());
      setPatients(results);
    } catch (err) {
      setError(err.message || 'Failed to search patients.');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setPatients([]);
    setHasSearched(false);
    setError(null);
  };

  return (
    <Card className="p-6 border border-outline-variant/30 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface flex items-center gap-2">
            <Icon name="person_search" className="text-primary text-2xl" />
            Patient Directory &amp; Lookup
          </h2>
          <p className="text-on-surface-variant text-body-sm">
            Search patient records by name, phone number, or email address.
          </p>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <Input
            id="patient-search-query"
            placeholder="Type patient name, mobile number, or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            iconLeading="search"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            iconLeading="search"
          >
            Search
          </Button>
          {hasSearched && (
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
            >
              Clear
            </Button>
          )}
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-error-container/20 border border-error/20 text-error">
          <Icon name="error" className="text-lg flex-shrink-0 mt-0.5" />
          <span className="text-body-sm">{error}</span>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="py-10 text-center flex flex-col items-center justify-center gap-3">
          <Icon name="progress_activity" className="animate-spin text-3xl text-primary" />
          <p className="text-body-sm text-on-surface-variant">Searching patient records…</p>
        </div>
      ) : hasSearched && patients.length === 0 ? (
        <div className="py-10 text-center bg-surface-container-low/50 rounded-xl border border-dashed border-outline-variant/50">
          <Icon name="person_off" className="text-4xl text-on-surface-variant/60 mb-2" />
          <p className="font-medium text-on-surface">No patients found</p>
          <p className="text-xs text-on-surface-variant max-w-sm mx-auto mt-1">
            No matching patient records found for "{searchQuery}". You can register them as a new walk-in patient.
          </p>
        </div>
      ) : patients.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium px-1">
            <span>Found {patients.length} matching {patients.length === 1 ? 'record' : 'records'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patients.map((patient) => (
              <div
                key={patient.id}
                className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 shadow-sm hover:border-primary/40 transition-colors flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-on-surface text-body-lg">
                        {patient.fullName}
                      </h3>
                      <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                        <Icon name="mail" className="text-[14px]" />
                        {patient.email}
                      </p>
                      <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                        <Icon name="call" className="text-[14px]" />
                        {patient.phone}
                      </p>
                    </div>
                    {patient.gender && (
                      <Badge variant="default" className="text-[11px] uppercase">
                        {patient.gender}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-outline-variant/10 text-on-surface-variant">
                    <div>
                      <span className="text-outline">DOB:</span>{' '}
                      <span className="text-on-surface font-medium">
                        {patient.dateOfBirth || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-outline">Blood Group:</span>{' '}
                      <span className="text-on-surface font-medium">
                        {patient.bloodGroup || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-outline">City:</span>{' '}
                      <span className="text-on-surface font-medium">
                        {patient.city || 'Bengaluru'}
                      </span>
                    </div>
                    <div>
                      <span className="text-outline">Status:</span>{' '}
                      <span className="text-secondary font-medium">
                        {patient.status || 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-outline-variant/20 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    iconLeading="event"
                    onClick={() => onBookForPatient && onBookForPatient(patient)}
                  >
                    Book Appointment
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
