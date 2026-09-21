import { useState, useEffect, useCallback } from 'react';
import { doctorService } from '../services/doctorService';

/**
 * Custom hook for fetching a doctor's reviews, average rating, and review count.
 * Provides a `refresh` function so callers can refetch after a new review is submitted.
 *
 * @param {string|number} id - The doctor's database ID (doctors.id)
 * @returns {{
 *   reviews: object[],
 *   averageRating: number|null,
 *   reviewCount: number,
 *   loading: boolean,
 *   error: Error|null,
 *   refresh: () => void,
 * }}
 */
export function useDoctorReviews(id) {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    doctorService
      .getDoctorReviews(id)
      .then((data) => {
        if (isMounted) {
          setReviews(data.reviews);
          setAverageRating(data.averageRating);
          setReviewCount(data.reviewCount);
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
  }, [id, refreshTick]);

  return { reviews, averageRating, reviewCount, loading, error, refresh };
}
