import React from 'react';

const variants = {
  default: 'bg-indigo-500 text-white hover:bg-indigo-600',
  outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
  ghost: 'text-gray-700 hover:bg-gray-100',
  destructive: 'bg-red-500 text-white hover:bg-red-600',
};

const sizes = {
  default: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1.5 text-xs',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  className = '',
  variant = 'default',
  size = 'default',
  disabled = false,
  children,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors
        focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2
        disabled:opacity-50 disabled:pointer-events-none
        ${variants[variant] || variants.default}
        ${sizes[size] || sizes.default}
        ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
