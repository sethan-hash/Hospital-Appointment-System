import { useState, useEffect } from 'react';
import { doctorService } from '../services/doctorService';

/**
 * Custom Hook for Doctor Listing & Search
 * Encapsulates search query, active specialty filter, and doctor list state.
 */
export function useDoctors(initialSpecialty = null) {
  const [doctors, setDoctors] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(initialSpecialty);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

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
        if (isMounted) setLoading(false);
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
  };
}
