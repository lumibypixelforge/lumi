'use client';

import React from 'react';

interface LumiLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LumiLogo({ className = '', size = 'md' }: LumiLogoProps) {
  const sizeClasses = {
    sm: 'text-lg tracking-wider',
    md: 'text-xl tracking-wider',
    lg: 'text-2xl tracking-widest',
  };

  return (
    <span
      className={`font-display font-extrabold text-ink select-none uppercase inline-flex items-center ${sizeClasses[size]} ${className}`}
      style={{ letterSpacing: '0.08em' }}
      aria-label="LUMI"
    >
      LUMI
    </span>
  );
}
