import { useState, useEffect } from 'react';
import { doctorService } from '../services/doctorService';

/**
 * Custom Hook for fetching a doctor's weekly availability schedule.
 * Fetches from GET /api/doctors/:id/availability.
 *
 * @param {string|number} id - The doctor ID to fetch availability for.
 * @returns {{ schedule: object[], loading: boolean, error: string|null }}
 */
export function useDoctorAvailability(id) {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    doctorService
      .getDoctorAvailability(id)
      .then((result) => {
        if (isMounted) {
          setSchedule(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load availability.');
          setSchedule([]);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  return { schedule, loading, error };
}
