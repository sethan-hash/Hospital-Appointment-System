import { useState, useEffect } from 'react';
import { doctorService } from '../services/doctorService';

/**
 * Custom Hook for Doctor Listing & Search
 * Encapsulates search query, active specialty filter, doctor list state,
 * loading state, and error state.
 *
 * @param {string|null} [initialSpecialty=null] - Optional pre-selected specialty filter
 * @returns {{ doctors, searchQuery, setSearchQuery, selectedSpecialty, setSelectedSpecialty, loading, error }}
 */
export function useDoctors(initialSpecialty = null) {
  const [doctors, setDoctors] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(initialSpecialty);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    doctorService
      .searchDoctors(searchQuery, selectedSpecialty)
      .then((results) => {
        if (isMounted) {
          setDoctors(results);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error searching doctors:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load doctors.');
          setDoctors([]);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [searchQuery, selectedSpecialty]);

  return {
    doctors,
    searchQuery,
    setSearchQuery,
    selectedSpecialty,
    setSelectedSpecialty,
    loading,
    error,
  };
}
