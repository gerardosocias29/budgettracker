import React from 'react';

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm
        placeholder:text-gray-400
        focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
        disabled:opacity-50 disabled:bg-gray-100
        ${className}`}
      {...props}
    />
  );
}
