import React, { useState } from 'react';
import { Icon } from './Icon';

/**
 * Reusable Form Input Component
 * Matches Stitch: 52px height, slate outline, primary focus ring, leading/trailing icons.
 */
export function Input({
  label,
  id,
  type = 'text',
  placeholder = '',
  value,
  onChange,
  iconLeading,
  iconTrailing,
  error,
  helperText,
  required = false,
  className = '',
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';
  const effectiveType = isPasswordField ? (showPassword ? 'text' : 'password') : type;

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
        {iconLeading && (
          <span className="absolute left-3.5 text-outline pointer-events-none flex items-center">
            <Icon name={iconLeading} className="text-xl" />
          </span>
        )}

        <input
          id={id}
          type={effectiveType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`
            w-full h-[52px] bg-surface-container-lowest text-on-surface font-body-md rounded-lg
            border ${error ? 'border-error ring-1 ring-error' : 'border-outline-variant'}
            focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors
            placeholder:text-outline-variant
            ${iconLeading ? 'pl-11' : 'pl-4'}
            ${isPasswordField || iconTrailing ? 'pr-11' : 'pr-4'}
          `}
          {...rest}
        />

        {isPasswordField ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 text-outline hover:text-on-surface p-1 transition-colors focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-xl" />
          </button>
        ) : iconTrailing ? (
          <span className="absolute right-3 text-outline pointer-events-none flex items-center">
            <Icon name={iconTrailing} className="text-xl" />
          </span>
        ) : null}
      </div>

      {error ? (
        <span className="text-xs text-error mt-0.5 ml-1">{error}</span>
      ) : helperText ? (
        <span className="text-xs text-on-surface-variant mt-0.5 ml-1">{helperText}</span>
      ) : null}
    </div>
  );
}
