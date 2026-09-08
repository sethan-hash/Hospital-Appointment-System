import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Icon } from '../common/Icon';
import { formatRating } from '../../utils/formatters';

/**
 * Doctor Card Component
 * Directly replicates Stitch doctor cards with image, rating badge, department, location, and action buttons.
 */
export function DoctorCard({ doctor, onBookClick }) {
  if (!doctor) return null;

  return (
    <Card className="p-md flex flex-col justify-between hover:-translate-y-1 transition-transform duration-200">
      <div>
        <div className="flex items-start gap-md mb-4">
          {/* Doctor Avatar */}
          <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/20">
            <img
              src={doctor.image}
              alt={doctor.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Doctor Info */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-1">
              <div className="min-w-0">
                <h3 className="font-headline-sm text-headline-sm text-on-surface truncate font-semibold">
                  {doctor.name}
                </h3>
                <p className="font-body-sm text-body-sm text-primary mb-1 truncate">
                  {doctor.title}
                </p>
              </div>

              {/* Rating Badge */}
              <div className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded flex-shrink-0">
                <Icon
                  name="star"
                  filled={true}
                  className="text-[16px] text-[#F59E0B]"
                />
                <span className="font-label-md text-label-md font-semibold text-on-surface">
                  {formatRating(doctor.rating)}
                </span>
              </div>
            </div>

            {/* Location */}
            <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-2">
              <Icon name="location_on" className="text-[16px] flex-shrink-0" />
              <span className="truncate">{doctor.location}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className="mt-auto pt-4 border-t border-outline-variant/20 flex gap-sm">
        <Link
          to={`/patient/book/${doctor.id}`}
          className="flex-1"
          onClick={onBookClick}
        >
          <Button variant="primary" size="md" fullWidth>
            Book Now
          </Button>
        </Link>

        <Link
          to={`/patient/doctors/${doctor.id}`}
          aria-label={`View ${doctor.name} profile`}
        >
          <Button variant="secondary" size="md" className="px-4">
            <Icon name="person" className="text-xl" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
