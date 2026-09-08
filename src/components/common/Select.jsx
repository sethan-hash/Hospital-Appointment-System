import React from 'react';
import { Icon } from './Icon';

/**
 * Reusable Select Dropdown
 */
export function Select({
  label,
  id,
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  required = false,
  error,
  className = '',
  ...rest
}) {
  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="font-label-md text-label-md text-on-surface-variant font-medium ml-1"
        >
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <select
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          className={`
            w-full h-[52px] bg-surface-container-lowest text-on-surface font-body-md rounded-lg
            border ${error ? 'border-error ring-1 ring-error' : 'border-outline-variant'}
            focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors
            px-4 pr-10 appearance-none cursor-pointer
          `}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>

        <span className="absolute right-3.5 text-outline pointer-events-none flex items-center">
          <Icon name="expand_more" className="text-2xl" />
        </span>
      </div>

      {error && <span className="text-xs text-error mt-0.5 ml-1">{error}</span>}
    </div>
  );
}
