import { useState, useEffect } from 'react';
import { doctorService } from '../services/doctorService';

/**
 * Custom Hook for fetching a single doctor by ID.
 * Encapsulates loading, error, and lifecycle safety so page components
 * can focus on presentation and user interaction.
 *
 * @param {string} id - The doctor identifier to fetch.
 * @returns {{ doctor: Object|null, loading: boolean, error: Error|null }}
 */
export function useDoctor(id) {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    doctorService
      .getDoctorById(id)
      .then((doc) => {
        if (isMounted) {
          setDoctor(doc);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  return { doctor, loading, error };
}
