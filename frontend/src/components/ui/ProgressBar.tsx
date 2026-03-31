'use client';

import React from 'react';
import clsx from 'clsx';

type ProgressBarSize = 'sm' | 'md';
type ProgressBarColor = 'blue' | 'green' | 'violet';

interface ProgressBarProps {
  value: number;
  size?: ProgressBarSize;
  color?: ProgressBarColor;
  className?: string;
}

const sizeStyles: Record<ProgressBarSize, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
};

const colorStyles: Record<ProgressBarColor, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  violet: 'bg-violet-500',
};

export default function ProgressBar({
  value,
  size = 'md',
  color = 'blue',
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      className={clsx(
        'w-full bg-slate-100 rounded-full overflow-hidden',
        sizeStyles[size],
        className
      )}
    >
      <div
        className={clsx(
          'rounded-full transition-all duration-500 ease-out',
          sizeStyles[size],
          colorStyles[color]
        )}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
