import React from 'react';
import { Icon } from './Icon';

const SIZE_CLASSES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
};

/**
 * RatingStars — renders a row of filled/half/empty star icons.
 *
 * @param {number}  rating    - Numeric rating (e.g. 4.9). Determines full / half stars.
 * @param {number}  [count=5] - Total number of stars displayed.
 * @param {'sm'|'md'|'lg'} [size='lg'] - Controls icon size.
 * @param {string}  [className=''] - Extra classes applied to the row wrapper.
 */
export function RatingStars({ rating, count = 5, size = 'lg', className = '' }) {
  const iconSize = SIZE_CLASSES[size] ?? SIZE_CLASSES.lg;

  return (
    <div className={`flex text-[#F59E0B] ${iconSize} ${className}`}>
      {Array.from({ length: count }, (_, i) => {
        const full = i < Math.floor(rating);
        const half = !full && i < Math.ceil(rating) && rating % 1 >= 0.25;
        return (
          <Icon
            key={i}
            name={full ? 'star' : half ? 'star_half' : 'star'}
            filled={full}
            className={iconSize}
          />
        );
      })}
    </div>
  );
}
