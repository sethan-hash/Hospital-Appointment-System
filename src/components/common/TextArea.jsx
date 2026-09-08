import React from 'react';

/**
 * Reusable TextArea Component
 */
export function TextArea({
  label,
  id,
  placeholder = '',
  value,
  onChange,
  rows = 3,
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

      <textarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={`
          w-full rounded-lg border bg-surface-container-lowest p-4 font-body-md text-on-surface
          ${error ? 'border-error ring-1 ring-error' : 'border-outline-variant'}
          focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors
          resize-none placeholder:text-outline-variant
        `}
        {...rest}
      />

      {error && <span className="text-xs text-error mt-0.5 ml-1">{error}</span>}
    </div>
  );
}
