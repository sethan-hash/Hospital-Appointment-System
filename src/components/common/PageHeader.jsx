import React from 'react';

/**
 * Reusable Page Header Component
 * Standardized header layout for page titles, explanatory subtitles, and optional action buttons.
 *
 * @param {Object} props
 * @param {string|React.ReactNode} props.title - Main header title
 * @param {string|React.ReactNode} [props.subtitle] - Explanatory subtitle text
 * @param {React.ReactNode} [props.action] - Optional action button or element displayed on the right
 * @param {string} [props.className=''] - Optional additional container classes
 * @param {'h1'|'h2'|'h3'} [props.as='h1'] - Semantic heading tag level
 */
export function PageHeader({
  title,
  subtitle,
  action,
  className = '',
  as: Component = 'h1',
}) {
  return (
    <div className={`flex justify-between items-center gap-4 ${className}`}>
      <div>
        <Component className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface font-bold">
          {title}
        </Component>
        {subtitle ? (
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex-shrink-0">{action}</div> : null}
    </div>
  );
}
